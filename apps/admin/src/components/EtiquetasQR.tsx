import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { formatearMXN } from '@jm-caps/db'
import type { Modelo, Unidad } from '../lib/consultas'

/** Tamaños de etiqueta, en milímetros reales sobre el papel. */
export const TAMANOS_ETIQUETA = {
  chica: { etiqueta: 'Chica (38 x 25 mm)', ancho: 38, alto: 25, qr: 15 },
  mediana: { etiqueta: 'Mediana (50 x 30 mm)', ancho: 50, alto: 30, qr: 19 },
  grande: { etiqueta: 'Grande (63 x 38 mm)', ancho: 63, alto: 38, qr: 24 },
} as const

export type TamanoEtiqueta = keyof typeof TAMANOS_ETIQUETA

/**
 * Hoja de etiquetas para pegar en cada gorra.
 *
 * El código contiene el folio de la pieza, no el del modelo: al cobrar se
 * descuenta la gorra exacta, con su talla, y no una cualquiera del montón.
 *
 * Todo va en milímetros para que salga a escala real en el papel. El QR se
 * genera a 600 puntos y se reduce por CSS, así queda nítido aunque la etiqueta
 * sea chica: un QR borroso no lo lee la cámara.
 */
export function EtiquetasQR({
  modelo,
  unidades,
  tamano = 'mediana',
}: {
  modelo: Modelo
  unidades: Unidad[]
  tamano?: TamanoEtiqueta
}) {
  const [codigos, setCodigos] = useState<Record<string, string>>({})
  const medidas = TAMANOS_ETIQUETA[tamano]

  useEffect(() => {
    let activo = true

    async function generar() {
      const entradas = await Promise.all(
        unidades.map(async (unidad) => {
          const dataUrl = await QRCode.toDataURL(unidad.folio, {
            margin: 1,
            width: 600,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
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
    <div
      className="hoja-etiquetas"
      style={{ ['--ancho-etiqueta' as string]: `${medidas.ancho}mm` }}
    >
      {unidades.map((unidad) => (
        <div className="etiqueta" key={unidad.id} style={{ height: `${medidas.alto}mm` }}>
          {codigos[unidad.id] ? (
            <img
              src={codigos[unidad.id]}
              alt=""
              style={{ width: `${medidas.qr}mm`, height: `${medidas.qr}mm` }}
            />
          ) : (
            <div style={{ width: `${medidas.qr}mm`, height: `${medidas.qr}mm` }} />
          )}

          <div className="etiqueta-datos">
            <div className="etiqueta-folio">{unidad.folio}</div>
            <div className="etiqueta-nombre">{modelo.nombre}</div>
            <div className="etiqueta-detalle">
              {modelo.codigo}
              {unidad.talla ? ` · ${unidad.talla}` : ' · Ajustable'}
            </div>
            <div className="etiqueta-precio">{formatearMXN(modelo.precio_venta_mxn)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
