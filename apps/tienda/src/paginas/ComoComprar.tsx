import { Link } from 'react-router-dom'
import { Documento } from '../componentes/Documento'
import { enlaceWhatsApp } from '../lib/catalogo'
import { HORAS_APARTADO, NEGOCIO } from '../lib/legales'

/**
 * Explica el flujo completo. No es un documento legal: existe para quitarle
 * dudas al cliente antes de que las pregunte por WhatsApp, sobre todo la más
 * común, que es si apartar implica pagar algo.
 */
export function ComoComprar() {
  return (
    <Documento
      titulo="Cómo comprar"
      resumen="Apartas en línea sin pagar, quedamos por WhatsApp, y pagas cuando tienes la gorra en la mano."
    >
      <h2>1. Elige tu gorra</h2>
      <p>
        En el catálogo solo aparecen gorras que tenemos físicamente. Si la ves, existe y está
        disponible ahora mismo. Puedes filtrar por tipo, talla o equipo para encontrar la tuya más
        rápido.
      </p>
      <p>
        Las tallas que se muestran son las que hay en existencia de ese modelo, no un catálogo
        completo de tallas. Si tu talla no aparece, es que no la tenemos de ese diseño.
      </p>

      <h2>2. Apártala</h2>
      <p>
        Escribes tu nombre y tu WhatsApp, y la gorra queda a tu nombre durante {HORAS_APARTADO}{' '}
        horas. Sale del catálogo, así que nadie más puede llevársela mientras decides.
      </p>
      <p>
        <strong>Apartar no cuesta nada y no te obliga a comprar.</strong> No pedimos tarjeta, ni
        anticipo, ni datos bancarios.
      </p>

      <h2>3. Quedamos por WhatsApp</h2>
      <p>
        Al apartar se abre WhatsApp con el mensaje ya escrito. Nos dices dónde y a qué hora te
        queda bien, y ahí nos vemos. Puede ser un punto de encuentro o tu domicilio, dentro de{' '}
        {NEGOCIO.zonas}.
      </p>
      <p>
        Si no escribes dentro de las {HORAS_APARTADO} horas, el apartado vence solo y la gorra
        vuelve al catálogo. No pasa nada, puedes volver a apartarla si sigue disponible.
      </p>

      <h2>4. La revisas y pagas</h2>
      <p>
        Te entregamos la gorra en mano. La revisas con calma antes de pagar: para eso es la
        entrega en persona. Si te convence, pagas en efectivo, por transferencia o con tarjeta en
        la terminal.
      </p>
      <p>La entrega no tiene costo dentro de {NEGOCIO.zonas}.</p>

      <h2>Preguntas que nos hacen seguido</h2>

      <h3>¿Hacen envíos?</h3>
      <p>
        Por ahora no. Solo entrega en mano en {NEGOCIO.zonas}. Si estás en otra ciudad,
        escríbenos y lo vemos caso por caso.
      </p>

      <h3>¿Puedo apartar varias?</h3>
      <p>Sí, hasta tres al mismo tiempo. Si necesitas más para un pedido grande, escríbenos.</p>

      <h3>¿Qué talla soy?</h3>
      <p>
        Las gorras cerradas van por talla numérica, de 7 a 8. Si no sabes la tuya, mide el
        contorno de tu cabeza justo arriba de las orejas y escríbenos el número en centímetros;
        te decimos cuál te queda. Las ajustables traen broche atrás y le quedan a casi todos.
      </p>

      <h3>¿Y si no me queda?</h3>
      <p>
        Como la entrega es en persona, puedes probártela antes de pagar. Si no te queda, no la
        compras y no pasa nada. Lo que no hacemos son devoluciones después de pagada, salvo
        defecto de fábrica; eso está en los{' '}
        <Link to="/terminos">términos y condiciones</Link>.
      </p>

      <h3>¿Cada cuándo llega mercancía?</h3>
      <p>
        Cada una o dos semanas. Si buscas algo en particular y no está, escríbenos y te avisamos
        cuando llegue.
      </p>

      <p style={{ marginTop: 32 }}>
        <a className="boton-mensaje" href={enlaceWhatsApp('Hola, tengo una duda sobre las gorras.')}>
          Escribir por WhatsApp
        </a>
      </p>
    </Documento>
  )
}
