/** Lado mayor al que se reduce la foto. Suficiente para verse bien en pantalla. */
const LADO_MAXIMO = 1400

/** Calidad de compresión. Arriba de 0.85 el archivo crece sin verse mejor. */
const CALIDAD = 0.82

/**
 * Comprime una foto antes de subirla.
 *
 * Una foto de celular pesa entre 3 y 6 MB. Subirla tal cual hace que la tienda
 * tarde en cargar con datos móviles, que es justo como la va a abrir el
 * cliente. Aquí baja a unos 150-250 KB sin que se note la diferencia en
 * pantalla.
 *
 * Se usa createImageBitmap con la orientación de la propia imagen porque las
 * fotos verticales de celular traen la rotación en los metadatos: sin eso, una
 * gorra fotografiada de pie aparece acostada en el catálogo.
 */
export async function comprimirFoto(archivo: File): Promise<File> {
  // Si no es una imagen que el navegador sepa decodificar, se sube tal cual.
  if (!archivo.type.startsWith('image/')) return archivo

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    return archivo
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto

  const contexto = lienzo.getContext('2d')
  if (!contexto) {
    bitmap.close()
    return archivo
  }

  contexto.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolver) => {
    lienzo.toBlob(resolver, 'image/webp', CALIDAD)
  })

  // Si el navegador no pudo con WebP, o el resultado pesa más que el original
  // (pasa con imágenes ya optimizadas), se queda el archivo original.
  if (!blob || blob.size >= archivo.size) return archivo

  const nombre = archivo.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${nombre}.webp`, { type: 'image/webp' })
}
