import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CATEGORIAS,
  ESTADOS_LINEA,
  ESTADOS_LOTE,
  MINIMO_PIEZAS_PEDIDO,
  esLinkYupooValido,
  formatearMXN,
  type Categoria,
  type EstadoLineaPedido,
} from '@jm-caps/db'
import {
  actualizarLinea,
  actualizarLote,
  actualizarPrecioProveedor,
  agregarLinea,
  cargarPreciosProveedor,
  confirmarPedido,
  eliminarLinea,
  lineasDePedido,
  llaves,
  obtenerLote,
  type LineaConModelo,
  type ResultadoConfirmacion,
} from '../lib/consultas'
import { costearPedido, formatearUSD, type CosteoLinea, type CosteoPedido } from '../lib/costeoPedido'
import { descargarPdfPedido, textoPedido } from '../lib/pedidoProveedor'
import { SelectorTalla } from '../components/SelectorTalla'
import {
  Aviso,
  Campo,
  Cargando,
  EncabezadoPagina,
  MensajeError,
  Vacio,
} from '../components/ui'

/**
 * Armado del pedido al proveedor. Todavía no es inventario: aquí solo se junta
 * lo que se le va a pedir (link, talla y cantidad), se manda por WhatsApp, y el
 * proveedor contesta qué tiene. Hasta que confirma se vuelve un pedido real y
 * recién entonces se capturan los productos.
 */
export function PedidoProveedor() {
  const { id = '' } = useParams()
  const clienteQuery = useQueryClient()
  const [copiado, setCopiado] = useState(false)
  const [resultado, setResultado] = useState<ResultadoConfirmacion | null>(null)

  const lote = useQuery({ queryKey: llaves.lote(id), queryFn: () => obtenerLote(id) })
  const lineas = useQuery({
    queryKey: llaves.lineasDePedido(id),
    queryFn: () => lineasDePedido(id),
  })
  const precios = useQuery({
    queryKey: llaves.preciosProveedor,
    queryFn: cargarPreciosProveedor,
  })

  function refrescar() {
    void clienteQuery.invalidateQueries({ queryKey: llaves.lineasDePedido(id) })
  }

  const pdf = useMutation({ mutationFn: descargarPdfPedido })

  const confirmacion = useMutation({
    mutationFn: () => confirmarPedido(id),
    onSuccess: (datos) => {
      setResultado(datos)
      void clienteQuery.invalidateQueries({ queryKey: llaves.lote(id) })
      void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
      refrescar()
    },
  })

  if (lote.isLoading || lineas.isLoading) return <Cargando />
  if (lote.error) return <MensajeError error={lote.error} />
  if (!lote.data) return <Vacio>Ese pedido no existe.</Vacio>

  const esBorrador = lote.data.estado === 'borrador'
  const todas = lineas.data ?? []
  const vigentes = todas.filter((linea) => linea.estado !== 'no_disponible')
  const piezas = vigentes.reduce((suma, linea) => suma + linea.cantidad, 0)
  const faltanParaMinimo = Math.max(0, MINIMO_PIEZAS_PEDIDO - piezas)

  const listaPrecios = precios.data ?? []
  // El costeo del pedido solo cuenta lo vigente; la tabla necesita todas las
  // líneas para poder mostrar también las descartadas.
  const costeo = costearPedido(vigentes, listaPrecios, lote.data.tipo_cambio_dia)
  const costeoTodas = costearPedido(todas, listaPrecios, lote.data.tipo_cambio_dia)

  const datosPedido = {
    fecha: lote.data.fecha_pedido,
    lineas: vigentes,
    notas: lote.data.notas,
  }

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(textoPedido(datosPedido))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo={`Pedido del ${lote.data.fecha_pedido}`}
        descripcion="Junta aquí lo que le vas a pedir al proveedor. Mándaselo por WhatsApp, ajusta lo que no tenga disponible y confirma. Los productos se capturan hasta que el pedido está confirmado."
        acciones={
          <Link to="/lotes">
            <button type="button">Volver a lotes</button>
          </Link>
        }
      />

      {resultado ? (
        <Aviso tipo="exito">
          Pedido confirmado: {resultado.confirmadas} artículo(s), {resultado.piezas} pieza(s)
          {resultado.descartadas > 0 ? `, ${resultado.descartadas} descartado(s)` : ''}
          {resultado.total_usd > 0 ? `, ${formatearUSD(resultado.total_usd)} en total` : ''}. Ahora
          captura los productos desde <Link to="/productos">Registrar productos</Link>.
        </Aviso>
      ) : null}

      {!esBorrador && !resultado ? (
        <Aviso>
          Este pedido ya está confirmado ({ESTADOS_LOTE[lote.data.estado]}). Se muestra como
          referencia; para cambiarlo hay que hablarlo con el proveedor.
        </Aviso>
      ) : null}

      <div className="tarjeta">
        <div className="fila-separada">
          <div>
            <span className="insignia acento">{ESTADOS_LOTE[lote.data.estado]}</span>
            <span className="numero" style={{ marginLeft: 12, fontSize: '1.1rem', fontWeight: 600 }}>
              {piezas} pieza(s)
            </span>
            <span className="tenue" style={{ marginLeft: 8 }}>
              en {vigentes.length} artículo(s)
            </span>
          </div>

          <div className="fila">
            <button
              type="button"
              disabled={vigentes.length === 0 || pdf.isPending}
              onClick={() => pdf.mutate(datosPedido)}
            >
              {pdf.isPending ? 'Generando PDF' : 'Descargar PDF'}
            </button>
            <button
              type="button"
              disabled={vigentes.length === 0}
              onClick={() => void copiarTexto()}
            >
              {copiado ? 'Texto copiado' : 'Copiar texto'}
            </button>
          </div>
        </div>

        <MensajeError error={pdf.error} />

        {faltanParaMinimo > 0 ? (
          <Aviso>
            El proveedor pide mínimo {MINIMO_PIEZAS_PEDIDO} piezas por pedido. Faltan{' '}
            {faltanParaMinimo}.
          </Aviso>
        ) : null}
      </div>

      <CosteoDelPedido
        costeo={costeo}
        tipoCambio={lote.data.tipo_cambio_dia}
        loteId={id}
        editable={esBorrador}
        alCambiar={() => {
          void clienteQuery.invalidateQueries({ queryKey: llaves.lote(id) })
          void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
        }}
      />

      {esBorrador ? <NuevaLinea loteId={id} alAgregar={refrescar} /> : null}

      <div className="tarjeta">
        <h2 style={{ marginBottom: 12 }}>Artículos del pedido ({todas.length})</h2>

        {todas.length === 0 ? (
          <Vacio>Todavía no has agregado artículos. Pega el primer link de Yupoo arriba.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Tipo</th>
                  <th>Talla</th>
                  <th className="numero">Piezas</th>
                  <th className="numero">Costo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {costeoTodas.lineas.map((fila) => (
                  <FilaLinea
                    key={fila.linea.id}
                    costeo={fila}
                    editable={esBorrador}
                    alCambiar={refrescar}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {esBorrador ? (
        <div className="tarjeta">
          <h2 style={{ marginBottom: 4 }}>Confirmar con el proveedor</h2>
          <p className="tenue" style={{ marginTop: 0, fontSize: '0.9rem' }}>
            Cuando el proveedor te diga qué tiene, marca como no disponible lo que no haya y
            confirma. El pedido pasa a estado Pedido y ya puedes capturar cada producto.
          </p>

          <MensajeError error={confirmacion.error} />

          <button
            type="button"
            className="principal"
            disabled={confirmacion.isPending || vigentes.length === 0}
            onClick={() => confirmacion.mutate()}
          >
            {confirmacion.isPending
              ? 'Confirmando'
              : `Confirmar pedido de ${piezas} pieza(s)`}
          </button>
        </div>
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------

/**
 * Cuánto va a costar el pedido. Siempre es aproximado: el proveedor cobra en
 * dólares y el costo real en pesos depende del tipo de cambio del día en que se
 * paga, no del de hoy.
 */
function CosteoDelPedido({
  costeo,
  tipoCambio,
  loteId,
  editable,
  alCambiar,
}: {
  costeo: CosteoPedido
  tipoCambio: number | null
  loteId: string
  editable: boolean
  alCambiar: () => void
}) {
  const [valor, setValor] = useState(tipoCambio ? String(tipoCambio) : '')
  const [abrirPrecios, setAbrirPrecios] = useState(false)

  const guardarCambio = useMutation({
    mutationFn: (nuevo: number | null) => actualizarLote(loteId, { tipo_cambio_dia: nuevo }),
    onSuccess: alCambiar,
  })

  return (
    <div className="tarjeta">
      <div className="fila-separada" style={{ marginBottom: 12 }}>
        <h2>Cuánto llevas gastado</h2>
        <button type="button" className="discreto" onClick={() => setAbrirPrecios(!abrirPrecios)}>
          {abrirPrecios ? 'Ocultar precios del proveedor' : 'Precios del proveedor'}
        </button>
      </div>

      {abrirPrecios ? <PreciosProveedor /> : null}

      <div className="rejilla">
        <Indicador titulo="Total en dólares" valor={formatearUSD(costeo.totalUsd)} />
        <Indicador
          titulo="Aproximado en pesos"
          valor={costeo.totalMxn === null ? '-' : formatearMXN(costeo.totalMxn)}
          nota={costeo.totalMxn === null ? 'Falta el tipo de cambio' : 'Al tipo de cambio de abajo'}
        />
        <Indicador
          titulo="Costo por pieza"
          valor={costeo.costoPorPiezaMxn === null ? '-' : formatearMXN(costeo.costoPorPiezaMxn)}
          nota="Sin contar envío ni impuestos"
        />
        <Indicador
          titulo="Si lo vendes todo"
          valor={formatearMXN(costeo.ventaEstimadaMxn)}
          nota={
            costeo.margenMxn === null
              ? 'A precio de lista'
              : `Ganancia estimada ${formatearMXN(costeo.margenMxn)}`
          }
        />
      </div>

      <Campo
        etiqueta="Tipo de cambio del día (MXN por dólar)"
        ayuda="El costo en pesos es un estimado hasta que pagues: el tipo de cambio que cuenta es el del día del pago."
      >
        <input
          type="number"
          min="0"
          step="0.0001"
          value={valor}
          placeholder="18.50"
          disabled={!editable}
          onChange={(evento) => setValor(evento.target.value)}
          onBlur={() => {
            const numero = valor ? Number(valor) : null
            if (numero !== tipoCambio) guardarCambio.mutate(numero)
          }}
        />
      </Campo>

      <MensajeError error={guardarCambio.error} />

      {costeo.piezasSinPrecio > 0 ? (
        <Aviso>
          {costeo.piezasSinPrecio} pieza(s) no entran en el total porque falta el precio de{' '}
          {costeo.categoriasSinPrecio.join(', ')}. En cuanto el proveedor te pase esos precios,
          captúralos arriba y el total se recalcula solo.
        </Aviso>
      ) : null}

      {costeo.totalUsd > 0 ? (
        <p className="tenue" style={{ fontSize: '0.86rem', marginBottom: 0 }}>
          El envío y el impuesto de importación no están aquí: esos se conocen cuando llega el
          lote y se reparten entre las piezas desde la pantalla de Lotes.
        </p>
      ) : null}
    </div>
  )
}

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <div className="tenue" style={{ fontSize: '0.82rem' }}>
        {titulo}
      </div>
      <div className="numero" style={{ fontSize: '1.35rem', fontWeight: 600, marginTop: 2 }}>
        {valor}
      </div>
      {nota ? (
        <div className="tenue" style={{ fontSize: '0.78rem' }}>
          {nota}
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Editor de los precios de compra. El proveedor los cambia cada tanto. */
function PreciosProveedor() {
  const clienteQuery = useQueryClient()
  const precios = useQuery({ queryKey: llaves.preciosProveedor, queryFn: cargarPreciosProveedor })

  const guardar = useMutation({
    mutationFn: ({ categoria, precio }: { categoria: Categoria; precio: number | null }) =>
      actualizarPrecioProveedor(categoria, precio),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: llaves.preciosProveedor })
    },
  })

  return (
    <div style={{ marginBottom: 18 }}>
      <p className="tenue" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        Lo que te cuesta cada tipo de gorra, en dólares. Cuando el proveedor suba o baje precios,
        cámbialos aquí y todos los pedidos en borrador se recalculan.
      </p>

      <MensajeError error={guardar.error} />

      <div className="tabla-contenedor">
        <table>
          <tbody>
            {Object.values(CATEGORIAS).map((info) => {
              const actual =
                (precios.data ?? []).find((precio) => precio.categoria === info.codigo) ?? null
              return (
                <tr key={info.codigo}>
                  <td>
                    <strong>{info.codigo}</strong>
                    <div className="tenue" style={{ fontSize: '0.8rem' }}>
                      {info.etiqueta}
                    </div>
                  </td>
                  <td className="numero" style={{ width: 160 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={actual?.precio_usd ?? ''}
                      placeholder="USD"
                      onBlur={(evento) => {
                        const texto = evento.target.value
                        const nuevo = texto ? Number(texto) : null
                        if (nuevo !== (actual?.precio_usd ?? null)) {
                          guardar.mutate({ categoria: info.codigo, precio: nuevo })
                        }
                      }}
                    />
                  </td>
                  <td className="tenue" style={{ fontSize: '0.8rem' }}>
                    {actual?.precio_usd == null ? 'Falta que te lo pase el proveedor' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FilaLinea({
  costeo,
  editable,
  alCambiar,
}: {
  costeo: CosteoLinea
  editable: boolean
  alCambiar: () => void
}) {
  const { linea } = costeo
  const [cantidad, setCantidad] = useState(String(linea.cantidad))

  const guardar = useMutation({
    mutationFn: (cambios: Partial<LineaConModelo>) => actualizarLinea(linea.id, cambios),
    onSuccess: alCambiar,
  })

  const borrar = useMutation({
    mutationFn: () => eliminarLinea(linea.id),
    onSuccess: alCambiar,
  })

  const descartada = linea.estado === 'no_disponible'

  return (
    <tr style={descartada ? { opacity: 0.55 } : undefined}>
      <td>
        {linea.modelo ? (
          <>
            <strong>{linea.modelo.nombre}</strong>
            <div className="tenue" style={{ fontSize: '0.83rem' }}>
              <span className="mono">{linea.modelo.codigo}</span>
              {linea.modelo.color ? ` · ${linea.modelo.color}` : ''} · ya está en el catálogo
            </div>
          </>
        ) : (
          <strong className="tenue">Diseño nuevo</strong>
        )}
        <div style={{ fontSize: '0.78rem' }}>
          <a href={linea.link_yupoo} target="_blank" rel="noreferrer" className="mono">
            {linea.link_yupoo}
          </a>
        </div>
        {linea.nota ? (
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {linea.nota}
          </div>
        ) : null}
      </td>
      <td>
        {editable ? (
          <select
            value={linea.categoria ?? ''}
            disabled={guardar.isPending}
            onChange={(evento) =>
              guardar.mutate({ categoria: (evento.target.value || null) as Categoria | null })
            }
          >
            <option value="">Sin definir</option>
            {Object.values(CATEGORIAS).map((info) => (
              <option key={info.codigo} value={info.codigo}>
                {info.codigo}
              </option>
            ))}
          </select>
        ) : (
          (linea.categoria ?? '-')
        )}
      </td>
      <td>{linea.talla ?? 'Ajustable'}</td>
      <td className="numero">
        {editable ? (
          <input
            type="number"
            min="1"
            max="200"
            value={cantidad}
            style={{ width: 80 }}
            onChange={(evento) => setCantidad(evento.target.value)}
            onBlur={() => {
              const valor = Number(cantidad)
              if (valor >= 1 && valor !== linea.cantidad) guardar.mutate({ cantidad: valor })
            }}
          />
        ) : (
          linea.cantidad
        )}
      </td>
      <td className="numero">
        {costeo.precioUsd === null ? (
          <span className="insignia apartada">Sin precio</span>
        ) : (
          <>
            {formatearUSD(costeo.subtotalUsd)}
            <div className="tenue" style={{ fontSize: '0.78rem' }}>
              {formatearUSD(costeo.precioUsd)} c/u
              {linea.precio_usd_unitario !== null ? ' especial' : ''}
            </div>
          </>
        )}
      </td>
      <td>
        {editable ? (
          <select
            value={linea.estado}
            disabled={guardar.isPending}
            onChange={(evento) =>
              guardar.mutate({ estado: evento.target.value as EstadoLineaPedido })
            }
          >
            <option value="solicitada">{ESTADOS_LINEA.solicitada}</option>
            <option value="no_disponible">{ESTADOS_LINEA.no_disponible}</option>
          </select>
        ) : (
          <span className={`insignia ${descartada ? '' : 'disponible'}`}>
            {ESTADOS_LINEA[linea.estado]}
          </span>
        )}
        {linea.unidades_creadas > 0 ? (
          <div className="tenue" style={{ fontSize: '0.78rem' }}>
            {linea.unidades_creadas} capturada(s)
          </div>
        ) : null}
      </td>
      <td style={{ textAlign: 'right' }}>
        {editable ? (
          <button
            type="button"
            className="discreto peligro"
            disabled={borrar.isPending}
            onClick={() => borrar.mutate()}
          >
            Quitar
          </button>
        ) : null}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------

function NuevaLinea({ loteId, alAgregar }: { loteId: string; alAgregar: () => void }) {
  const [link, setLink] = useState('')
  const [talla, setTalla] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [nota, setNota] = useState('')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [precio, setPrecio] = useState('')

  const alta = useMutation({
    mutationFn: () =>
      agregarLinea({
        lote_id: loteId,
        link_yupoo: link,
        talla: talla?.trim() ? talla.trim() : null,
        cantidad: Number(cantidad),
        categoria: categoria || null,
        precio_usd_unitario: precio ? Number(precio) : null,
        nota: nota.trim() || null,
      }),
    onSuccess: () => {
      setLink('')
      setNota('')
      setCantidad('1')
      setPrecio('')
      alAgregar()
    },
  })

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    alta.mutate()
  }

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 12 }}>Agregar artículo</h2>

      <form onSubmit={enviar}>
        <Campo
          etiqueta="Link de Yupoo"
          ayuda="Es lo único que el proveedor necesita para saber de qué gorra hablas. Si ya lo pediste antes, el panel lo reconoce solo."
        >
          <input
            type="text"
            value={link}
            onChange={(evento) => setLink(evento.target.value)}
            placeholder="https://worldcaps.x.yupoo.com/albums/000000000"
            autoFocus
          />
        </Campo>

        {link.trim() && !esLinkYupooValido(link) ? (
          <Aviso>Ese texto no parece un link de Yupoo. Revisa que esté completo.</Aviso>
        ) : null}

        <div className="rejilla">
          <Campo
            etiqueta="Tipo de gorra"
            ayuda="Define el precio de compra. Si el link ya está en el catálogo se toma solo del producto."
          >
            <select
              value={categoria}
              onChange={(evento) => setCategoria(evento.target.value as Categoria | '')}
            >
              <option value="">Tomar del catálogo si ya existe</option>
              {Object.values(CATEGORIAS).map((info) => (
                <option key={info.codigo} value={info.codigo}>
                  {info.etiqueta}
                  {info.pausada ? ' (pausada)' : ''}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Talla">
            <SelectorTalla valor={talla} alCambiar={setTalla} />
          </Campo>

          <Campo etiqueta="Piezas">
            <input
              type="number"
              min="1"
              max="200"
              value={cantidad}
              onChange={(evento) => setCantidad(evento.target.value)}
              required
            />
          </Campo>

          <Campo
            etiqueta="Precio especial (USD)"
            ayuda="Solo si el proveedor te cotizó distinto esta pieza. En blanco usa el de su tipo."
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
            />
          </Campo>

          <Campo etiqueta="Nota para el proveedor">
            <input
              type="text"
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
              placeholder="La del bordado blanco"
            />
          </Campo>
        </div>

        <MensajeError error={alta.error} />

        <button type="submit" className="principal" disabled={alta.isPending || !link.trim()}>
          {alta.isPending ? 'Agregando' : 'Agregar al pedido'}
        </button>
      </form>
    </div>
  )
}
