import { useState } from 'react'
import { CATEGORIAS, TALLAS_FITTED, TALLAS_NINO, type Categoria } from '@jm-caps/db'

const OTRA = '__otra__'
const SIN_TALLA = '__ninguna__'

/**
 * Selector de talla. Null significa sin talla (pieza ajustable).
 *
 * Lo que se puede elegir depende del tipo de gorra: una AA solo ofrece tallas
 * de adulto y una K solo de niño, porque mezclarlas es invitar a capturar mal.
 * En las categorías ajustables el selector desaparece: no hay nada que decidir.
 * La opción de escribirla a mano queda como válvula de escape para cuando el
 * proveedor use otra escala, como centímetros.
 */
export function SelectorTalla({
  categoria,
  valor,
  alCambiar,
}: {
  categoria: Categoria | null
  valor: string | null
  alCambiar: (talla: string | null) => void
}) {
  const info = categoria ? CATEGORIAS[categoria] : null
  const esAjustable = info !== null && !info.usaTalla

  const disponibles: readonly string[] = info
    ? info.tallas
    : // Sin tipo definido todavía no se puede acotar, así que se ofrecen todas.
      [...TALLAS_FITTED, ...TALLAS_NINO]

  const esLibre = valor !== null && !disponibles.includes(valor)
  const [escribiendo, setEscribiendo] = useState(esLibre)

  if (esAjustable) {
    return (
      <p className="tenue" style={{ margin: 0, padding: '10px 0' }}>
        Ajustable: esta gorra no lleva talla.
      </p>
    )
  }

  const enModoLibre = escribiendo || esLibre
  const seleccion = enModoLibre ? OTRA : valor === null ? SIN_TALLA : valor

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
          alCambiar(elegido === SIN_TALLA ? null : elegido)
        }}
      >
        <option value={SIN_TALLA}>Sin talla (ajustable)</option>
        {disponibles.map((talla) => (
          <option key={talla} value={talla}>
            {talla}
          </option>
        ))}
        <option value={OTRA}>Otra talla</option>
      </select>

      {enModoLibre ? (
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
