import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ESTADOS_LOTE, formatearMXN, type EstadoLote } from '@jm-caps/db'
import {
  actualizarLote,
  cargarLotes,
  crearLote,
  crearPedidoBorrador,
  llaves,
  prorratearCostos,
  type Lote,
} from '../lib/consultas'
import { Aviso, Campo, Cargando, EncabezadoPagina, MensajeError, Vacio } from '../components/ui'

const HOY = () => new Date().toISOString().slice(0, 10)

export function Lotes() {
  const clienteQuery = useQueryClient()
  const navegar = useNavigate()
  const { data, isLoading, error } = useQuery({ queryKey: llaves.lotes, queryFn: cargarLotes })
  const [mensaje, setMensaje] = useState<string | null>(null)

  // Un pedido nace vacío y en borrador: lo primero es juntar los links para
  // mandárselos al proveedor, no capturar costos que todavía no se conocen.
  const nuevoPedido = useMutation({
    mutationFn: () => crearPedidoBorrador(HOY(), null),
    onSuccess: (lote) => {
      void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
      navegar(`/lotes/${lote.id}/pedido`)
    },
  })

  function refrescar() {
    void clienteQuery.invalidateQueries({ queryKey: llaves.lotes })
    void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Lotes"
        descripcion="Cada pedido al proveedor, desde que lo armas hasta que llega. Aquí también sale el costo real por gorra: mercancía en dólares por el tipo de cambio del día, más el envío repartido entre las piezas."
        acciones={
          <button
            type="button"
            className="principal"
            disabled={nuevoPedido.isPending}
            onClick={() => nuevoPedido.mutate()}
          >
            {nuevoPedido.isPending ? 'Creando' : 'Armar pedido nuevo'}
          </button>
        }
      />

      <MensajeError error={nuevoPedido.error} />

      {mensaje ? <Aviso tipo="exito">{mensaje}</Aviso> : null}
      <MensajeError error={error} />

      <NuevoLote alCrear={refrescar} />

      <div className="tarjeta">
        <h2 style={{ marginBottom: 12 }}>Historial de lotes</h2>

        {isLoading ? (
          <Cargando />
        ) : (data ?? []).length === 0 ? (
          <Vacio>Todavía no hay lotes registrados.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th className="numero">Piezas</th>
                  <th className="numero">Total USD</th>
                  <th className="numero">Tipo de cambio</th>
                  <th className="numero">Envío</th>
                  <th className="numero">Costo por pieza</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((lote) => (
                  <FilaLote
                    key={lote.id}
                    lote={lote}
                    alCambiar={refrescar}
                    alInformar={setMensaje}
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

function FilaLote({
  lote,
  alCambiar,
  alInformar,
}: {
  lote: Lote & { unidades: number }
  alCambiar: () => void
  alInformar: (texto: string) => void
}) {
  const costoEstimado =
    lote.unidades > 0
      ? ((lote.total_usd ?? 0) * (lote.tipo_cambio_dia ?? 0) + lote.costo_envio_mxn) / lote.unidades
      : null

  // Pasar a "recibido" no es un cambio de estado suelto: exige confirmar pieza
  // por pieza qué llegó, así que vive en su propia pantalla.
  const cambiarEstado = useMutation({
    mutationFn: (estado: EstadoLote) =>
      actualizarLote(lote.id, { estado, fecha_recepcion: null }),
    onSuccess: alCambiar,
  })

  const prorratear = useMutation({
    mutationFn: () => prorratearCostos(lote.id),
    onSuccess: (costo) => {
      alInformar(`Costo prorrateado: ${formatearMXN(costo)} por pieza en ${lote.unidades} unidades.`)
      alCambiar()
    },
  })

  return (
    <tr>
      <td>
        {lote.fecha_pedido}
        {lote.fecha_recepcion ? (
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            Recibido {lote.fecha_recepcion}
          </div>
        ) : null}
        {lote.notas ? (
          <div className="tenue" style={{ fontSize: '0.8rem' }}>
            {lote.notas}
          </div>
        ) : null}
      </td>
      <td>
        {lote.estado === 'recibido' ? (
          <span className="insignia disponible">{ESTADOS_LOTE.recibido}</span>
        ) : lote.estado === 'borrador' ? (
          <span className="insignia">{ESTADOS_LOTE.borrador}</span>
        ) : (
          <select
            value={lote.estado}
            disabled={cambiarEstado.isPending}
            onChange={(evento) => cambiarEstado.mutate(evento.target.value as EstadoLote)}
          >
            <option value="pedido">{ESTADOS_LOTE.pedido}</option>
            <option value="en_transito">{ESTADOS_LOTE.en_transito}</option>
          </select>
        )}
      </td>
      <td className="numero">{lote.unidades}</td>
      <td className="numero">{lote.total_usd ?? '-'}</td>
      <td className="numero">{lote.tipo_cambio_dia ?? '-'}</td>
      <td className="numero">{formatearMXN(lote.costo_envio_mxn)}</td>
      <td className="numero">{costoEstimado === null ? '-' : formatearMXN(costoEstimado)}</td>
      <td>
        {lote.estado === 'borrador' ? (
          <Link to={`/lotes/${lote.id}/pedido`}>
            <button type="button" className="principal">
              Armar pedido
            </button>
          </Link>
        ) : (
          <>
            <Link to={`/lotes/${lote.id}/pedido`}>
              <button type="button" className="discreto">
                Ver pedido
              </button>
            </Link>
            <Link to={`/lotes/${lote.id}/recibir`}>
              <button
                type="button"
                className={lote.estado === 'recibido' ? 'discreto' : 'principal'}
              >
                {lote.estado === 'recibido' ? 'Ver recepción' : 'Recibir'}
              </button>
            </Link>
            <button
              type="button"
              className="discreto"
              disabled={prorratear.isPending || lote.unidades === 0}
              onClick={() => prorratear.mutate()}
              title="Guarda el costo calculado en cada pieza del lote"
            >
              Prorratear
            </button>
          </>
        )}
        {prorratear.error ? (
          <div className="tenue" style={{ fontSize: '0.78rem' }}>
            {(prorratear.error as Error).message}
          </div>
        ) : null}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------

function NuevoLote({ alCrear }: { alCrear: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(HOY())
  const [totalUsd, setTotalUsd] = useState('')
  const [tipoCambio, setTipoCambio] = useState('')
  const [envio, setEnvio] = useState('')
  const [estado, setEstado] = useState<EstadoLote>('pedido')
  const [notas, setNotas] = useState('')

  const alta = useMutation({
    mutationFn: () =>
      crearLote({
        fecha_pedido: fecha,
        total_usd: totalUsd ? Number(totalUsd) : null,
        tipo_cambio_dia: tipoCambio ? Number(tipoCambio) : null,
        costo_envio_mxn: envio ? Number(envio) : 0,
        estado,
        notas: notas.trim() || null,
      }),
    onSuccess: () => {
      setAbierto(false)
      setTotalUsd('')
      setTipoCambio('')
      setEnvio('')
      setNotas('')
      alCrear()
    },
  })

  if (!abierto) {
    return (
      <div className="tarjeta">
        <button type="button" className="principal" onClick={() => setAbierto(true)}>
          Registrar lote nuevo
        </button>
      </div>
    )
  }

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 12 }}>Lote nuevo</h2>

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          alta.mutate()
        }}
      >
        <div className="rejilla">
          <Campo etiqueta="Fecha del pedido">
            <input
              type="date"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              required
            />
          </Campo>

          <Campo etiqueta="Estado" ayuda="Para pedidos que ya hiciste fuera del panel. Los nuevos se arman con el botón de arriba.">
            <select value={estado} onChange={(evento) => setEstado(evento.target.value as EstadoLote)}>
              <option value="pedido">{ESTADOS_LOTE.pedido}</option>
              <option value="en_transito">{ESTADOS_LOTE.en_transito}</option>
              <option value="recibido">{ESTADOS_LOTE.recibido}</option>
            </select>
          </Campo>

          <Campo etiqueta="Total en dólares" ayuda="Lo que cobró el proveedor por la mercancía.">
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalUsd}
              onChange={(evento) => setTotalUsd(evento.target.value)}
            />
          </Campo>

          <Campo etiqueta="Tipo de cambio del día">
            <input
              type="number"
              min="0"
              step="0.0001"
              value={tipoCambio}
              onChange={(evento) => setTipoCambio(evento.target.value)}
              placeholder="18.50"
            />
          </Campo>

          <Campo
            etiqueta="Envío e impuestos (MXN)"
            ayuda="Incluye aquí el impuesto de importación si aplicó, para que el costo por pieza sea real."
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={envio}
              onChange={(evento) => setEnvio(evento.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Notas">
          <textarea rows={2} value={notas} onChange={(evento) => setNotas(evento.target.value)} />
        </Campo>

        <MensajeError error={alta.error} />

        <div className="fila">
          <button type="submit" className="principal" disabled={alta.isPending}>
            {alta.isPending ? 'Guardando' : 'Guardar lote'}
          </button>
          <button type="button" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
