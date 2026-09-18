import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CANALES_VENTA, METODOS_PAGO, formatearFecha, formatearMXN } from '@jm-caps/db'
import { cargarVentas, llaves } from '../lib/consultas'
import { Cargando, EncabezadoPagina, MensajeError, Vacio } from '../components/ui'

export function Historial() {
  const { data, isLoading, error } = useQuery({ queryKey: llaves.ventas, queryFn: () => cargarVentas() })

  const resumen = useMemo(() => {
    const ventas = data ?? []
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const delMes = ventas.filter((venta) => new Date(venta.fecha) >= inicioMes)
    return {
      totalMes: delMes.reduce((suma, venta) => suma + venta.total_mxn, 0),
      piezasMes: delMes.reduce((suma, venta) => suma + venta.items.length, 0),
      ventasMes: delMes.length,
    }
  }, [data])

  return (
    <>
      <EncabezadoPagina titulo="Historial de ventas" descripcion="Últimas 50 ventas registradas." />

      <MensajeError error={error} />

      <div className="rejilla" style={{ marginBottom: 18 }}>
        <Indicador titulo="Vendido este mes" valor={formatearMXN(resumen.totalMes)} />
        <Indicador titulo="Piezas este mes" valor={String(resumen.piezasMes)} />
        <Indicador titulo="Ventas este mes" valor={String(resumen.ventasMes)} />
      </div>

      <div className="tarjeta">
        {isLoading ? (
          <Cargando />
        ) : (data ?? []).length === 0 ? (
          <Vacio>Todavía no hay ventas registradas.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Canal</th>
                  <th>Pago</th>
                  <th className="numero">Piezas</th>
                  <th className="numero">Total</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((venta) => (
                  <tr key={venta.id}>
                    <td>{formatearFecha(venta.fecha)}</td>
                    <td>
                      {venta.cliente_nombre ?? 'Sin nombre'}
                      {venta.cliente_telefono ? (
                        <div className="tenue" style={{ fontSize: '0.83rem' }}>
                          {venta.cliente_telefono}
                        </div>
                      ) : null}
                    </td>
                    <td>{CANALES_VENTA[venta.canal]}</td>
                    <td>{METODOS_PAGO[venta.metodo_pago]}</td>
                    <td className="numero">{venta.items.length}</td>
                    <td className="numero">{formatearMXN(venta.total_mxn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="tarjeta">
      <div className="tenue" style={{ fontSize: '0.82rem' }}>
        {titulo}
      </div>
      <div className="numero" style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 2 }}>
        {valor}
      </div>
    </div>
  )
}
