import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CATEGORIAS,
  ESTADOS_LOTE,
  TALLAS_FITTED,
  esLinkYupooValido,
  formatearMXN,
  normalizarLinkYupoo,
  type Categoria,
  type EstadoLote,
} from '@jm-caps/db'
import {
  agregarUnidades,
  buscarModeloPorLink,
  cargarLotes,
  crearModelo,
  llaves,
  subirFoto,
  type Modelo,
} from '../lib/consultas'
import { Aviso, Campo, EncabezadoPagina, MensajeError } from '../components/ui'

type Paso =
  | { tipo: 'buscar' }
  | { tipo: 'modelo_nuevo'; link: string }
  | { tipo: 'modelo_existente'; modelo: Modelo }

/** Lo que le pasa a las piezas según el estado del lote al que se asocian. */
function destinoSegunLote(estado: EstadoLote | null): string {
  if (estado === null) return 'Entran directo a stock disponible.'
  if (estado === 'recibido') return 'El lote ya está recibido: las piezas entran directo a stock.'
  return 'Quedan como pedidas y entran a stock cuando marques el lote como recibido.'
}

export function RegistrarProductos() {
  const [link, setLink] = useState('')
  const [loteId, setLoteId] = useState('')
  const [paso, setPaso] = useState<Paso>({ tipo: 'buscar' })
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

  const lotes = useQuery({ queryKey: llaves.lotes, queryFn: cargarLotes })

  // Preselecciona el lote abierto más reciente: casi siempre se captura
  // seguido, varias piezas del mismo pedido, una tras otra.
  useEffect(() => {
    if (loteId || !lotes.data) return
    const abierto = lotes.data.find((lote) => lote.estado !== 'recibido')
    if (abierto) setLoteId(abierto.id)
  }, [lotes.data, loteId])

  const loteSeleccionado = (lotes.data ?? []).find((lote) => lote.id === loteId) ?? null

  const busqueda = useMutation({
    mutationFn: (valor: string) => buscarModeloPorLink(valor),
    onSuccess: (modelo, valor) => {
      setConfirmacion(null)
      setPaso(modelo ? { tipo: 'modelo_existente', modelo } : { tipo: 'modelo_nuevo', link: valor })
    },
  })

  function buscar(evento: FormEvent) {
    evento.preventDefault()
    if (!link.trim()) return
    busqueda.mutate(link)
  }

  function reiniciar(mensaje: string) {
    setConfirmacion(mensaje)
    setPaso({ tipo: 'buscar' })
    setLink('')
    busqueda.reset()
  }

  const linkValido = esLinkYupooValido(link)

  return (
    <>
      <EncabezadoPagina
        titulo="Registrar productos"
        descripcion="Captura las gorras desde que haces el pedido, con el álbum del proveedor abierto enfrente. Entran a stock hasta que marques el lote como recibido, así sabes qué viene en camino sin arriesgar vender lo que aún no tienes."
      />

      {confirmacion ? <Aviso tipo="exito">{confirmacion}</Aviso> : null}

      <div className="tarjeta">
        <Campo
          etiqueta="Lote de este pedido"
          ayuda={destinoSegunLote(loteSeleccionado?.estado ?? null)}
        >
          <select value={loteId} onChange={(evento) => setLoteId(evento.target.value)}>
            <option value="">Sin lote (stock inmediato)</option>
            {(lotes.data ?? []).map((lote) => (
              <option key={lote.id} value={lote.id}>
                Pedido del {lote.fecha_pedido} · {ESTADOS_LOTE[lote.estado]} · {lote.unidades} piezas
              </option>
            ))}
          </select>
        </Campo>

        {(lotes.data ?? []).length === 0 ? (
          <Aviso>
            Todavía no hay lotes. <Link to="/lotes">Registra primero el pedido</Link> para poder
            seguir su costo y su llegada.
          </Aviso>
        ) : null}
      </div>

      <div className="tarjeta">
        <form onSubmit={buscar}>
          <Campo
            etiqueta="Link de Yupoo de la pieza"
            ayuda="Pega el link del álbum tal cual viene del proveedor. No se busca por nombre ni color a propósito: dos gorras distintas pueden llamarse igual, y el link es lo único que identifica de cuál se trata."
          >
            <input
              type="text"
              value={link}
              onChange={(evento) => setLink(evento.target.value)}
              placeholder="https://worldcaps.x.yupoo.com/albums/000000000"
              autoFocus
            />
          </Campo>

          {link.trim() && !linkValido ? (
            <Aviso>Ese texto no parece un link de Yupoo. Revisa que esté completo.</Aviso>
          ) : null}

          <button type="submit" className="principal" disabled={busqueda.isPending || !link.trim()}>
            {busqueda.isPending ? 'Buscando' : 'Buscar modelo'}
          </button>
        </form>

        <MensajeError error={busqueda.error} />
      </div>

      {paso.tipo === 'modelo_existente' ? (
        <ModeloEncontrado modelo={paso.modelo} loteId={loteId} alTerminar={reiniciar} />
      ) : null}

      {paso.tipo === 'modelo_nuevo' ? (
        <ModeloNuevo link={paso.link} loteId={loteId} alTerminar={reiniciar} />
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------

function ModeloEncontrado({
  modelo,
  loteId,
  alTerminar,
}: {
  modelo: Modelo
  loteId: string
  alTerminar: (mensaje: string) => void
}) {
  return (
    <div className="tarjeta">
      <Aviso tipo="exito">
        Este link ya está registrado. No hay que volver a capturar características: las piezas se
        suman al mismo producto.
      </Aviso>

      <div className="fila" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
        {modelo.foto_url ? <img className="miniatura" src={modelo.foto_url} alt="" /> : null}
        <div>
          <h2>{modelo.nombre}</h2>
          <div className="tenue" style={{ fontSize: '0.86rem' }}>
            <span className="mono">{modelo.codigo}</span>
            {modelo.equipo ? ` · ${modelo.equipo}` : ''}
            {modelo.color ? ` · ${modelo.color}` : ''} · {CATEGORIAS[modelo.categoria].etiqueta} ·{' '}
            {formatearMXN(modelo.precio_venta_mxn)}
          </div>
          <Link to={`/modelo/${modelo.id}`} className="tenue" style={{ fontSize: '0.86rem' }}>
            Ver ficha completa
          </Link>
        </div>
      </div>

      <FormularioUnidades modelo={modelo} loteId={loteId} alTerminar={alTerminar} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function ModeloNuevo({
  link,
  loteId,
  alTerminar,
}: {
  link: string
  loteId: string
  alTerminar: (mensaje: string) => void
}) {
  const [categoria, setCategoria] = useState<Categoria>('AA')
  const [nombre, setNombre] = useState('')
  const [equipo, setEquipo] = useState('')
  const [color, setColor] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState(String(CATEGORIAS.AA.precioSugerido))
  const [archivo, setArchivo] = useState<File | null>(null)
  const [modeloCreado, setModeloCreado] = useState<Modelo | null>(null)

  const alta = useMutation({
    mutationFn: async () => {
      const foto = archivo ? await subirFoto(archivo, 'modelos') : null
      return crearModelo({
        categoria,
        nombre: nombre.trim(),
        color: color.trim() || null,
        equipo: equipo.trim() || null,
        descripcion: descripcion.trim() || null,
        precio_venta_mxn: Number(precio),
        link_yupoo: link,
        foto_url: foto,
      })
    },
    onSuccess: (modelo) => setModeloCreado(modelo),
  })

  function cambiarCategoria(valor: Categoria) {
    setCategoria(valor)
    setPrecio(String(CATEGORIAS[valor].precioSugerido))
  }

  if (modeloCreado) {
    return (
      <div className="tarjeta">
        <Aviso tipo="exito">
          Producto dado de alta con código <span className="mono">{modeloCreado.codigo}</span>. Ahora
          indica cuántas piezas pediste y en qué talla.
        </Aviso>
        <FormularioUnidades modelo={modeloCreado} loteId={loteId} alTerminar={alTerminar} />
      </div>
    )
  }

  return (
    <div className="tarjeta">
      <Aviso>
        Este link no está registrado. Se da de alta como producto nuevo; lo que captures aquí es lo
        que verá y filtrará el cliente.
      </Aviso>

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          alta.mutate()
        }}
      >
        <Campo etiqueta="Link de Yupoo (identificador permanente)">
          <input type="text" value={normalizarLinkYupoo(link)} readOnly className="mono" />
        </Campo>

        <div className="rejilla">
          <Campo etiqueta="Tipo de gorra">
            <select
              value={categoria}
              onChange={(evento) => cambiarCategoria(evento.target.value as Categoria)}
            >
              {Object.values(CATEGORIAS).map((info) => (
                <option key={info.codigo} value={info.codigo}>
                  {info.etiqueta}
                  {info.pausada ? ' (pausada)' : ''}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Nombre del modelo" ayuda="Como lo verá el cliente. Ejemplo: Yankees clásica">
            <input
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              required
            />
          </Campo>

          <Campo etiqueta="Equipo" ayuda="Déjalo vacío en diseños sin logo de equipo.">
            <input
              type="text"
              value={equipo}
              onChange={(evento) => setEquipo(evento.target.value)}
              placeholder="Yankees"
            />
          </Campo>

          <Campo etiqueta="Color">
            <input
              type="text"
              value={color}
              onChange={(evento) => setColor(evento.target.value)}
              placeholder="Negro"
            />
          </Campo>

          <Campo etiqueta="Precio de venta (MXN)">
            <input
              type="number"
              min="1"
              step="1"
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
              required
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Descripción breve"
          ayuda="Una o dos líneas: material, detalle del bordado, para qué combina."
        >
          <textarea
            rows={2}
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
          />
        </Campo>

        <Campo
          etiqueta="Foto del modelo"
          ayuda="Puedes usar la del proveedor por ahora y reemplazarla con la foto real cuando tengas la pieza en mano."
        >
          <input
            type="file"
            accept="image/*"
            onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
          />
        </Campo>

        <MensajeError error={alta.error} />

        <button type="submit" className="principal" disabled={alta.isPending}>
          {alta.isPending ? 'Guardando' : 'Dar de alta el producto'}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FormularioUnidades({
  modelo,
  loteId,
  alTerminar,
}: {
  modelo: Modelo
  loteId: string
  alTerminar: (mensaje: string) => void
}) {
  const clienteQuery = useQueryClient()
  const info = CATEGORIAS[modelo.categoria]

  const [ajustable, setAjustable] = useState(!info.usaTalla)
  const [talla, setTalla] = useState<string>(info.usaTalla ? '7 1/4' : '')
  const [cantidad, setCantidad] = useState('1')
  const [costo, setCosto] = useState('')

  const alta = useMutation({
    mutationFn: () =>
      agregarUnidades({
        modelo_id: modelo.id,
        cantidad: Number(cantidad),
        talla: ajustable ? null : talla,
        lote_id: loteId || null,
        costo_unitario_mxn: costo ? Number(costo) : null,
      }),
    onSuccess: (ids) => {
      void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
      void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
      void clienteQuery.invalidateQueries({ queryKey: llaves.unidadesDeModelo(modelo.id) })
      const descripcion = ajustable ? 'ajustable' : `talla ${talla}`
      alTerminar(
        `Se registraron ${ids.length} pieza(s) de ${modelo.nombre} (${descripcion}). Pega el siguiente link para continuar con el pedido.`,
      )
    },
  })

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        alta.mutate()
      }}
    >
      <h3 style={{ marginBottom: 10 }}>Piezas de este pedido</h3>

      <div className="rejilla">
        <Campo etiqueta="Talla" ayuda={info.usaTalla ? undefined : 'Esta categoría es ajustable.'}>
          <select
            value={ajustable ? 'ajustable' : talla}
            onChange={(evento) => {
              const valor = evento.target.value
              if (valor === 'ajustable') {
                setAjustable(true)
              } else {
                setAjustable(false)
                setTalla(valor)
              }
            }}
          >
            <option value="ajustable">Ajustable (sin talla)</option>
            {TALLAS_FITTED.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Cantidad" ayuda="Una fila por gorra física, cada una con su propio código.">
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
          etiqueta="Costo por pieza (MXN)"
          ayuda="Opcional. Al recibir el lote se puede calcular el costo real y repartirlo entre todas las piezas."
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={costo}
            onChange={(evento) => setCosto(evento.target.value)}
            placeholder="157.50"
          />
        </Campo>
      </div>

      <MensajeError error={alta.error} />

      <button type="submit" className="principal" disabled={alta.isPending}>
        {alta.isPending ? 'Registrando' : `Registrar ${cantidad || '0'} pieza(s)`}
      </button>
    </form>
  )
}
