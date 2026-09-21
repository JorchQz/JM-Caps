import {
  crearCliente,
  telefonoWhatsApp,
  type Categoria,
  type Tables,
} from '@jm-caps/db'

export const supabase = crearCliente({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

export type Producto = Tables<'catalogo_publico'>

/**
 * Los códigos internos (AA, AAS, DH) no significan nada para el cliente: son
 * del proveedor. Aquí se traducen a lo único que le importa saber, que es si
 * la gorra lleva talla o es ajustable.
 */
export const TIPOS_CLIENTE: Record<Categoria, string> = {
  AA: 'Cerrada, con talla',
  AAS: 'Ajustable',
  UU: 'Cerrada, con talla',
  UUS: 'Ajustable',
  K: 'Niños',
  DH: 'Streetwear',
}

/** Horas que dura un apartado. Tiene que coincidir con lo que hace la base. */
export const HORAS_APARTADO = 24

export async function cargarCatalogo(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('catalogo_publico')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) throw new Error('No pudimos cargar el catálogo. Revisa tu conexión.')
  return data ?? []
}

export async function cargarProducto(modeloId: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('catalogo_publico')
    .select('*')
    .eq('modelo_id', modeloId)
    .maybeSingle()

  if (error) throw new Error('No pudimos cargar esta gorra. Revisa tu conexión.')
  return data
}

export type DatosApartado = {
  modeloId: string
  talla: string | null
  nombre: string
  telefono: string
}

/**
 * Aparta una pieza por 24 horas. Es la única operación que el público puede
 * hacer sobre el inventario, y la base valida los datos y el límite por
 * teléfono: aquí no se confía en que el formulario haya hecho su trabajo.
 */
export async function apartar(datos: DatosApartado): Promise<string> {
  const { data, error } = await supabase.rpc('apartar_unidad', {
    p_modelo_id: datos.modeloId,
    p_talla: datos.talla,
    p_nombre: datos.nombre.trim(),
    p_telefono: datos.telefono,
  })

  if (error) {
    // Los mensajes de la base ya están escritos para el cliente.
    throw new Error(error.message.replace(/^.*?:\s*/, ''))
  }
  return data as string
}

export function precioEnPesos(valor: number | null): string {
  if (valor === null) return ''
  return '$' + new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(valor)
}

/**
 * Número de la tienda en formato internacional. Acepta el valor de entorno en
 * cualquiera de las formas usuales: diez dígitos, con 52, o con el 521 viejo.
 */
export function whatsappTienda(): string {
  return telefonoWhatsApp(import.meta.env.VITE_WHATSAPP ?? '')
}

export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${whatsappTienda()}?text=${encodeURIComponent(mensaje)}`
}
