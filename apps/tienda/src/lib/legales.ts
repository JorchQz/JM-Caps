/**
 * Datos del negocio y reglas que aparecen en los documentos legales.
 *
 * Este archivo es la única fuente: si un plazo o un dato de contacto se
 * escribiera también dentro del texto de una página, tarde o temprano una de
 * las dos copias quedaría obsoleta y el documento diría algo falso.
 *
 * Las reglas que además vive la base de datos están marcadas. Cambiar una aquí
 * sin cambiar la migración correspondiente hace que los términos mientan;
 * `npm run verificar:legales` lo detecta.
 */
export const NEGOCIO = {
  /** Nombre comercial con el que te conoce el cliente. */
  nombre: 'JM Caps',

  /** Quién responde legalmente por los datos personales. */
  responsable: 'Jorge Iván Martínez Quezada',

  /** Domicilio para efectos legales, donde se pueden recibir notificaciones. */
  domicilio: 'Colollatzin 55, Colotlán, Jalisco, C.P. 46206',

  /** Correo donde el cliente puede ejercer sus derechos ARCO. */
  correo: 'jm.capsrm@gmail.com',

  /** Se muestra como el canal principal de atención. */
  whatsapp: '+52 33 1445 5062',

  zonas: 'Colotlán y Tepatitlán, Jalisco',

  /**
   * Fecha de la última revisión de los documentos legales. Se actualiza a mano
   * y a propósito: debe reflejar una revisión deliberada, no un cambio
   * incidental de formato.
   */
  actualizado: '21 de septiembre de 2026',
} as const

/**
 * Horas que dura un apartado.
 * TAMBIÉN EN LA BASE: `apartar_unidad` usa `interval '24 hours'`.
 */
export const HORAS_APARTADO = 24

/**
 * Cuántas gorras puede tener apartadas una misma persona.
 * TAMBIÉN EN LA BASE: `apartar_unidad` rechaza a partir de este número.
 */
export const MAX_APARTADOS = 3

/** Días para reportar un defecto de fábrica. Solo vive aquí. */
export const DIAS_GARANTIA = 3

/** True cuando falta llenar algún dato obligatorio del aviso de privacidad. */
export function faltanDatosLegales(): boolean {
  return Object.values(NEGOCIO).some((valor) => valor.startsWith('PENDIENTE'))
}
