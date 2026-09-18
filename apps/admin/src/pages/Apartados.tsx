import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatearFecha, formatearMXN, telefonoWhatsApp, tiempoRestante } from '@jm-caps/db'
import {
  cargarApartados,
  extenderApartado,
  liberarApartado,
  llaves,
  type Apartado,
} from '../lib/consultas'
import { Cargando, EncabezadoPagina, MensajeError, Vacio } from '../components/ui'

export function Apartados() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: llaves.apartados,
    queryFn: cargarApartados,
  })

  return (
    <>
      <EncabezadoPagina
        titulo="Apartados activos"
        descripcion="Cada apartado dura 24 horas. Si no se concreta, la base lo libera sola cada 15 minutos y la pieza vuelve al catálogo."
        acciones={
          <button type="button" onClick={() => void refetch()}>
            Actualizar
          </button>
        }
      />

      <MensajeError error={error} />

      <div className="tarjeta">
        {isLoading ? (
          <Cargando />
        ) : (data ?? []).length === 0 ? (
          <Vacio>No hay apartados activos.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Pieza</th>
                  <th>Vence</th>
                  <th className="numero">Precio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((apartado) => (
                  <FilaApartado key={apartado.id} apartado={apartado} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function FilaApartado({ apartado }: { apartado: Apartado }) {
  const clienteQuery = useQueryClient()

  function refrescar() {
    void clienteQuery.invalidateQueries({ queryKey: llaves.apartados })
    void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
  }

  const liberar = useMutation({
    mutationFn: () => liberarApartado(apartado.id),
    onSuccess: refrescar,
  })

  const extender = useMutation({
    mutationFn: () => extenderApartado(apartado.id, 24),
    onSuccess: refrescar,
  })

  const restante = tiempoRestante(apartado.apartado_hasta)
  const vencido = restante === 'Vencido'

  const mensaje = encodeURIComponent(
    `Hola ${apartado.apartado_nombre ?? ''}, te escribo de JM Caps. Tengo apartada tu gorra ${
      apartado.modelo.nombre
    }${apartado.talla ? ` talla ${apartado.talla}` : ''} en ${formatearMXN(
      apartado.modelo.precio_venta_mxn,
    )}. ¿Cómo quedamos para la entrega y el pago?`.trim(),
  )

  return (
    <tr>
      <td>
        <strong>{apartado.apartado_nombre ?? 'Sin nombre'}</strong>
        <div className="tenue" style={{ fontSize: '0.83rem' }}>
          {apartado.apartado_telefono ?? 'Sin teléfono'}
        </div>
      </td>
      <td>
        <Link to={`/modelo/${apartado.modelo.id}`}>{apartado.modelo.nombre}</Link>
        <div className="tenue" style={{ fontSize: '0.83rem' }}>
          <span className="mono">{apartado.modelo.codigo}</span> · {apartado.talla ?? 'Ajustable'}
        </div>
      </td>
      <td>
        <span className={`insignia ${vencido ? 'apartada' : 'acento'}`}>{restante}</span>
        <div className="tenue" style={{ fontSize: '0.8rem' }}>
          {formatearFecha(apartado.apartado_hasta)}
        </div>
      </td>
      <td className="numero">{formatearMXN(apartado.modelo.precio_venta_mxn)}</td>
      <td>
        <div className="fila" style={{ justifyContent: 'flex-end', gap: 4 }}>
          {apartado.apartado_telefono ? (
            <a
              href={`https://wa.me/${telefonoWhatsApp(apartado.apartado_telefono)}?text=${mensaje}`}
              target="_blank"
              rel="noreferrer"
            >
              <button type="button" className="discreto">
                WhatsApp
              </button>
            </a>
          ) : null}
          <button
            type="button"
            className="discreto"
            disabled={extender.isPending}
            onClick={() => extender.mutate()}
          >
            +24 h
          </button>
          <button
            type="button"
            className="discreto peligro"
            disabled={liberar.isPending}
            onClick={() => liberar.mutate()}
          >
            Liberar
          </button>
        </div>
      </td>
    </tr>
  )
}
