import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Modelo, Unidad } from '../lib/consultas'
import { formatearMXN } from '@jm-caps/db'

/**
 * Hoja de etiquetas para pegar en cada gorra. El código contiene el id de la
 * unidad, que es lo que se escanea al vender: identifica la pieza exacta, no el
 * modelo, para no equivocarse de talla al cobrar.
 */
export function EtiquetasQR({ modelo, unidades }: { modelo: Modelo; unidades: Unidad[] }) {
  const [codigos, setCodigos] = useState<Record<string, string>>({})

  useEffect(() => {
    let activo = true

    async function generar() {
      const entradas = await Promise.all(
        unidades.map(async (unidad) => {
          const dataUrl = await QRCode.toDataURL(unidad.id, {
            margin: 1,
            width: 220,
            errorCorrectionLevel: 'M',
          })
          return [unidad.id, dataUrl] as const
        }),
      )
      if (activo) setCodigos(Object.fromEntries(entradas))
    }

    void generar()
    return () => {
      activo = false
    }
  }, [unidades])

  if (unidades.length === 0) return null

  return (
    <div className="hoja-etiquetas">
      {unidades.map((unidad) => (
        <div className="etiqueta" key={unidad.id}>
          {codigos[unidad.id] ? <img src={codigos[unidad.id]} alt="" /> : <div style={{ height: 110 }} />}
          <div className="titulo">{modelo.nombre}</div>
          <div className="detalle">
            {modelo.codigo} · {unidad.talla ?? 'Ajustable'}
          </div>
          <div className="detalle">{formatearMXN(modelo.precio_venta_mxn)}</div>
        </div>
      ))}
    </div>
  )
}
