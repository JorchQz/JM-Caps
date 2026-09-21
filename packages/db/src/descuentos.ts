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

// ---------------------------------------------------------------------------
// Cupones
// ---------------------------------------------------------------------------

export type CuponAplicable = {
  codigo: string
  tipo: TipoDescuento
  valor: number
  minimo_mxn: number
  usos: number
  usos_maximos: number | null
  vence: string | null
  activo: boolean
}

export type RevisionCupon =
  | { valido: true; descuento: number }
  | { valido: false; motivo: string }

/**
 * Las mismas reglas que aplica `registrar_venta` en la base, adelantadas al
 * momento de teclear el código.
 *
 * La base sigue siendo la que manda: esta revisión es para que no se cobre y
 * hasta entonces se descubra que el cupón no servía, con el cliente enfrente.
 */
export function revisarCupon(
  cupon: CuponAplicable | null | undefined,
  subtotal: number,
  hoy = new Date(),
): RevisionCupon {
  if (!cupon) return { valido: false, motivo: 'Ese código no existe.' }
  if (!cupon.activo) return { valido: false, motivo: 'Ese cupón está desactivado.' }

  if (cupon.vence && cupon.vence < hoy.toISOString().slice(0, 10)) {
    return { valido: false, motivo: `Ese cupón venció el ${cupon.vence}.` }
  }

  if (cupon.usos_maximos != null && cupon.usos >= cupon.usos_maximos) {
    return { valido: false, motivo: `Ese cupón ya se usó las ${cupon.usos_maximos} veces permitidas.` }
  }

  if (subtotal < cupon.minimo_mxn) {
    return { valido: false, motivo: `Ese cupón pide una compra mínima de $${cupon.minimo_mxn}.` }
  }

  const bruto =
    cupon.tipo === 'porcentaje' ? Math.round((subtotal * cupon.valor) / 100) : cupon.valor

  return { valido: true, descuento: Math.min(bruto, subtotal) }
}
