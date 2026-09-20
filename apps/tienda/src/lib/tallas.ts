/**
 * Ordena tallas como números, no como texto: "7 1/8" va antes que "7 1/4",
 * pero alfabéticamente saldría al revés.
 */
export function compararTallas(a: string, b: string): number {
  return valorDeTalla(a) - valorDeTalla(b)
}

function valorDeTalla(talla: string): number {
  const [entero, fraccion] = talla.trim().split(' ')
  const base = Number(entero)
  if (Number.isNaN(base)) return Number.POSITIVE_INFINITY
  if (!fraccion) return base

  const [arriba, abajo] = fraccion.split('/').map(Number)
  if (!arriba || !abajo) return base
  return base + arriba / abajo
}
