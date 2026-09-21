import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CATEGORIAS,
  formatearFecha,
  formatearMXN,
  tiempoRestante,
  type Categoria,
} from '@jm-caps/db'
import {
  actualizarModelo,
  actualizarUnidad,
  eliminarUnidad,
  llaves,
  obtenerModelo,
  subirFoto,
  unidadesDeModelo,
  type Unidad,
} from '../lib/consultas'
import {
  Aviso,
  Campo,
  Cargando,
  EncabezadoPagina,
  InsigniaEstado,
  MensajeError,
  Vacio,
} from '../components/ui'
import {
  EtiquetasQR,
  TAMANOS_ETIQUETA,
  type TamanoEtiqueta,
} from '../components/EtiquetasQR'

export function ModeloDetalle() {
  const { id = '' } = useParams()
  const clienteQuery = useQueryClient()
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [imprimiendo, setImprimiendo] = useState(false)
  const [tamano, setTamano] = useState<TamanoEtiqueta>('mediana')

  const modelo = useQuery({ queryKey: llaves.modelo(id), queryFn: () => obtenerModelo(id) })
  const unidades = useQuery({
    queryKey: llaves.unidadesDeModelo(id),
    queryFn: () => unidadesDeModelo(id),
  })

  const paraEtiquetas = useMemo(
    () => (unidades.data ?? []).filter((unidad) => seleccionadas.has(unidad.id)),
    [unidades.data, seleccionadas],
  )

  function alternar(unidadId: string) {
    setSeleccionadas((previo) => {
      const copia = new Set(previo)
      if (copia.has(unidadId)) copia.delete(unidadId)
      else copia.add(unidadId)
      return copia
    })
  }

  function refrescar() {
    void clienteQuery.invalidateQueries({ queryKey: llaves.unidadesDeModelo(id) })
    void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
  }

  if (modelo.isLoading) return <Cargando />
  if (modelo.error) return <MensajeError error={modelo.error} />
  if (!modelo.data) return <Vacio>Ese modelo no existe.</Vacio>

  const datos = modelo.data
  const lista = unidades.data ?? []

  if (imprimiendo) {
    return (
      <>
        <div className="no-imprimir" style={{ marginBottom: 16 }}>
          <div className="fila">
            <button type="button" className="principal" onClick={() => window.print()}>
              Imprimir
            </button>
            <select
              value={tamano}
              style={{ width: 'auto' }}
              onChange={(evento) => setTamano(evento.target.value as TamanoEtiqueta)}
            >
              {Object.entries(TAMANOS_ETIQUETA).map(([clave, info]) => (
                <option key={clave} value={clave}>
                  {info.etiqueta}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setImprimiendo(false)}>
              Volver
            </button>
            <span className="tenue">{paraEtiquetas.length} etiqueta(s)</span>
          </div>

          <p className="tenue" style={{ fontSize: '0.85rem', maxWidth: '62ch' }}>
            En el diálogo de impresión pon la escala en 100 por ciento, no en "ajustar a la
            página": si el navegador la reduce, el código se imprime más chico y cuesta más
            escanearlo. Las medidas de arriba son las reales sobre el papel.
          </p>
        </div>
        <EtiquetasQR modelo={datos} unidades={paraEtiquetas} tamano={tamano} />
      </>
    )
  }

  return (
    <>
      <EncabezadoPagina
        titulo={datos.nombre}
        descripcion={`${datos.codigo} · ${CATEGORIAS[datos.categoria].etiqueta}${
          datos.color ? ` · ${datos.color}` : ''
        }`}
        acciones={
          <>
            <Link to="/productos">
              <button type="button">Agregar piezas</button>
            </Link>
            <button
              type="button"
              className="principal"
              disabled={seleccionadas.size === 0}
              onClick={() => setImprimiendo(true)}
            >
              Etiquetas ({seleccionadas.size})
            </button>
          </>
        }
      />

      <div className="rejilla" style={{ alignItems: 'start' }}>
        <FichaModelo modelo={datos} alGuardar={() => void modelo.refetch()} />
        <FotoModelo modelo={datos} alGuardar={() => void modelo.refetch()} />
      </div>

      <div className="tarjeta">
        <div className="fila-separada" style={{ marginBottom: 12 }}>
          <h2>Piezas físicas ({lista.length})</h2>
          <div className="fila">
            <button
              type="button"
              className="discreto"
              onClick={() => setSeleccionadas(new Set(lista.map((unidad) => unidad.id)))}
            >
              Seleccionar todas
            </button>
            <button type="button" className="discreto" onClick={() => setSeleccionadas(new Set())}>
              Limpiar
            </button>
          </div>
        </div>

        {unidades.isLoading ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Vacio>Este modelo no tiene piezas registradas.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  <th>Folio</th>
                  <th>Talla</th>
                  <th>Estado</th>
                  <th>Apartado</th>
                  <th className="numero">Costo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((unidad) => (
                  <FilaUnidad
                    key={unidad.id}
                    unidad={unidad}
                    seleccionada={seleccionadas.has(unidad.id)}
                    alAlternar={() => alternar(unidad.id)}
                    alCambiar={refrescar}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------

function FilaUnidad({
  unidad,
  seleccionada,
  alAlternar,
  alCambiar,
}: {
  unidad: Unidad
  seleccionada: boolean
  alAlternar: () => void
  alCambiar: () => void
}) {
  const borrar = useMutation({
    mutationFn: () => eliminarUnidad(unidad.id),
    onSuccess: alCambiar,
  })

  const liberar = useMutation({
    mutationFn: () =>
      actualizarUnidad(unidad.id, {
        estado: 'disponible',
        apartado_hasta: null,
        apartado_nombre: null,
        apartado_telefono: null,
      }),
    onSuccess: alCambiar,
  })

  return (
    <tr>
      <td className="principal foto">
        <input type="checkbox" checked={seleccionada} onChange={alAlternar} />
      </td>
      <td className="mono principal">
        <strong>Folio {unidad.folio}</strong>
      </td>
      <td data-etiqueta="Talla">{unidad.talla ?? 'Ajustable'}</td>
      <td data-etiqueta="Estado">
        <InsigniaEstado estado={unidad.estado} />
      </td>
      <td className="tenue" data-etiqueta="Apartado" style={{ fontSize: '0.84rem' }}>
        {unidad.estado === 'apartada'
          ? `${unidad.apartado_nombre ?? 'Sin nombre'} · vence en ${tiempoRestante(unidad.apartado_hasta)}`
          : unidad.estado === 'vendida'
            ? formatearFecha(unidad.fecha_venta)
            : '-'}
      </td>
      <td className="numero" data-etiqueta="Costo">{formatearMXN(unidad.costo_unitario_mxn)}</td>
      <td className="acciones">
        <div className="fila" style={{ justifyContent: 'flex-end', gap: 4 }}>
          {unidad.estado === 'apartada' ? (
            <button
              type="button"
              className="discreto"
              disabled={liberar.isPending}
              onClick={() => liberar.mutate()}
            >
              Liberar
            </button>
          ) : null}
          {unidad.estado !== 'vendida' ? (
            <button
              type="button"
              className="discreto peligro"
              disabled={borrar.isPending}
              onClick={() => {
                if (confirm('Eliminar esta pieza del inventario. Esta acción no se puede deshacer.')) {
                  borrar.mutate()
                }
              }}
            >
              Eliminar
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------

function FichaModelo({
  modelo,
  alGuardar,
}: {
  modelo: {
    id: string
    nombre: string
    color: string | null
    equipo: string | null
    descripcion: string | null
    precio_venta_mxn: number
    categoria: Categoria
    activo: boolean
    link_yupoo: string
  }
  alGuardar: () => void
}) {
  const [nombre, setNombre] = useState(modelo.nombre)
  const [color, setColor] = useState(modelo.color ?? '')
  const [equipo, setEquipo] = useState(modelo.equipo ?? '')
  const [descripcion, setDescripcion] = useState(modelo.descripcion ?? '')
  const [precio, setPrecio] = useState(String(modelo.precio_venta_mxn))
  const [activo, setActivo] = useState(modelo.activo)

  const guardar = useMutation({
    mutationFn: () =>
      actualizarModelo(modelo.id, {
        nombre: nombre.trim(),
        color: color.trim() || null,
        equipo: equipo.trim() || null,
        descripcion: descripcion.trim() || null,
        precio_venta_mxn: Number(precio),
        activo,
      }),
    onSuccess: alGuardar,
  })

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 12 }}>Datos del modelo</h2>

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          guardar.mutate()
        }}
      >
        <Campo etiqueta="Nombre">
          <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
        </Campo>

        <Campo etiqueta="Equipo">
          <input value={equipo} onChange={(evento) => setEquipo(evento.target.value)} />
        </Campo>

        <Campo etiqueta="Color">
          <input value={color} onChange={(evento) => setColor(evento.target.value)} />
        </Campo>

        <Campo etiqueta="Descripción breve">
          <textarea
            rows={2}
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
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

        <label className="fila" style={{ marginBottom: 14, gap: 8 }}>
          <input
            type="checkbox"
            checked={activo}
            onChange={(evento) => setActivo(evento.target.checked)}
          />
          <span className="etiqueta-campo">Visible en la tienda pública</span>
        </label>

        <Campo etiqueta="Link de Yupoo" ayuda="Referencia interna de compra. Nunca se muestra al cliente.">
          <input className="mono" value={modelo.link_yupoo ?? ''} readOnly />
        </Campo>

        <MensajeError error={guardar.error} />
        {guardar.isSuccess ? <Aviso tipo="exito">Cambios guardados.</Aviso> : null}

        <button type="submit" className="principal" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FotoModelo({
  modelo,
  alGuardar,
}: {
  modelo: { id: string; foto_url: string | null; nombre: string }
  alGuardar: () => void
}) {
  const [archivo, setArchivo] = useState<File | null>(null)

  const subir = useMutation({
    mutationFn: async () => {
      if (!archivo) throw new Error('Elige una imagen primero')
      const url = await subirFoto(archivo, 'modelos')
      await actualizarModelo(modelo.id, { foto_url: url })
    },
    onSuccess: () => {
      setArchivo(null)
      alGuardar()
    },
  })

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 12 }}>Foto</h2>

      {modelo.foto_url ? (
        <img className="foto-modelo" src={modelo.foto_url} alt={modelo.nombre} />
      ) : (
        <p className="tenue">Sin foto todavía.</p>
      )}

      <Campo
        etiqueta="Reemplazar foto"
        ayuda="Usa la foto real de la pieza en mano. Las fotos del proveedor se ven distintas al producto que recibe el cliente."
      >
        <input
          type="file"
          accept="image/*"
          onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
        />
      </Campo>

      <MensajeError error={subir.error} />

      <button type="button" disabled={!archivo || subir.isPending} onClick={() => subir.mutate()}>
        {subir.isPending ? 'Subiendo' : 'Subir foto'}
      </button>
    </div>
  )
}
