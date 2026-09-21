/**
 * Datos del negocio que aparecen en los documentos legales.
 *
 * La Ley Federal de Protección de Datos Personales en Posesión de los
 * Particulares exige que el aviso de privacidad identifique al responsable y
 * diga cómo contactarlo para ejercer derechos ARCO. Sin estos datos el aviso
 * no cumple, así que están aquí en un solo lugar para llenarlos una vez.
 *
 * REVISAR ANTES DE PUBLICAR: los campos marcados con PENDIENTE.
 */
export const NEGOCIO = {
  /** Nombre comercial con el que te conoce el cliente. */
  nombre: 'JM Caps',

  /**
   * Quién responde legalmente por los datos. Si operas como persona física,
   * va tu nombre completo. PENDIENTE: confirmar cómo va a aparecer.
   */
  responsable: 'PENDIENTE: nombre completo del responsable',

  /**
   * Domicilio para efectos legales. No tiene que ser un local abierto al
   * público, pero sí un domicilio real donde puedas recibir notificaciones.
   * PENDIENTE.
   */
  domicilio: 'PENDIENTE: calle, número, colonia, Colotlán, Jalisco, C.P.',

  /** Correo donde el cliente puede ejercer sus derechos ARCO. PENDIENTE. */
  correo: 'PENDIENTE: correo de contacto',

  /** Se muestra como el canal principal de atención. */
  whatsapp: '+52 33 1445 5062',

  zonas: 'Colotlán y Tepatitlán, Jalisco',

  /** Fecha de la última revisión de los documentos legales. */
  actualizado: '20 de septiembre de 2026',
} as const

/** Horas que dura un apartado. Debe coincidir con lo que hace la base. */
export const HORAS_APARTADO = 24

/** Días para reportar un defecto de fábrica. PENDIENTE: confirmar. */
export const DIAS_GARANTIA = 3

/** True cuando falta llenar algún dato obligatorio. */
export function faltanDatosLegales(): boolean {
  return Object.values(NEGOCIO).some((valor) => valor.startsWith('PENDIENTE'))
}
