import type { Categoria } from '@jm-caps/db'

/**
 * Los códigos internos (AA, AAS, DH) no significan nada para el cliente: son
 * del proveedor. Aquí se traducen a las dos preguntas que de verdad se hace
 * quien compra una gorra.
 *
 * Están separados a propósito. Antes iban revueltos en un solo "tipo", y por
 * eso una gorra urbana —que es ajustable— no aparecía al filtrar por
 * ajustable: estaba metida bajo su propia etiqueta de estilo.
 *
 * Vive aparte de `catalogo.ts` porque ese módulo abre el cliente de Supabase
 * al cargarse, y el vocabulario tiene que poder usarse y probarse sin red.
 */

/** ¿Necesito saber mi talla, o me queda y ya? */
export const AJUSTE: Record<Categoria, string> = {
  AA: 'Cerrada',
  AAS: 'Ajustable',
  UU: 'Cerrada',
  UUS: 'Ajustable',
  K: 'Cerrada',
  DH: 'Ajustable',
}

/**
 * ¿De qué tipo de gorra estamos hablando?
 *
 * "Deportiva" nombra la categoría sin nombrar ninguna liga, que es la línea
 * que se sigue por lo legal. "Urbana" y no "bélica": esa palabra arrastra una
 * connotación que se le pega a la marca sin que nadie lo decida.
 */
export const ESTILO: Record<Categoria, string> = {
  AA: 'Deportiva',
  AAS: 'Deportiva',
  UU: 'Deportiva',
  UUS: 'Deportiva',
  K: 'Niños',
  DH: 'Urbana',
}
