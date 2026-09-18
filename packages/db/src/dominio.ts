import type { Enums } from './types'

export type Categoria = Enums<'categoria_cachucha'>
export type EstadoUnidad = Enums<'estado_unidad'>
export type EstadoLote = Enums<'estado_lote'>
export type MetodoPago = Enums<'metodo_pago'>
export type CanalVenta = Enums<'canal_venta'>

type InfoCategoria = {
  codigo: Categoria
  etiqueta: string
  /** Precio de lista sugerido. El alta de modelo lo precarga, pero se puede cambiar. */
  precioSugerido: number
  /** Si es false, la categoría es ajustable y las unidades se dan de alta sin talla. */
  usaTalla: boolean
  /** Talla que trae precargada el alta. Null en las categorías ajustables. */
  tallaSugerida: string | null
  /** Categorías pausadas: se siguen mostrando pero no se sugieren para compra nueva. */
  pausada: boolean
}

export const CATEGORIAS: Record<Categoria, InfoCategoria> = {
  AA: {
    codigo: 'AA',
    etiqueta: 'AA - estilo New Era fitted, cerrada con talla',
    precioSugerido: 419,
    usaTalla: true,
    tallaSugerida: '7 1/4',
    pausada: false,
  },
  AAS: {
    codigo: 'AAS',
    etiqueta: 'AAS - estilo New Era snapback, ajustable con broche',
    precioSugerido: 419,
    usaTalla: false,
    tallaSugerida: null,
    pausada: false,
  },
  UU: {
    codigo: 'UU',
    etiqueta: 'UU - calidad 1:1, fitted con talla',
    precioSugerido: 699,
    usaTalla: true,
    tallaSugerida: '7 1/4',
    pausada: true,
  },
  UUS: {
    codigo: 'UUS',
    etiqueta: 'UUS - calidad 1:1, snapback ajustable',
    precioSugerido: 699,
    usaTalla: false,
    tallaSugerida: null,
    pausada: true,
  },
  K: {
    codigo: 'K',
    etiqueta: 'K - niños, con talla',
    precioSugerido: 399,
    usaTalla: true,
    tallaSugerida: '6 1/2',
    pausada: false,
  },
  DH: {
    codigo: 'DH',
    etiqueta: 'DH - streetwear, ajustable',
    precioSugerido: 799,
    usaTalla: false,
    tallaSugerida: null,
    pausada: false,
  },
}

export const CATEGORIAS_LISTA: InfoCategoria[] = Object.values(CATEGORIAS)

/**
 * Tallas fitted de adulto, de 7 a 8 en octavos. Se listan todas aunque el
 * proveedor no siempre tenga el rango completo: sobra una opción de más, falta
 * no poder capturar una pieza que sí llegó.
 */
export const TALLAS_FITTED = [
  '7',
  '7 1/8',
  '7 1/4',
  '7 3/8',
  '7 1/2',
  '7 5/8',
  '7 3/4',
  '7 7/8',
  '8',
] as const

/** Tallas de niño (categoría K), de 6 a 7 en octavos. El 7 se traslapa con adulto. */
export const TALLAS_NINO = [
  '6',
  '6 1/8',
  '6 1/4',
  '6 3/8',
  '6 1/2',
  '6 5/8',
  '6 3/4',
  '6 7/8',
  '7',
] as const

/** Todas las tallas conocidas, para saber si una talla capturada es a la medida. */
export const TALLAS_CONOCIDAS: readonly string[] = [
  ...new Set<string>([...TALLAS_FITTED, ...TALLAS_NINO]),
]

export const ESTADOS_UNIDAD: Record<EstadoUnidad, string> = {
  pedido: 'Pedida',
  en_transito: 'En tránsito',
  disponible: 'Disponible',
  apartada: 'Apartada',
  vendida: 'Vendida',
}

export const ESTADOS_LOTE: Record<EstadoLote, string> = {
  borrador: 'Borrador',
  pedido: 'Pedido',
  en_transito: 'En tránsito',
  recibido: 'Recibido',
}

export type EstadoLineaPedido = Enums<'estado_linea_pedido'>

export const ESTADOS_LINEA: Record<EstadoLineaPedido, string> = {
  solicitada: 'Solicitada',
  confirmada: 'Confirmada',
  no_disponible: 'No disponible',
}

/** Mínimo de piezas por pedido que exige el proveedor. */
export const MINIMO_PIEZAS_PEDIDO = 10

export const METODOS_PAGO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  spei: 'Transferencia SPEI',
  otro: 'Otro',
}

export const CANALES_VENTA: Record<CanalVenta, string> = {
  local_colotlan: 'Entrega local Colotlán',
  local_tepatitlan: 'Entrega local Tepatitlán',
  envio_nacional: 'Envío nacional',
}

/**
 * Normaliza un link de Yupoo para poder compararlo de forma confiable.
 * El link es la llave real de un modelo, así que dos formas del mismo link
 * (con o sin https, con www, con parámetros de tracking, con diagonal final)
 * deben resolver al mismo texto antes de consultar la base.
 */
export function normalizarLinkYupoo(valor: string): string {
  const limpio = valor.trim()
  if (!limpio) return ''
  let url: URL
  try {
    url = new URL(limpio.includes('://') ? limpio : `https://${limpio}`)
  } catch {
    return limpio.toLowerCase()
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const ruta = url.pathname.replace(/\/+$/, '')
  return `https://${host}${ruta}`
}

export function esLinkYupooValido(valor: string): boolean {
  const normalizado = normalizarLinkYupoo(valor)
  return /^https:\/\/[^/]*yupoo\.com\/.+/.test(normalizado)
}

export function formatearMXN(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '-'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(valor)
}

export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '-'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor))
}

/** Texto tipo "en 3 h 20 min" o "vencido" para el vencimiento de un apartado. */
export function tiempoRestante(hasta: string | null | undefined, ahora = Date.now()): string {
  if (!hasta) return '-'
  const ms = new Date(hasta).getTime() - ahora
  if (ms <= 0) return 'Vencido'
  const minutos = Math.floor(ms / 60000)
  const horas = Math.floor(minutos / 60)
  if (horas === 0) return `${minutos} min`
  return `${horas} h ${minutos % 60} min`
}

/** Número de teléfono mexicano a formato internacional para links de WhatsApp. */
export function telefonoWhatsApp(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 10) return `52${digitos}`
  if (digitos.length === 12 && digitos.startsWith('52')) return digitos
  if (digitos.length === 13 && digitos.startsWith('521')) return `52${digitos.slice(3)}`
  return digitos
}
