import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Categoria } from '@jm-caps/db'
import {
  TIPOS_CLIENTE,
  apartar,
  cargarProducto,
  enlaceWhatsApp,
  precioEnPesos,
} from '../lib/catalogo'
import { compararTallas } from '../lib/tallas'
import { HORAS_APARTADO } from '../lib/legales'

export function Producto() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const clienteQuery = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => cargarProducto(id),
  })

  const [talla, setTalla] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [wa, setWa] = useState('')
  const [apartada, setApartada] = useState<{ talla: string | null; vence: number } | null>(null)

  const tallas = (data?.tallas_disponibles ?? []).slice().sort(compararTallas)
  const conTalla = tallas.length > 0

  // Si solo queda una talla no tiene caso hacer que el cliente la elija.
  useEffect(() => {
    if (tallas.length === 1 && talla === null) setTalla(tallas[0] ?? null)
  }, [tallas, talla])

  const reserva = useMutation({
    mutationFn: () => apartar({ modeloId: id, talla: conTalla ? talla : null, nombre, telefono: wa }),
    onSuccess: () => {
      setApartada({
        talla: conTalla ? talla : null,
        vence: Date.now() + HORAS_APARTADO * 3600000,
      })
      void clienteQuery.invalidateQueries({ queryKey: ['catalogo'] })
      void clienteQuery.invalidateQueries({ queryKey: ['producto', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="mensaje">
        <div className="mensaje-titulo">Cargando</div>
      </div>
    )
  }

  // Que la gorra se venda mientras el cliente la mira pasa de verdad, sobre
  // todo con las últimas piezas. Se explica sin culparlo y se le da salida.
  if (error || !data) {
    return (
      <div className="mensaje">
        <div className="mensaje-titulo">Esta ya se apartó</div>
        <p className="mensaje-texto">
          Alguien se adelantó mientras la veías. Pasa seguido con las últimas piezas. Hay más en el
          catálogo.
        </p>
        <Link className="boton-mensaje" to="/">
          Ver lo que hay
        </Link>
      </div>
    )
  }

  if (apartada) {
    return (
      <Confirmacion
        nombreGorra={data.nombre ?? 'Tu gorra'}
        nombreCliente={nombre.trim().split(' ')[0] ?? ''}
        talla={apartada.talla}
        vence={apartada.vence}
        precio={data.precio_venta_mxn}
        alVolver={() => navegar('/')}
      />
    )
  }

  const tipo = data.categoria ? TIPOS_CLIENTE[data.categoria as Categoria] : null
  const meta = [data.equipo, data.color].filter(Boolean).join(' · ')
  const stock = data.stock_disponible ?? 0
  const faltaTalla = conTalla && !talla
  const digitos = wa.replace(/\D/g, '')
  const puedeApartar = !faltaTalla && nombre.trim().length >= 2 && digitos.length === 10

  const motivo = faltaTalla
    ? 'Elige tu talla para continuar'
    : nombre.trim().length < 2
      ? 'Escribe tu nombre'
      : 'Escribe tu WhatsApp a 10 dígitos'

  return (
    <>
      <div className="producto-foto">
        {data.foto_url ? (
          <img src={data.foto_url} alt={data.nombre ?? 'Gorra'} />
        ) : (
          <div className="sin-foto">foto cuadrada del producto</div>
        )}
        {stock <= 2 ? (
          <span className="escasez">{stock === 1 ? 'Última pieza' : 'Quedan 2'}</span>
        ) : null}
      </div>

      <div className="producto-cabecera">
        {tipo ? <div className="rotulo">{tipo}</div> : null}
        <h1 className="producto-nombre">{data.nombre}</h1>
        {meta ? <div className="producto-meta">{meta}</div> : null}
        <div className="producto-precio">{precioEnPesos(data.precio_venta_mxn)}</div>
        {data.descripcion ? <p className="producto-desc">{data.descripcion}</p> : null}
      </div>

      <div className="bloque-tallas">
        {conTalla ? (
          <>
            <div className="rotulo-tallas">Tu talla · solo lo que hay en mano</div>
            <div className="selector-tallas">
              {tallas.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  className="talla-boton"
                  aria-pressed={talla === valor}
                  onClick={() => setTalla(valor)}
                >
                  {valor}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="aviso-ajustable">
            <strong>Ajustable, le queda a todos</strong>
            <span>No necesitas elegir talla: trae broche atrás.</span>
          </div>
        )}
      </div>

      <form
        className="formulario"
        onSubmit={(evento) => {
          evento.preventDefault()
          reserva.mutate()
        }}
      >
        <div className="formulario-titulo">Apártala {HORAS_APARTADO} horas</div>
        <div className="formulario-nota">
          No pagas nada ahora. Pagas cuando te la entregamos en mano.
        </div>

        <label className="etiqueta" htmlFor="jm-nombre">
          Tu nombre
        </label>
        <input
          id="jm-nombre"
          className="campo"
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          placeholder="Nombre y apellido"
          autoComplete="name"
        />

        <label className="etiqueta" htmlFor="jm-wa">
          WhatsApp
        </label>
        <input
          id="jm-wa"
          className="campo campo-telefono"
          type="tel"
          inputMode="numeric"
          value={wa}
          onChange={(evento) => setWa(evento.target.value)}
          placeholder="10 dígitos"
          autoComplete="tel"
        />

        {reserva.error ? <div className="error">{(reserva.error as Error).message}</div> : null}

        <button className="boton" type="submit" disabled={!puedeApartar || reserva.isPending}>
          {reserva.isPending ? 'Apartando' : 'Apartar a mi nombre'}
        </button>

        {!puedeApartar ? <div className="motivo">{motivo}</div> : null}
      </form>
    </>
  )
}

// ---------------------------------------------------------------------------

function Confirmacion({
  nombreGorra,
  nombreCliente,
  talla,
  vence,
  precio,
  alVolver,
}: {
  nombreGorra: string
  nombreCliente: string
  talla: string | null
  vence: number
  precio: number | null
  alVolver: () => void
}) {
  const [ahora, setAhora] = useState(() => Date.now())

  // La cuenta atrás corre de verdad: el apartado vence solo, y verlo bajar es
  // lo que empuja a escribir por WhatsApp ahora y no mañana.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [])

  const detalleTalla = talla ? ` talla ${talla}` : ''
  const mensaje =
    `Hola, soy ${nombreCliente}. Acabo de apartar la gorra ${nombreGorra}${detalleTalla}` +
    `${precio ? ` en ${precioEnPesos(precio)}` : ''}. ¿Cómo quedamos para la entrega?`

  return (
    <div className="confirmacion">
      <img src="/logo-blanco.svg" alt="JM Caps" />

      <div className="confirmacion-rotulo">Apartada</div>
      <h1 className="confirmacion-titulo">
        {nombreGorra}
        <br />
        es tuya{nombreCliente ? `, ${nombreCliente}` : ''}.
      </h1>
      <div className="confirmacion-nota">
        Queda fuera del catálogo a tu nombre{detalleTalla}. Nadie más la puede apartar.
      </div>

      <div className="cuenta-atras">
        <div className="cuenta-atras-rotulo">Te quedan</div>
        <div className="cuenta-atras-cifra">{tiempoRestante(vence, ahora)}</div>
        <div className="cuenta-atras-nota">
          Si no nos escribes en ese tiempo, la gorra regresa al catálogo.
        </div>
      </div>

      <a className="boton-whatsapp" href={enlaceWhatsApp(mensaje)}>
        Escribir por WhatsApp
      </a>
      <div className="pie-confirmacion">Se abre el chat con el mensaje ya escrito.</div>

      <button type="button" className="boton-fantasma" onClick={alVolver}>
        Seguir viendo el catálogo
      </button>
    </div>
  )
}

function tiempoRestante(vence: number, ahora: number): string {
  const ms = Math.max(0, vence - ahora)
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  const segundos = Math.floor((ms % 60000) / 1000)
  const dosDigitos = (valor: number) => String(valor).padStart(2, '0')
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`
}
