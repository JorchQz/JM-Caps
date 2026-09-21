import type { Enums } from './types'

export type TipoDescuento = Enums<'tipo_descuento'>

export const TIPOS_DESCUENTO: Record<TipoDescuento, string> = {
  porcentaje: 'Porcentaje',
  monto: 'Monto fijo',
}

/** Un porcentaje mayor a esto deja de ser una oferta y es un error de captura. */
export const DESCUENTO_MAXIMO_PORCENTAJE = 90

export type Oferta = {
  oferta_tipo: TipoDescuento | null
  oferta_valor: number | null
  oferta_hasta: string | null
}

/**
 * Misma regla que la función `precio_efectivo` de la base.
 *
 * Está escrita dos veces a propósito: la base es la que manda al cobrar y al
 * armar el catálogo, y esta copia sirve para que el panel pueda mostrar el
 * resultado sin ir y volver por red mientras se captura. Si una cambia, la
 * otra tiene que cambiar igual.
 */
export function precioEfectivo(
  precioLista: number,
  oferta: Oferta | null | undefined,
  ahora = Date.now(),
): number {
  if (!oferta) return precioLista
  const { oferta_tipo: tipo, oferta_valor: valor, oferta_hasta: hasta } = oferta

  if (!tipo || valor == null || valor <= 0) return precioLista
  if (hasta && new Date(hasta).getTime() <= ahora) return precioLista

  const rebajado =
    tipo === 'porcentaje'
      ? Math.round(precioLista * (1 - Math.min(valor, DESCUENTO_MAXIMO_PORCENTAJE) / 100))
      : Math.round(precioLista - valor)

  return Math.max(rebajado, 1)
}

/** True solo si hay oferta y todavía no vence. */
export function ofertaVigente(oferta: Oferta | null | undefined, ahora = Date.now()): boolean {
  if (!oferta?.oferta_tipo || !oferta.oferta_valor) return false
  if (oferta.oferta_hasta && new Date(oferta.oferta_hasta).getTime() <= ahora) return false
  return true
}

/** "-20%" o "-$50", para la etiqueta que ve el cliente. */
export function etiquetaDescuento(tipo: TipoDescuento, valor: number): string {
  return tipo === 'porcentaje' ? `-${valor}%` : `-$${valor}`
}

/** Lo que ahorra el cliente, en pesos. Cero si la oferta no está vigente. */
export function ahorro(precioLista: number, oferta: Oferta | null | undefined): number {
  return precioLista - precioEfectivo(precioLista, oferta)
}
