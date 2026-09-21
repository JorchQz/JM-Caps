import type { Categoria } from '@jm-caps/db'

/**
 * Los códigos internos (AA, AAS, DH) no significan nada para el cliente: son
 * del proveedor. Aquí se traducen a la palabra con la que la gente pide la
 * gorra, que en esta cultura es fitted o snapback y no una descripción.
 *
 * Cambiar una etiqueta aquí la cambia en el filtro y en la tarjeta a la vez.
 *
 * Vive aparte de `catalogo.ts` a propósito: ese módulo abre el cliente de
 * Supabase al cargarse, y el vocabulario tiene que poder usarse y probarse
 * sin red.
 */
export const TIPOS_CLIENTE: Record<Categoria, string> = {
  AA: 'Fitted',
  AAS: 'Snapback',
  UU: 'Fitted',
  UUS: 'Snapback',
  K: 'Niños',
  DH: 'Streetwear',
}
