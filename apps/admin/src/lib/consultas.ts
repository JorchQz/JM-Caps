import type { Categoria, Tables, TipoDescuento } from '@jm-caps/db'
import { normalizarLinkYupoo } from '@jm-caps/db'
import { supabase } from './supabase'
import { comprimirFoto } from './imagen'

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
  lote: (id: string) => ['lote', id] as const,
  unidadesDeLote: (id: string) => ['unidades-lote', id] as const,
  lineasDePedido: (id: string) => ['lineas-pedido', id] as const,
  preciosProveedor: ['precios-proveedor'] as const,
  configuracion: (clave: string) => ['configuracion', clave] as const,
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
  equipo: string | null
  descripcion: string | null
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
    p_equipo: datos.equipo,
    p_descripcion: datos.descripcion,
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
  /** Línea del pedido que esta captura satisface, para llevar el avance. */
  linea_id?: string | null
}

export async function agregarUnidades(datos: DatosUnidadesNuevas): Promise<string[]> {
  const { data, error } = await supabase.rpc('agregar_unidades', {
    p_modelo_id: datos.modelo_id,
    p_cantidad: datos.cantidad,
    p_talla: datos.talla,
    p_lote_id: datos.lote_id,
    p_costo_unitario_mxn: datos.costo_unitario_mxn,
    p_linea_id: datos.linea_id ?? null,
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

export type LoteConConteo = Lote & {
  unidades: number
  /** Piezas que ya son inventario real. Mientras haya alguna, el lote no se puede borrar. */
  unidadesReales: number
}

export async function cargarLotes(): Promise<LoteConConteo[]> {
  const [{ data: lotes, error }, { data: unidades, error: errorUnidades }] = await Promise.all([
    supabase.from('lotes').select('*').order('fecha_pedido', { ascending: false }),
    supabase.from('unidades').select('lote_id, estado'),
  ])

  if (error) fallar('No se pudieron cargar los lotes', error)
  if (errorUnidades) fallar('No se pudieron contar las unidades del lote', errorUnidades)

  const conteo = new Map<string, { total: number; reales: number }>()
  for (const unidad of unidades ?? []) {
    if (!unidad.lote_id) continue
    const actual = conteo.get(unidad.lote_id) ?? { total: 0, reales: 0 }
    actual.total += 1
    if (unidad.estado !== 'pedido' && unidad.estado !== 'en_transito') actual.reales += 1
    conteo.set(unidad.lote_id, actual)
  }

  return (lotes ?? []).map((lote) => ({
    ...lote,
    unidades: conteo.get(lote.id)?.total ?? 0,
    unidadesReales: conteo.get(lote.id)?.reales ?? 0,
  }))
}

export type ResultadoEliminacion = { unidades_borradas: number; lineas_borradas: number }

/**
 * Borra un pedido que no se concretó, con sus líneas y sus piezas pendientes.
 * La base lo rechaza si alguna pieza ya es inventario real: ese lote sí llegó.
 */
export async function eliminarLote(id: string): Promise<ResultadoEliminacion> {
  const { data, error } = await supabase.rpc('eliminar_lote', { p_lote_id: id })
  if (error) fallar('No se pudo borrar el pedido', error)
  return data?.[0] ?? { unidades_borradas: 0, lineas_borradas: 0 }
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

export type ResultadoRecepcion = { recibidas: number; faltantes: number }

/**
 * Marca el lote como recibido y pasa a disponible solo las piezas confirmadas.
 * Si no se pasa la lista, se da por recibido todo el lote. Lo que no llegó se
 * queda en estado pedido: es un reclamo al proveedor, no stock vendible.
 */
export async function recibirLote(
  id: string,
  fecha: string,
  unidadIds?: string[],
): Promise<ResultadoRecepcion> {
  const { data, error } = await supabase.rpc('recibir_lote', {
    p_lote_id: id,
    p_fecha: fecha,
    p_unidad_ids: unidadIds ?? null,
  })

  if (error) fallar('No se pudo recibir el lote', error)
  return data?.[0] ?? { recibidas: 0, faltantes: 0 }
}

/** Piezas de un lote con su modelo, para la pantalla de recepción. */
export async function unidadesDeLote(loteId: string): Promise<UnidadConModelo[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*, modelo:modelos(*)')
    .eq('lote_id', loteId)
    .order('created_at', { ascending: true })

  if (error) fallar('No se pudieron cargar las piezas del lote', error)
  return (data as UnidadConModelo[] | null) ?? []
}

export async function obtenerLote(id: string): Promise<Lote> {
  const { data, error } = await supabase.from('lotes').select('*').eq('id', id).single()
  if (error) fallar('No se pudo cargar el lote', error)
  return data
}

export type ResultadoProrrateo = { costo_unitario: number; piezas: number }

/**
 * Reparte el costo del lote (mercancía por tipo de cambio, más envío e
 * impuestos) entre las piezas que realmente llegaron. Las que no llegaron
 * quedan fuera: si contaran, abaratarían el costo de lo que sí tienes en mano.
 */
export async function prorratearCostos(loteId: string): Promise<ResultadoProrrateo> {
  const { data, error } = await supabase.rpc('prorratear_costos', { p_lote_id: loteId })
  if (error) fallar('No se pudo prorratear el costo', error)
  return data?.[0] ?? { costo_unitario: 0, piezas: 0 }
}

// ---------------------------------------------------------------------------
// Pedido al proveedor (borrador)
// ---------------------------------------------------------------------------

export type LineaPedido = Tables<'pedido_lineas'>
export type LineaConModelo = LineaPedido & {
  modelo: Modelo | null
  /**
   * Piezas ya capturadas de esta línea. Se cuenta, no se guarda: así borrar una
   * pieza corrige el avance solo, en vez de dejar la línea como completa.
   */
  unidadesCreadas: number
}

export async function crearPedidoBorrador(fecha: string, notas: string | null): Promise<Lote> {
  return crearLote({
    fecha_pedido: fecha,
    total_usd: null,
    tipo_cambio_dia: null,
    costo_envio_mxn: 0,
    estado: 'borrador',
    notas,
  })
}

export async function lineasDePedido(loteId: string): Promise<LineaConModelo[]> {
  const { data, error } = await supabase
    .from('pedido_lineas')
    .select('*, modelo:modelos(*), unidades(count)')
    .eq('lote_id', loteId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) fallar('No se pudieron cargar las líneas del pedido', error)

  type Cruda = LineaPedido & {
    modelo: Modelo | null
    unidades: Array<{ count: number }> | null
  }

  return ((data as Cruda[] | null) ?? []).map(({ unidades, ...linea }) => ({
    ...linea,
    unidadesCreadas: unidades?.[0]?.count ?? 0,
  }))
}

export type DatosLinea = {
  lote_id: string
  link_yupoo: string
  talla: string | null
  cantidad: number
  categoria: Categoria | null
  precio_usd_unitario: number | null
  nota: string | null
}

/**
 * Agrega una línea al borrador. Si el link ya existe en el catálogo se amarra
 * al modelo: al capturar después no hay que volver a escribir características,
 * y la categoría del modelo sirve para costear sin que haya que elegirla.
 */
export async function agregarLinea(datos: DatosLinea): Promise<LineaPedido> {
  const link = normalizarLinkYupoo(datos.link_yupoo)
  const modelo = await buscarModeloPorLink(link)

  const { data, error } = await supabase
    .from('pedido_lineas')
    .insert({
      lote_id: datos.lote_id,
      link_yupoo: link,
      talla: datos.talla,
      cantidad: datos.cantidad,
      categoria: datos.categoria ?? modelo?.categoria ?? null,
      precio_usd_unitario: datos.precio_usd_unitario,
      nota: datos.nota,
      modelo_id: modelo?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ese link con esa talla ya está en el pedido. Cambia la cantidad en su lugar.')
    }
    fallar('No se pudo agregar la línea', error)
  }
  return data
}

export async function actualizarLinea(id: string, cambios: Partial<LineaPedido>): Promise<void> {
  const { error } = await supabase.from('pedido_lineas').update(cambios).eq('id', id)
  if (error) fallar('No se pudo actualizar la línea', error)
}

export async function eliminarLinea(id: string): Promise<void> {
  const { error } = await supabase.from('pedido_lineas').delete().eq('id', id)
  if (error) fallar('No se pudo eliminar la línea', error)
}

export type ResultadoConfirmacion = {
  confirmadas: number
  descartadas: number
  piezas: number
  total_usd: number
}

// ---------------------------------------------------------------------------
// Precios del proveedor
// ---------------------------------------------------------------------------

export type PrecioProveedor = Tables<'precios_proveedor'>

/** La escalera de precios de compra: por tipo de gorra y por volumen. */
export async function cargarPreciosProveedor(): Promise<PrecioProveedor[]> {
  const { data, error } = await supabase
    .from('precios_proveedor')
    .select('*')
    .order('categoria', { ascending: true })
    .order('desde_piezas', { ascending: true })

  if (error) fallar('No se pudieron cargar los precios del proveedor', error)
  return data ?? []
}

/** Crea o actualiza un escalón. La llave es el par categoría + desde_piezas. */
export async function guardarEscalonPrecio(
  categoria: Categoria,
  desdePiezas: number,
  precioUsd: number,
): Promise<void> {
  const { error } = await supabase.from('precios_proveedor').upsert({
    categoria,
    desde_piezas: desdePiezas,
    precio_usd: precioUsd,
    actualizado_en: new Date().toISOString(),
  })

  if (error) fallar('No se pudo guardar el precio', error)
}

export async function eliminarEscalonPrecio(
  categoria: Categoria,
  desdePiezas: number,
): Promise<void> {
  const { error } = await supabase
    .from('precios_proveedor')
    .delete()
    .eq('categoria', categoria)
    .eq('desde_piezas', desdePiezas)

  if (error) fallar('No se pudo eliminar el escalón', error)
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export async function leerConfiguracion(clave: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', clave)
    .maybeSingle()

  if (error) fallar('No se pudo leer la configuración', error)
  return data?.valor ?? null
}

export async function guardarConfiguracion(clave: string, valor: string): Promise<void> {
  const { error } = await supabase
    .from('configuracion')
    .upsert({ clave, valor, actualizado_en: new Date().toISOString() })

  if (error) fallar('No se pudo guardar la configuración', error)
}

/** Cierra el borrador: el lote pasa a pedido y ya se pueden capturar productos. */
export async function confirmarPedido(
  loteId: string,
  totalUsd: number | null,
): Promise<ResultadoConfirmacion> {
  const { data, error } = await supabase.rpc('confirmar_pedido', {
    p_lote_id: loteId,
    p_total_usd: totalUsd,
  })
  if (error) fallar('No se pudo confirmar el pedido', error)
  return data?.[0] ?? { confirmadas: 0, descartadas: 0, piezas: 0, total_usd: 0 }
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

/**
 * Sube una foto al bucket público y devuelve su URL definitiva. Se comprime
 * antes: las fotos de celular pesan varios megas y el catálogo lo abre el
 * cliente con datos móviles.
 */
export async function subirFoto(archivo: File, carpeta: string): Promise<string> {
  const listo = await comprimirFoto(archivo)
  const extension = listo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const nombre = `${carpeta}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(nombre, listo, {
    cacheControl: '31536000',
    contentType: listo.type,
    upsert: false,
  })

  if (error) fallar('No se pudo subir la foto', error)

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(nombre)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Precios y ofertas
// ---------------------------------------------------------------------------

export type CambioPrecio = { id: string; precio_venta_mxn: number }

/**
 * Guarda varios precios de lista de un jalón.
 *
 * Son updates sueltos y no una sola sentencia porque PostgREST no hace un
 * update masivo con valores distintos por fila. A la escala de este catálogo
 * (decenas de modelos) es irrelevante, y a cambio cada fila queda protegida
 * por RLS igual que siempre.
 */
export async function guardarPrecios(cambios: CambioPrecio[]): Promise<number> {
  const validos = cambios.filter((c) => Number.isFinite(c.precio_venta_mxn) && c.precio_venta_mxn > 0)
  if (validos.length === 0) return 0

  const resultados = await Promise.all(
    validos.map((cambio) =>
      supabase
        .from('modelos')
        .update({ precio_venta_mxn: cambio.precio_venta_mxn })
        .eq('id', cambio.id),
    ),
  )

  const fallo = resultados.find((r) => r.error)
  if (fallo?.error) fallar('No se pudieron guardar los precios', fallo.error)

  return validos.length
}

export type DatosOferta = {
  tipo: TipoDescuento
  valor: number
  /** ISO, o null para que la oferta siga hasta quitarla a mano. */
  hasta: string | null
  nota: string | null
}

export async function aplicarOferta(modeloIds: string[], oferta: DatosOferta): Promise<number> {
  if (modeloIds.length === 0) return 0

  const { error } = await supabase
    .from('modelos')
    .update({
      oferta_tipo: oferta.tipo,
      oferta_valor: oferta.valor,
      oferta_hasta: oferta.hasta,
      oferta_nota: oferta.nota,
    })
    .in('id', modeloIds)

  if (error) fallar('No se pudo aplicar la oferta', error)
  return modeloIds.length
}

export async function quitarOferta(modeloIds: string[]): Promise<number> {
  if (modeloIds.length === 0) return 0

  const { error } = await supabase
    .from('modelos')
    .update({ oferta_tipo: null, oferta_valor: null, oferta_hasta: null, oferta_nota: null })
    .in('id', modeloIds)

  if (error) fallar('No se pudo quitar la oferta', error)
  return modeloIds.length
}
