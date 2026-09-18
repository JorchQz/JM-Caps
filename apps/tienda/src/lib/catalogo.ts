import { crearCliente, type Categoria, type Tables } from '@jm-caps/db'

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

/** Los tipos que se ofrecen como filtro, sin repetir los que dicen lo mismo. */
export const FILTROS_TIPO: Array<{ etiqueta: string; categorias: Categoria[] }> = [
  { etiqueta: 'Con talla', categorias: ['AA', 'UU'] },
  { etiqueta: 'Ajustables', categorias: ['AAS', 'UUS'] },
  { etiqueta: 'Streetwear', categorias: ['DH'] },
  { etiqueta: 'Niños', categorias: ['K'] },
]

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
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

/** Número de la tienda en formato internacional, para los enlaces a WhatsApp. */
export function whatsappTienda(): string {
  const digitos = (import.meta.env.VITE_WHATSAPP ?? '').replace(/\D/g, '')
  return digitos.length === 10 ? `52${digitos}` : digitos
}

export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${whatsappTienda()}?text=${encodeURIComponent(mensaje)}`
}
