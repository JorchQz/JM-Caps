import type { Categoria, Tables } from '@jm-caps/db'
import { normalizarLinkYupoo } from '@jm-caps/db'
import { supabase } from './supabase'

export type Modelo = Tables<'modelos'>
export type Unidad = Tables<'unidades'>
export type Lote = Tables<'lotes'>

const BUCKET_FOTOS = 'fotos-productos'

/** Llaves de cache de react-query, en un solo lugar para poder invalidar sin adivinar. */
export const llaves = {
  inventario: ['inventario'] as const,
  modelo: (id: string) => ['modelo', id] as const,
  unidadesDeModelo: (id: string) => ['unidades', id] as const,
  lotes: ['lotes'] as const,
  apartados: ['apartados'] as const,
  ventas: ['ventas'] as const,
}

function fallar(mensaje: string, error: { message: string } | null): never {
  throw new Error(error ? `${mensaje}: ${error.message}` : mensaje)
}

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------

/**
 * Busca un modelo por su link de Yupoo. Este es el unico criterio valido para
 * saber si un modelo ya existe: el nombre y el color se repiten entre piezas
 * que en realidad son productos distintos del proveedor.
 */
export async function buscarModeloPorLink(link: string): Promise<Modelo | null> {
  const normalizado = normalizarLinkYupoo(link)
  if (!normalizado) return null

  const { data, error } = await supabase
    .from('modelos')
    .select('*')
    .eq('link_yupoo', normalizado)
    .maybeSingle()

  if (error) fallar('No se pudo consultar el modelo por link', error)
  if (data) return data

  // Respaldo por si un modelo se dio de alta antes con el link sin normalizar:
  // se compara la parte final de la ruta, que es la que identifica el album.
  const ruta = normalizado.split('/').filter(Boolean).pop()
  if (!ruta) return null

  const { data: aproximados, error: errorAprox } = await supabase
    .from('modelos')
    .select('*')
    .ilike('link_yupoo', `%${ruta}%`)
    .limit(2)

  if (errorAprox) fallar('No se pudo consultar el modelo por link', errorAprox)
  if (aproximados && aproximados.length === 1) return aproximados[0] ?? null
  return null
}

export type DatosModeloNuevo = {
  categoria: Categoria
  nombre: string
  color: string | null
  precio_venta_mxn: number
  link_yupoo: string
  foto_url: string | null
}

export async function crearModelo(datos: DatosModeloNuevo): Promise<Modelo> {
  const { data, error } = await supabase.rpc('crear_modelo', {
    p_categoria: datos.categoria,
    p_nombre: datos.nombre,
    p_precio_venta_mxn: datos.precio_venta_mxn,
    p_link_yupoo: normalizarLinkYupoo(datos.link_yupoo),
    p_color: datos.color,
    p_foto_url: datos.foto_url,
  })

  if (error) fallar('No se pudo dar de alta el modelo', error)
  return data as Modelo
}

export async function obtenerModelo(id: string): Promise<Modelo> {
  const { data, error } = await supabase.from('modelos').select('*').eq('id', id).single()
  if (error) fallar('No se pudo cargar el modelo', error)
  return data
}

export async function actualizarModelo(id: string, cambios: Partial<Modelo>): Promise<void> {
  const { error } = await supabase.from('modelos').update(cambios).eq('id', id)
  if (error) fallar('No se pudo actualizar el modelo', error)
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export type ResumenTalla = {
  talla: string | null
  disponibles: number
  apartadas: number
  vendidas: number
  enCamino: number
}

export type FilaInventario = {
  modelo: Modelo
  total: number
  disponibles: number
  apartadas: number
  vendidas: number
  enCamino: number
  tallas: ResumenTalla[]
}

/**
 * Trae modelos y unidades y arma el resumen en el cliente. El volumen esperado
 * (cientos de unidades) no justifica una vista agregada adicional en la base.
 */
export async function cargarInventario(): Promise<FilaInventario[]> {
  const [{ data: modelos, error: errorModelos }, { data: unidades, error: errorUnidades }] =
    await Promise.all([
      supabase.from('modelos').select('*').order('created_at', { ascending: false }),
      supabase.from('unidades').select('id, modelo_id, talla, estado'),
    ])

  if (errorModelos) fallar('No se pudo cargar el catálogo', errorModelos)
  if (errorUnidades) fallar('No se pudo cargar el inventario', errorUnidades)

  const porModelo = new Map<string, Map<string, ResumenTalla>>()

  for (const unidad of unidades ?? []) {
    const tallas = porModelo.get(unidad.modelo_id) ?? new Map<string, ResumenTalla>()
    const clave = unidad.talla ?? ''
    const resumen: ResumenTalla = tallas.get(clave) ?? {
      talla: unidad.talla,
      disponibles: 0,
      apartadas: 0,
      vendidas: 0,
      enCamino: 0,
    }

    if (unidad.estado === 'disponible') resumen.disponibles += 1
    else if (unidad.estado === 'apartada') resumen.apartadas += 1
    else if (unidad.estado === 'vendida') resumen.vendidas += 1
    else resumen.enCamino += 1

    tallas.set(clave, resumen)
    porModelo.set(unidad.modelo_id, tallas)
  }

  return (modelos ?? []).map((modelo) => {
    const tallas = [...(porModelo.get(modelo.id)?.values() ?? [])].sort((a, b) =>
      (a.talla ?? '').localeCompare(b.talla ?? '', 'es'),
    )
    const suma = (campo: keyof Omit<ResumenTalla, 'talla'>) =>
      tallas.reduce((acumulado, fila) => acumulado + fila[campo], 0)

    const disponibles = suma('disponibles')
    const apartadas = suma('apartadas')
    const vendidas = suma('vendidas')
    const enCamino = suma('enCamino')

    return {
      modelo,
      tallas,
      disponibles,
      apartadas,
      vendidas,
      enCamino,
      total: disponibles + apartadas + vendidas + enCamino,
    }
  })
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export type DatosUnidadesNuevas = {
  modelo_id: string
  cantidad: number
  talla: string | null
  lote_id: string | null
  costo_unitario_mxn: number | null
}

export async function agregarUnidades(datos: DatosUnidadesNuevas): Promise<string[]> {
  const { data, error } = await supabase.rpc('agregar_unidades', {
    p_modelo_id: datos.modelo_id,
    p_cantidad: datos.cantidad,
    p_talla: datos.talla,
    p_lote_id: datos.lote_id,
    p_costo_unitario_mxn: datos.costo_unitario_mxn,
  })

  if (error) fallar('No se pudieron dar de alta las unidades', error)
  return data ?? []
}

export async function unidadesDeModelo(modeloId: string): Promise<Unidad[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .eq('modelo_id', modeloId)
    .order('created_at', { ascending: true })

  if (error) fallar('No se pudieron cargar las unidades', error)
  return data ?? []
}

export type UnidadConModelo = Unidad & { modelo: Modelo }

export async function buscarUnidadPorId(id: string): Promise<UnidadConModelo | null> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*, modelo:modelos(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) fallar('No se pudo buscar la unidad', error)
  return (data as UnidadConModelo | null) ?? null
}

/**
 * Piezas que se pueden cobrar: disponibles y apartadas (el apartado se concreta
 * cobrando esa misma pieza). Se traen todas para poder buscar y escanear sin
 * ir a la red por cada lectura del código.
 */
export async function unidadesVendibles(): Promise<UnidadConModelo[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*, modelo:modelos(*)')
    .in('estado', ['disponible', 'apartada'])
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) fallar('No se pudieron cargar las piezas vendibles', error)
  return (data as UnidadConModelo[] | null) ?? []
}

export async function actualizarUnidad(id: string, cambios: Partial<Unidad>): Promise<void> {
  const { error } = await supabase.from('unidades').update(cambios).eq('id', id)
  if (error) fallar('No se pudo actualizar la unidad', error)
}

export async function eliminarUnidad(id: string): Promise<void> {
  const { error } = await supabase.from('unidades').delete().eq('id', id)
  if (error) fallar('No se pudo eliminar la unidad', error)
}

// ---------------------------------------------------------------------------
// Lotes
// ---------------------------------------------------------------------------

export async function cargarLotes(): Promise<Array<Lote & { unidades: number }>> {
  const [{ data: lotes, error }, { data: unidades, error: errorUnidades }] = await Promise.all([
    supabase.from('lotes').select('*').order('fecha_pedido', { ascending: false }),
    supabase.from('unidades').select('lote_id'),
  ])

  if (error) fallar('No se pudieron cargar los lotes', error)
  if (errorUnidades) fallar('No se pudieron contar las unidades del lote', errorUnidades)

  const conteo = new Map<string, number>()
  for (const unidad of unidades ?? []) {
    if (!unidad.lote_id) continue
    conteo.set(unidad.lote_id, (conteo.get(unidad.lote_id) ?? 0) + 1)
  }

  return (lotes ?? []).map((lote) => ({ ...lote, unidades: conteo.get(lote.id) ?? 0 }))
}

export type DatosLote = {
  fecha_pedido: string
  total_usd: number | null
  tipo_cambio_dia: number | null
  costo_envio_mxn: number
  estado: Lote['estado']
  notas: string | null
}

export async function crearLote(datos: DatosLote): Promise<Lote> {
  const { data, error } = await supabase.from('lotes').insert(datos).select().single()
  if (error) fallar('No se pudo crear el lote', error)
  return data
}

export async function actualizarLote(id: string, cambios: Partial<Lote>): Promise<void> {
  const { error } = await supabase.from('lotes').update(cambios).eq('id', id)
  if (error) fallar('No se pudo actualizar el lote', error)
}

/**
 * Marca el lote como recibido y pasa sus unidades en camino a disponibles,
 * que es lo que en la práctica pasa cuando llega la caja a Tepatitlán.
 */
export async function recibirLote(id: string, fecha: string): Promise<void> {
  const { error } = await supabase
    .from('lotes')
    .update({ estado: 'recibido', fecha_recepcion: fecha })
    .eq('id', id)
  if (error) fallar('No se pudo marcar el lote como recibido', error)

  const { error: errorUnidades } = await supabase
    .from('unidades')
    .update({ estado: 'disponible', fecha_alta: new Date().toISOString() })
    .eq('lote_id', id)
    .in('estado', ['pedido', 'en_transito'])

  if (errorUnidades) fallar('El lote se marcó recibido pero las unidades no se liberaron', errorUnidades)
}

/**
 * Reparte el costo del lote entre sus unidades: (total USD * tipo de cambio +
 * envío) / numero de unidades. Es el costo real por gorra que usan los reportes.
 */
export async function prorratearCostos(loteId: string): Promise<number> {
  const { data: lote, error } = await supabase.from('lotes').select('*').eq('id', loteId).single()
  if (error) fallar('No se pudo cargar el lote', error)

  const { data: unidades, error: errorUnidades } = await supabase
    .from('unidades')
    .select('id')
    .eq('lote_id', loteId)

  if (errorUnidades) fallar('No se pudieron cargar las unidades del lote', errorUnidades)
  const total = unidades?.length ?? 0
  if (total === 0) throw new Error('El lote no tiene unidades registradas todavía')

  const costoMercancia = (lote.total_usd ?? 0) * (lote.tipo_cambio_dia ?? 0)
  const costoUnitario = Math.round(((costoMercancia + lote.costo_envio_mxn) / total) * 100) / 100

  const { error: errorActualizar } = await supabase
    .from('unidades')
    .update({ costo_unitario_mxn: costoUnitario })
    .eq('lote_id', loteId)

  if (errorActualizar) fallar('No se pudo guardar el costo prorrateado', errorActualizar)
  return costoUnitario
}

// ---------------------------------------------------------------------------
// Apartados
// ---------------------------------------------------------------------------

export type Apartado = Unidad & { modelo: Modelo }

export async function cargarApartados(): Promise<Apartado[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*, modelo:modelos(*)')
    .eq('estado', 'apartada')
    .order('apartado_hasta', { ascending: true })

  if (error) fallar('No se pudieron cargar los apartados', error)
  return (data as Apartado[] | null) ?? []
}

export async function liberarApartado(unidadId: string): Promise<void> {
  const { error } = await supabase
    .from('unidades')
    .update({
      estado: 'disponible',
      apartado_hasta: null,
      apartado_nombre: null,
      apartado_telefono: null,
    })
    .eq('id', unidadId)
    .eq('estado', 'apartada')

  if (error) fallar('No se pudo liberar el apartado', error)
}

export async function extenderApartado(unidadId: string, horas: number): Promise<void> {
  const nuevoVencimiento = new Date(Date.now() + horas * 3600_000).toISOString()
  const { error } = await supabase
    .from('unidades')
    .update({ apartado_hasta: nuevoVencimiento })
    .eq('id', unidadId)
    .eq('estado', 'apartada')

  if (error) fallar('No se pudo extender el apartado', error)
}

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

export type DatosVenta = {
  unidadIds: string[]
  metodo_pago: Tables<'ventas'>['metodo_pago']
  canal: Tables<'ventas'>['canal']
  cliente_nombre: string | null
  cliente_telefono: string | null
  notas: string | null
}

export async function registrarVenta(datos: DatosVenta): Promise<string> {
  const { data, error } = await supabase.rpc('registrar_venta', {
    p_unidad_ids: datos.unidadIds,
    p_metodo_pago: datos.metodo_pago,
    p_canal: datos.canal,
    p_cliente_nombre: datos.cliente_nombre,
    p_cliente_telefono: datos.cliente_telefono,
    p_notas: datos.notas,
  })

  if (error) fallar('No se pudo registrar la venta', error)
  return data as string
}

export type VentaConItems = Tables<'ventas'> & {
  items: Array<{ id: string; precio_mxn: number; unidad_id: string }>
}

export async function cargarVentas(limite = 50): Promise<VentaConItems[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, items:venta_items(id, precio_mxn, unidad_id)')
    .order('fecha', { ascending: false })
    .limit(limite)

  if (error) fallar('No se pudieron cargar las ventas', error)
  return (data as VentaConItems[] | null) ?? []
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------

/** Sube una foto al bucket publico y devuelve su URL definitiva. */
export async function subirFoto(archivo: File, carpeta: string): Promise<string> {
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const nombre = `${carpeta}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(nombre, archivo, {
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) fallar('No se pudo subir la foto', error)

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(nombre)
  return data.publicUrl
}
