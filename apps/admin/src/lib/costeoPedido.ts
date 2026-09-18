import { CATEGORIAS, type Categoria } from '@jm-caps/db'
import type { LineaConModelo, PrecioProveedor } from './consultas'

/**
 * Qué cantidad decide el escalón de precio. El proveedor confirmó que su oferta
 * por volumen es por tipo de gorra: 30 AA repartidas en varios diseños alcanzan
 * el escalón de 30. Queda configurable por si algún día cambia de política.
 */
export type BaseEscalon = 'diseno' | 'categoria' | 'pedido'

export const BASES_ESCALON: Record<BaseEscalon, string> = {
  diseno: 'Piezas del mismo diseño',
  categoria: 'Piezas del mismo tipo de gorra',
  pedido: 'Piezas del pedido completo',
}

export type CosteoLinea = {
  linea: LineaConModelo
  /** Precio unitario en dólares que aplica, ya resuelto el escalón. */
  precioUsd: number | null
  /** Cantidad que se usó para elegir el escalón, según la base configurada. */
  piezasDelEscalon: number
  /** Escalón aplicado, para poder verificar de dónde salió el precio. */
  desdePiezas: number | null
  subtotalUsd: number | null
  ventaMxn: number | null
}

export type CosteoPedido = {
  lineas: CosteoLinea[]
  piezas: number
  totalUsd: number
  piezasSinPrecio: number
  categoriasSinPrecio: string[]
  totalMxn: number | null
  costoPorPiezaMxn: number | null
  ventaEstimadaMxn: number
  margenMxn: number | null
}

/**
 * Elige el precio que aplica: el escalón más alto que la cantidad alcanza.
 * Si no llega ni al primero, no hay precio — el proveedor tiene un mínimo.
 */
export function precioDelEscalon(
  escalones: PrecioProveedor[],
  categoria: Categoria | null,
  piezas: number,
): { precioUsd: number | null; desdePiezas: number | null } {
  if (!categoria) return { precioUsd: null, desdePiezas: null }

  const aplicables = escalones
    .filter((escalon) => escalon.categoria === categoria && escalon.desde_piezas <= piezas)
    .sort((a, b) => b.desde_piezas - a.desde_piezas)

  const elegido = aplicables[0]
  return elegido
    ? { precioUsd: elegido.precio_usd, desdePiezas: elegido.desde_piezas }
    : { precioUsd: null, desdePiezas: null }
}

/** Cantidad que decide el escalón de una línea, según la base configurada. */
function piezasParaEscalon(
  linea: LineaConModelo,
  lineas: LineaConModelo[],
  base: BaseEscalon,
): number {
  if (base === 'pedido') {
    return lineas.reduce((suma, otra) => suma + otra.cantidad, 0)
  }

  if (base === 'categoria') {
    return lineas
      .filter((otra) => otra.categoria === linea.categoria)
      .reduce((suma, otra) => suma + otra.cantidad, 0)
  }

  // Por diseño: el mismo link en distintas tallas sigue siendo el mismo producto.
  return lineas
    .filter((otra) => otra.link_yupoo === linea.link_yupoo)
    .reduce((suma, otra) => suma + otra.cantidad, 0)
}

/**
 * Costea el pedido con los escalones vigentes. Siempre es un aproximado: el
 * proveedor cobra en dólares y el costo real en pesos depende del tipo de
 * cambio del día en que se paga, no del de hoy.
 */
export function costearPedido(
  lineas: LineaConModelo[],
  escalones: PrecioProveedor[],
  tipoCambio: number | null,
  base: BaseEscalon = 'categoria',
): CosteoPedido {
  const detalle: CosteoLinea[] = lineas.map((linea) => {
    const piezasDelEscalon = piezasParaEscalon(linea, lineas, base)
    const { precioUsd: dePrecioLista, desdePiezas } = precioDelEscalon(
      escalones,
      linea.categoria,
      piezasDelEscalon,
    )
    // Un precio acordado para esa pieza en particular gana sobre la escalera.
    const precioUsd = linea.precio_usd_unitario ?? dePrecioLista

    const ventaMxn =
      linea.modelo?.precio_venta_mxn ??
      (linea.categoria ? CATEGORIAS[linea.categoria].precioSugerido : null)

    return {
      linea,
      precioUsd,
      piezasDelEscalon,
      desdePiezas: linea.precio_usd_unitario !== null ? null : desdePiezas,
      subtotalUsd: precioUsd === null ? null : precioUsd * linea.cantidad,
      ventaMxn,
    }
  })

  const piezas = lineas.reduce((suma, linea) => suma + linea.cantidad, 0)
  const totalUsd = detalle.reduce((suma, fila) => suma + (fila.subtotalUsd ?? 0), 0)

  const sinPrecio = detalle.filter((fila) => fila.precioUsd === null)
  const piezasSinPrecio = sinPrecio.reduce((suma, fila) => suma + fila.linea.cantidad, 0)
  const categoriasSinPrecio = [
    ...new Set(sinPrecio.map((fila) => fila.linea.categoria ?? 'sin tipo definido')),
  ]

  const totalMxn = tipoCambio && tipoCambio > 0 ? totalUsd * tipoCambio : null
  const ventaEstimadaMxn = detalle.reduce(
    (suma, fila) => suma + (fila.ventaMxn ?? 0) * fila.linea.cantidad,
    0,
  )

  return {
    lineas: detalle,
    piezas,
    totalUsd,
    piezasSinPrecio,
    categoriasSinPrecio,
    totalMxn,
    costoPorPiezaMxn: totalMxn !== null && piezas > 0 ? totalMxn / piezas : null,
    ventaEstimadaMxn,
    margenMxn: totalMxn === null ? null : ventaEstimadaMxn - totalMxn,
  }
}

export function formatearUSD(valor: number | null): string {
  if (valor === null) return '-'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(valor)
}
