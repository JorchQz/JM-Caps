import { Link } from 'react-router-dom'
import { Documento } from '../componentes/Documento'
import { DIAS_GARANTIA, HORAS_APARTADO, MAX_APARTADOS, NEGOCIO } from '../lib/legales'

/**
 * Términos del servicio.
 *
 * Describen el producto en genérico, sin afirmar representación de ninguna
 * marca ni autenticidad: afirmar lo que no se puede sostener crearía un
 * problema mayor que no decir nada.
 */
export function Terminos() {
  return (
    <Documento
      titulo="Términos y condiciones"
      resumen={`Apartas sin pagar, te contactamos por WhatsApp y pagas cuando recibes la gorra en mano. El apartado dura ${HORAS_APARTADO} horas.`}
    >
      <h2>Quiénes somos</h2>
      <p>
        {NEGOCIO.nombre} es un negocio de venta de gorras operado por {NEGOCIO.responsable}, con
        entrega en mano en {NEGOCIO.zonas}. No contamos con local abierto al público: toda la
        venta se coordina por WhatsApp y se entrega en persona.
      </p>

      <h2>Qué vendemos</h2>
      <p>
        Gorras de distintos estilos y tallas. Las fotografías corresponden al producto que
        tenemos en existencia. Los nombres de equipos deportivos que aparecen en algunos modelos
        se usan únicamente para describir el diseño de la pieza y facilitar su búsqueda; no
        implican relación, patrocinio ni autorización de ningún titular de marca.
      </p>

      <h2>Cómo funciona el apartado</h2>
      <ul>
        <li>
          El catálogo muestra solo piezas que tenemos físicamente. Si una gorra aparece, existe.
        </li>
        <li>
          Al apartar, la pieza sale del catálogo y queda a tu nombre durante {HORAS_APARTADO}{' '}
          horas. Nadie más puede apartarla en ese tiempo.
        </li>
        <li>
          Apartar no te obliga a comprar y no cuesta nada. Tampoco es un pago ni un anticipo.
        </li>
        <li>
          Si no nos escribes dentro de esas {HORAS_APARTADO} horas, el apartado vence solo y la
          gorra regresa al catálogo para cualquier otra persona.
        </li>
        <li>
          Puedes tener hasta {MAX_APARTADOS} gorras apartadas al mismo tiempo. Si necesitas más,
          escríbenos.
        </li>
      </ul>

      <h2>Precios y pago</h2>
      <p>
        Los precios están en pesos mexicanos e incluyen impuestos. El precio que ves al apartar es
        el que se respeta al momento de la entrega.
      </p>
      <p>
        Cuando una gorra está rebajada verás el precio anterior tachado junto al nuevo. Una
        rebaja puede tener fecha de término, y si la apartas mientras está vigente te la
        entregamos a ese precio aunque la promoción termine antes de vernos.
      </p>
      <p>
        Si te dimos un código de descuento, se aplica sobre el total al momento de pagar y se
        suma a cualquier rebaja que ya tenga la gorra. Cada código trae sus condiciones —hasta
        cuándo sirve, cuántas veces y si pide una compra mínima— y te las decimos al dártelo.
      </p>
      <p>
        <strong>No hay pago en línea.</strong> Pagas al recibir la gorra, en efectivo,
        transferencia o tarjeta con terminal. No pedimos datos bancarios por WhatsApp ni por esta
        página; si alguien te los pide a nombre nuestro, no es nuestro.
      </p>

      <h2>Entrega</h2>
      <p>
        La entrega es en mano y sin costo en {NEGOCIO.zonas}, en el punto que acordemos por
        WhatsApp o en tu domicilio. El día y la hora se acuerdan caso por caso. Por ahora no
        hacemos envíos a otras ciudades.
      </p>

      <h2>Cambios y devoluciones</h2>
      <p>
        Puedes revisar la gorra antes de pagar: la entrega es en persona justamente para eso. Una
        vez pagada, no hacemos devoluciones por cambio de opinión ni por talla, porque cada pieza
        es única en inventario.
      </p>
      <p>
        Si la gorra tiene un defecto de fábrica, escríbenos dentro de los {DIAS_GARANTIA} días
        siguientes a la entrega y te la cambiamos por otra equivalente, o te devolvemos tu dinero
        si no tenemos con qué reponerla. El defecto debe ser de fabricación, no daño por uso.
      </p>

      <h2>Disponibilidad</h2>
      <p>
        Trabajamos con inventario real y limitado. Puede ocurrir que una gorra se aparte o se
        venda mientras la estás viendo; en ese caso la página te lo dirá al intentar apartarla.
        Hacemos lo posible por mantener el catálogo al día, pero no podemos garantizar
        disponibilidad de una pieza que no has apartado.
      </p>

      <h2>Tus datos</h2>
      <p>
        Al apartar nos das tu nombre y tu WhatsApp. Cómo los usamos está explicado en el{' '}
        <Link to="/aviso-de-privacidad">aviso de privacidad</Link>.
      </p>

      <h2>Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con
        su fecha de actualización. Lo que apartaste antes de un cambio se rige por los términos
        que estaban vigentes en ese momento.
      </p>

      <h2>Dudas</h2>
      <p>
        Escríbenos por WhatsApp al <strong>{NEGOCIO.whatsapp}</strong> o al correo{' '}
        <strong>{NEGOCIO.correo}</strong>.
      </p>
    </Documento>
  )
}
