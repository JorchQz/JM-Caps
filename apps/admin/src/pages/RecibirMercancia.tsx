import { useState, type FormEvent } from 'react'
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

export function RecibirMercancia() {
  const [link, setLink] = useState('')
  const [paso, setPaso] = useState<Paso>({ tipo: 'buscar' })
  const [confirmacion, setConfirmacion] = useState<string | null>(null)

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
        titulo="Recibir mercancía"
        descripcion="Todo empieza por el link exacto del álbum de Yupoo. Ese link es la llave del modelo: si ya existe, las piezas nuevas se suman a ese mismo producto en vez de crear un duplicado."
      />

      {confirmacion ? <Aviso tipo="exito">{confirmacion}</Aviso> : null}

      <div className="tarjeta">
        <form onSubmit={buscar}>
          <Campo
            etiqueta="Link de Yupoo de la pieza"
            ayuda="Pega el link del álbum tal cual viene del proveedor. No se busca por nombre ni color a propósito: dos gorras distintas pueden llamarse igual."
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
        <ModeloEncontrado modelo={paso.modelo} alTerminar={reiniciar} />
      ) : null}

      {paso.tipo === 'modelo_nuevo' ? (
        <ModeloNuevo link={paso.link} alTerminar={reiniciar} />
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------

function ModeloEncontrado({
  modelo,
  alTerminar,
}: {
  modelo: Modelo
  alTerminar: (mensaje: string) => void
}) {
  return (
    <div className="tarjeta">
      <Aviso tipo="exito">
        Este link ya está dado de alta. Las piezas se agregan al modelo existente.
      </Aviso>

      <div className="fila" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
        {modelo.foto_url ? <img className="miniatura" src={modelo.foto_url} alt="" /> : null}
        <div>
          <h2>{modelo.nombre}</h2>
          <div className="tenue" style={{ fontSize: '0.86rem' }}>
            <span className="mono">{modelo.codigo}</span>
            {modelo.color ? ` · ${modelo.color}` : ''} · {CATEGORIAS[modelo.categoria].etiqueta} ·{' '}
            {formatearMXN(modelo.precio_venta_mxn)}
          </div>
          <Link to={`/modelo/${modelo.id}`} className="tenue" style={{ fontSize: '0.86rem' }}>
            Ver ficha completa
          </Link>
        </div>
      </div>

      <FormularioUnidades modelo={modelo} alTerminar={alTerminar} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function ModeloNuevo({ link, alTerminar }: { link: string; alTerminar: (mensaje: string) => void }) {
  const [categoria, setCategoria] = useState<Categoria>('AA')
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('')
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
          Modelo dado de alta con código <span className="mono">{modeloCreado.codigo}</span>. Ahora
          registra las piezas físicas que llegaron.
        </Aviso>
        <FormularioUnidades modelo={modeloCreado} alTerminar={alTerminar} />
      </div>
    )
  }

  return (
    <div className="tarjeta">
      <Aviso>Este link no está registrado. Se dará de alta como modelo nuevo.</Aviso>

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
          <Campo etiqueta="Categoría">
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

          <Campo etiqueta="Nombre" ayuda="Como lo verá el cliente. Ejemplo: Yankees clásica">
            <input
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              required
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
          etiqueta="Foto del modelo"
          ayuda="Opcional ahora. Se recomienda subir después la foto real de la pieza, no la del proveedor."
        >
          <input
            type="file"
            accept="image/*"
            onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
          />
        </Campo>

        <MensajeError error={alta.error} />

        <button type="submit" className="principal" disabled={alta.isPending}>
          {alta.isPending ? 'Guardando' : 'Dar de alta el modelo'}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FormularioUnidades({
  modelo,
  alTerminar,
}: {
  modelo: Modelo
  alTerminar: (mensaje: string) => void
}) {
  const clienteQuery = useQueryClient()
  const info = CATEGORIAS[modelo.categoria]

  const [ajustable, setAjustable] = useState(!info.usaTalla)
  const [talla, setTalla] = useState<string>(info.usaTalla ? '7 1/4' : '')
  const [cantidad, setCantidad] = useState('1')
  const [loteId, setLoteId] = useState('')
  const [costo, setCosto] = useState('')

  const lotes = useQuery({ queryKey: llaves.lotes, queryFn: cargarLotes })

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
      void clienteQuery.invalidateQueries({ queryKey: llaves.unidadesDeModelo(modelo.id) })
      const descripcion = ajustable ? 'ajustable' : `talla ${talla}`
      alTerminar(
        `Se registraron ${ids.length} pieza(s) de ${modelo.nombre} (${descripcion}). Imprime las etiquetas desde la ficha del modelo.`,
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
      <h3 style={{ marginBottom: 10 }}>Piezas que llegaron</h3>

      <div className="rejilla">
        <Campo etiqueta="Talla">
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

        <Campo etiqueta="Lote" ayuda="Opcional. Sirve para prorratear el costo real después.">
          <select value={loteId} onChange={(evento) => setLoteId(evento.target.value)}>
            <option value="">Sin lote</option>
            {(lotes.data ?? []).map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.fecha_pedido} · {ESTADOS_LOTE[lote.estado]} · {lote.unidades} piezas
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Costo por pieza (MXN)" ayuda="Opcional. Se puede calcular después desde el lote.">
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
