import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ESTADOS_LOTE, formatearMXN } from '@jm-caps/db'
import {
  eliminarUnidad,
  llaves,
  obtenerLote,
  recibirLote,
  unidadesDeLote,
  type UnidadConModelo,
} from '../lib/consultas'
import {
  Aviso,
  Campo,
  Cargando,
  EncabezadoPagina,
  MensajeError,
  Vacio,
} from '../components/ui'

type Grupo = {
  clave: string
  modeloId: string
  nombre: string
  codigo: string
  talla: string | null
  precio: number
  pendientes: UnidadConModelo[]
  yaEnStock: number
}

const HOY = () => new Date().toISOString().slice(0, 10)

/**
 * Recepción de un lote. El proveedor no siempre manda lo que se pidió, así que
 * aquí se confirma cuántas piezas llegaron de cada modelo y talla. Lo que no
 * llegó se queda en estado pedido: es un reclamo abierto, no stock vendible.
 */
export function RecepcionLote() {
  const { id = '' } = useParams()
  const clienteQuery = useQueryClient()

  const [fecha, setFecha] = useState(HOY())
  const [recibidas, setRecibidas] = useState<Record<string, number>>({})
  const [resultado, setResultado] = useState<{ recibidas: number; faltantes: number } | null>(null)

  const lote = useQuery({ queryKey: llaves.lote(id), queryFn: () => obtenerLote(id) })
  const unidades = useQuery({
    queryKey: llaves.unidadesDeLote(id),
    queryFn: () => unidadesDeLote(id),
  })

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>()

    for (const unidad of unidades.data ?? []) {
      const clave = `${unidad.modelo_id}|${unidad.talla ?? ''}`
      const grupo: Grupo = mapa.get(clave) ?? {
        clave,
        modeloId: unidad.modelo_id,
        nombre: unidad.modelo.nombre,
        codigo: unidad.modelo.codigo,
        talla: unidad.talla,
        precio: unidad.modelo.precio_venta_mxn,
        pendientes: [],
        yaEnStock: 0,
      }

      if (unidad.estado === 'pedido' || unidad.estado === 'en_transito') grupo.pendientes.push(unidad)
      else grupo.yaEnStock += 1

      mapa.set(clave, grupo)
    }

    return [...mapa.values()].sort(
      (a, b) => a.nombre.localeCompare(b.nombre, 'es') || (a.talla ?? '').localeCompare(b.talla ?? '', 'es'),
    )
  }, [unidades.data])

  const pendientes = grupos.reduce((suma, grupo) => suma + grupo.pendientes.length, 0)

  function cantidadRecibida(grupo: Grupo): number {
    return recibidas[grupo.clave] ?? grupo.pendientes.length
  }

  const totalConfirmado = grupos.reduce((suma, grupo) => suma + cantidadRecibida(grupo), 0)
  const totalFaltante = pendientes - totalConfirmado

  const recepcion = useMutation({
    mutationFn: () => {
      // De cada grupo se confirman las primeras N piezas pendientes; las demás
      // se quedan como pedidas para reclamarlas al proveedor.
      const ids = grupos.flatMap((grupo) =>
        grupo.pendientes.slice(0, cantidadRecibida(grupo)).map((unidad) => unidad.id),
      )
      return recibirLote(id, fecha, ids)
    },
    onSuccess: (datos) => {
      setResultado(datos)
      void clienteQuery.invalidateQueries({ queryKey: llaves.unidadesDeLote(id) })
      void clienteQuery.invalidateQueries({ queryKey: llaves.lote(id) })
      void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
      void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
    },
  })

  if (lote.isLoading || unidades.isLoading) return <Cargando />
  if (lote.error) return <MensajeError error={lote.error} />
  if (!lote.data) return <Vacio>Ese lote no existe.</Vacio>

  return (
    <>
      <EncabezadoPagina
        titulo={`Recibir lote del ${lote.data.fecha_pedido}`}
        descripcion="Confirma cuántas piezas llegaron realmente de cada modelo y talla. Solo lo confirmado pasa a stock; lo que falte se queda como pedido para reclamarlo."
        acciones={
          <Link to="/lotes">
            <button type="button">Volver a lotes</button>
          </Link>
        }
      />

      {resultado ? (
        <Aviso tipo="exito">
          Lote recibido: {resultado.recibidas} pieza(s) entraron a stock
          {resultado.faltantes > 0
            ? `, ${resultado.faltantes} siguen pendientes de llegar.`
            : '. Llegó completo.'}
        </Aviso>
      ) : null}

      <div className="tarjeta">
        <div className="fila-separada">
          <div>
            <span className="insignia acento">{ESTADOS_LOTE[lote.data.estado]}</span>
            <span className="tenue" style={{ marginLeft: 10 }}>
              {pendientes} pieza(s) por confirmar
            </span>
          </div>
          <Campo etiqueta="Fecha de recepción">
            <input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
          </Campo>
        </div>
      </div>

      <div className="tarjeta">
        {grupos.length === 0 ? (
          <Vacio>
            Este lote no tiene piezas registradas. Captúralas desde{' '}
            <Link to="/productos">Registrar productos</Link>.
          </Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Talla</th>
                  <th className="numero">Pedidas</th>
                  <th className="numero">Llegaron</th>
                  <th className="numero">Faltan</th>
                  <th className="numero">Precio</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((grupo) => {
                  const esperadas = grupo.pendientes.length
                  const llegaron = cantidadRecibida(grupo)
                  return (
                    <tr key={grupo.clave}>
                      <td className="principal">
                        <Link to={`/modelo/${grupo.modeloId}`}>{grupo.nombre}</Link>
                        <div className="tenue" style={{ fontSize: '0.83rem' }}>
                          <span className="mono">{grupo.codigo}</span>
                          {grupo.yaEnStock > 0 ? ` · ${grupo.yaEnStock} ya en stock` : ''}
                        </div>
                      </td>
                      <td data-etiqueta="Talla">{grupo.talla ?? 'Ajustable'}</td>
                      <td className="numero" data-etiqueta="Pedidas">{esperadas}</td>
                      <td className="numero" data-etiqueta="Llegaron">
                        <input
                          type="number"
                          min="0"
                          max={esperadas}
                          value={llegaron}
                          disabled={esperadas === 0}
                          style={{ width: 80 }}
                          onChange={(evento) => {
                            const valor = Math.max(
                              0,
                              Math.min(esperadas, Number(evento.target.value) || 0),
                            )
                            setRecibidas((previo) => ({ ...previo, [grupo.clave]: valor }))
                          }}
                        />
                      </td>
                      <td className="numero" data-etiqueta="Faltan">{esperadas - llegaron}</td>
                      <td className="numero" data-etiqueta="Precio">{formatearMXN(grupo.precio)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalFaltante > 0 ? (
        <Aviso>
          {totalFaltante} pieza(s) quedarán como pendientes del proveedor. No entran al catálogo y
          puedes darlas de baja más abajo cuando resuelvas el reclamo.
        </Aviso>
      ) : null}

      <MensajeError error={recepcion.error} />

      <div className="tarjeta">
        <button
          type="button"
          className="principal"
          disabled={recepcion.isPending || pendientes === 0}
          onClick={() => recepcion.mutate()}
        >
          {recepcion.isPending
            ? 'Recibiendo'
            : `Confirmar recepción de ${totalConfirmado} pieza(s)`}
        </button>
      </div>

      <PiezasPendientes unidades={(unidades.data ?? []).filter((u) => u.estado === 'pedido' || u.estado === 'en_transito')} loteId={id} />
    </>
  )
}

// ---------------------------------------------------------------------------

function PiezasPendientes({ unidades, loteId }: { unidades: UnidadConModelo[]; loteId: string }) {
  const clienteQuery = useQueryClient()

  const borrar = useMutation({
    mutationFn: (unidadId: string) => eliminarUnidad(unidadId),
    onSuccess: () => {
      void clienteQuery.invalidateQueries({ queryKey: llaves.unidadesDeLote(loteId) })
      void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
    },
  })

  if (unidades.length === 0) return null

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 4 }}>Pendientes del proveedor ({unidades.length})</h2>
      <p className="tenue" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        Piezas pagadas que no han llegado. Dalas de baja solo cuando cierres el reclamo, para que el
        costo del lote se reparta entre las piezas que sí tienes.
      </p>

      <div className="tabla-contenedor">
        <table>
          <tbody>
            {unidades.map((unidad) => (
              <tr key={unidad.id}>
                <td className="principal">
                  {unidad.modelo.nombre}
                  <div className="tenue" style={{ fontSize: '0.83rem' }}>
                    <span className="mono">{unidad.modelo.codigo}</span> ·{' '}
                    {unidad.talla ?? 'Ajustable'}
                  </div>
                </td>
                <td className="acciones">
                  <button
                    type="button"
                    className="discreto peligro"
                    disabled={borrar.isPending}
                    onClick={() => {
                      if (confirm('Dar de baja esta pieza del lote. No se puede deshacer.')) {
                        borrar.mutate(unidad.id)
                      }
                    }}
                  >
                    Dar de baja
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
