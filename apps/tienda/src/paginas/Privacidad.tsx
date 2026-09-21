import { Documento } from '../componentes/Documento'
import { NEGOCIO, HORAS_APARTADO } from '../lib/legales'

/**
 * Aviso de privacidad conforme a la Ley Federal de Protección de Datos
 * Personales en Posesión de los Particulares. Es obligatorio porque la tienda
 * recaba nombre y teléfono para apartar.
 */
export function Privacidad() {
  return (
    <Documento
      titulo="Aviso de privacidad"
      resumen={`Recabamos tu nombre y tu WhatsApp con un solo fin: apartarte la gorra y ponernos de acuerdo para entregártela. No los vendemos ni los compartimos con nadie.`}
    >
      <h2>Quién es responsable de tus datos</h2>
      <p>
        {NEGOCIO.responsable}, que opera bajo el nombre comercial {NEGOCIO.nombre}, con domicilio
        en {NEGOCIO.domicilio}, es responsable del uso y protección de tus datos personales.
      </p>

      <h2>Qué datos recabamos</h2>
      <p>Únicamente los que escribes al apartar una gorra:</p>
      <ul>
        <li>Tu nombre</li>
        <li>Tu número de WhatsApp</li>
      </ul>
      <p>
        No pedimos dirección, correo, identificación ni datos de pago. No usamos cookies de
        seguimiento ni herramientas de publicidad que te perfilen.
      </p>
      <p>
        No recabamos datos personales sensibles, ni datos de menores de edad. Si eres menor de
        edad, aparta la gorra con el apoyo de tu madre, padre o tutor.
      </p>

      <h2>Para qué los usamos</h2>
      <p>Para las siguientes finalidades, todas necesarias para darte el servicio:</p>
      <ul>
        <li>Guardar la gorra a tu nombre durante {HORAS_APARTADO} horas.</li>
        <li>Contactarte por WhatsApp para acordar dónde y cuándo entregártela.</li>
        <li>Registrar la venta cuando la recibas y la pagues.</li>
      </ul>
      <p>
        No usamos tus datos para enviarte publicidad ni promociones, salvo que tú nos lo pidas
        expresamente por WhatsApp.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Con nadie. No vendemos, rentamos ni transferimos tus datos a terceros. Los datos se
        guardan en los servidores de nuestro proveedor de infraestructura, que los almacena por
        nuestra cuenta y no puede usarlos para fines propios.
      </p>

      <h2>Cuánto tiempo los conservamos</h2>
      <p>
        Si el apartado vence sin concretarse, los datos de ese apartado se borran junto con la
        reserva. Si la compra se concreta, conservamos el registro de la venta el tiempo que
        exijan las obligaciones fiscales y de garantía.
      </p>

      <h2>Tus derechos ARCO</h2>
      <p>
        Tienes derecho a conocer qué datos tuyos tenemos y para qué los usamos (Acceso), pedir que
        corrijamos los que estén mal (Rectificación), pedir que los eliminemos cuando consideres
        que no se están usando conforme a este aviso (Cancelación), y oponerte a que los usemos
        para fines específicos (Oposición).
      </p>
      <p>
        Para ejercer cualquiera de esos derechos, o para revocar tu consentimiento, escríbenos a{' '}
        <strong>{NEGOCIO.correo}</strong> o por WhatsApp al <strong>{NEGOCIO.whatsapp}</strong>.
        Necesitamos que nos digas tu nombre y el número con el que apartaste, para poder
        identificar tus datos. Te respondemos en un plazo máximo de 20 días hábiles.
      </p>
      <p>
        Si revocas tu consentimiento no podremos seguir apartándote gorras, porque sin tu nombre y
        tu teléfono no hay forma de guardarte la pieza ni de contactarte.
      </p>

      <h2>Cambios a este aviso</h2>
      <p>
        Si cambiamos este aviso, la versión nueva se publica en esta misma página con su fecha de
        actualización. Te recomendamos revisarla de vez en cuando.
      </p>

      <h2>Si no estás conforme</h2>
      <p>
        Si consideras que tu derecho a la protección de datos personales fue vulnerado, puedes
        acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de
        Datos Personales (INAI).
      </p>
    </Documento>
  )
}
