import { CATEGORIAS } from '@jm-caps/db'
import type { LineaConModelo, PrecioProveedor } from './consultas'

export type CosteoLinea = {
  linea: LineaConModelo
  /** Precio unitario en dólares que aplica: el de la línea si lo hay, si no el de su categoría. */
  precioUsd: number | null
  subtotalUsd: number | null
  /** Precio de venta al público por pieza, para estimar el retorno del pedido. */
  ventaMxn: number | null
}

export type CosteoPedido = {
  lineas: CosteoLinea[]
  piezas: number
  totalUsd: number
  /** Piezas cuya categoría no tiene precio todavía: el total sale incompleto. */
  piezasSinPrecio: number
  categoriasSinPrecio: string[]
  totalMxn: number | null
  costoPorPiezaMxn: number | null
  ventaEstimadaMxn: number
  /** Ganancia estimada si se vendiera todo el pedido a precio de lista. */
  margenMxn: number | null
}

/**
 * Costea el pedido con los precios vigentes del proveedor. Siempre es un
 * aproximado: el proveedor cobra en dólares y el costo real en pesos depende
 * del tipo de cambio del día en que se paga, no del de hoy.
 */
export function costearPedido(
  lineas: LineaConModelo[],
  precios: PrecioProveedor[],
  tipoCambio: number | null,
): CosteoPedido {
  const porCategoria = new Map(precios.map((precio) => [precio.categoria, precio.precio_usd]))

  const detalle: CosteoLinea[] = lineas.map((linea) => {
    const dePrecioLista = linea.categoria ? (porCategoria.get(linea.categoria) ?? null) : null
    const precioUsd = linea.precio_usd_unitario ?? dePrecioLista

    // El precio de venta sale del modelo si ya existe; si es diseño nuevo, del
    // precio de lista de su categoría.
    const ventaMxn =
      linea.modelo?.precio_venta_mxn ??
      (linea.categoria ? CATEGORIAS[linea.categoria].precioSugerido : null)

    return {
      linea,
      precioUsd,
      subtotalUsd: precioUsd === null ? null : precioUsd * linea.cantidad,
      ventaMxn,
    }
  })

  const piezas = lineas.reduce((suma, linea) => suma + linea.cantidad, 0)
  const totalUsd = detalle.reduce((suma, fila) => suma + (fila.subtotalUsd ?? 0), 0)

  const sinPrecio = detalle.filter((fila) => fila.precioUsd === null)
  const piezasSinPrecio = sinPrecio.reduce((suma, fila) => suma + fila.linea.cantidad, 0)
  const categoriasSinPrecio = [
    ...new Set(sinPrecio.map((fila) => fila.linea.categoria ?? 'sin categoría')),
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
