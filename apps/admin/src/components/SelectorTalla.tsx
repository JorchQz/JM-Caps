import { useState } from 'react'
import { TALLAS_CONOCIDAS, TALLAS_FITTED, TALLAS_NINO } from '@jm-caps/db'

const OTRA = '__otra__'
const AJUSTABLE = '__ajustable__'

/**
 * Selector de talla para todo el panel. Null significa ajustable (sin talla).
 * Ofrece las dos escalas porque la categoría sugiere pero no obliga: el
 * proveedor a veces manda una pieza de niño dentro de un pedido de adulto. La
 * opción de escribirla a mano existe para cuando el proveedor usa otra escala,
 * como centímetros, y no dejar el alta trabada por eso.
 */
export function SelectorTalla({
  valor,
  alCambiar,
}: {
  valor: string | null
  alCambiar: (talla: string | null) => void
}) {
  const esLibre = valor !== null && !TALLAS_CONOCIDAS.includes(valor)
  const [escribiendo, setEscribiendo] = useState(esLibre)

  const seleccion = escribiendo || esLibre ? OTRA : valor === null ? AJUSTABLE : valor

  return (
    <>
      <select
        value={seleccion}
        onChange={(evento) => {
          const elegido = evento.target.value
          if (elegido === OTRA) {
            setEscribiendo(true)
            alCambiar('')
            return
          }
          setEscribiendo(false)
          alCambiar(elegido === AJUSTABLE ? null : elegido)
        }}
      >
        <option value={AJUSTABLE}>Ajustable (sin talla)</option>
        <optgroup label="Adulto">
          {TALLAS_FITTED.map((talla) => (
            <option key={talla} value={talla}>
              {talla}
            </option>
          ))}
        </optgroup>
        <optgroup label="Niño">
          {TALLAS_NINO.map((talla) => (
            <option key={talla} value={talla}>
              {talla}
            </option>
          ))}
        </optgroup>
        <option value={OTRA}>Otra talla</option>
      </select>

      {escribiendo || esLibre ? (
        <input
          type="text"
          value={valor ?? ''}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder="Como venga del proveedor, por ejemplo 54 cm"
          style={{ marginTop: 6 }}
          autoFocus
        />
      ) : null}
    </>
  )
}
