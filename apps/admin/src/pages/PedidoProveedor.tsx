import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ESTADOS_LINEA,
  ESTADOS_LOTE,
  MINIMO_PIEZAS_PEDIDO,
  esLinkYupooValido,
  type EstadoLineaPedido,
} from '@jm-caps/db'
import {
  actualizarLinea,
  agregarLinea,
  confirmarPedido,
  eliminarLinea,
  lineasDePedido,
  llaves,
  obtenerLote,
  type LineaConModelo,
  type ResultadoConfirmacion,
} from '../lib/consultas'
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
          {resultado.descartadas > 0 ? `, ${resultado.descartadas} descartado(s)` : ''}. Ahora
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
                  <th>Talla</th>
                  <th className="numero">Piezas</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {todas.map((linea) => (
                  <FilaLinea
                    key={linea.id}
                    linea={linea}
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

function FilaLinea({
  linea,
  editable,
  alCambiar,
}: {
  linea: LineaConModelo
  editable: boolean
  alCambiar: () => void
}) {
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

  const alta = useMutation({
    mutationFn: () =>
      agregarLinea({
        lote_id: loteId,
        link_yupoo: link,
        talla: talla?.trim() ? talla.trim() : null,
        cantidad: Number(cantidad),
        nota: nota.trim() || null,
      }),
    onSuccess: () => {
      setLink('')
      setNota('')
      setCantidad('1')
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
