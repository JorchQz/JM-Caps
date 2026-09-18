import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Categoria } from '@jm-caps/db'
import {
  TIPOS_CLIENTE,
  apartar,
  cargarProducto,
  enlaceWhatsApp,
  precioEnPesos,
} from '../lib/catalogo'
import { compararTallas } from './Catalogo'

export function Producto() {
  const { id = '' } = useParams()
  const clienteQuery = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['producto', id],
    queryFn: () => cargarProducto(id),
  })

  const [talla, setTalla] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [apartada, setApartada] = useState<{ talla: string | null } | null>(null)

  const tallas = (data?.tallas_disponibles ?? []).slice().sort(compararTallas)
  const llevaTalla = tallas.length > 0

  // Si solo queda una talla, no tiene caso hacer que el cliente la elija.
  useEffect(() => {
    if (tallas.length === 1 && talla === null) setTalla(tallas[0] ?? null)
  }, [tallas, talla])

  const reserva = useMutation({
    mutationFn: () =>
      apartar({
        modeloId: id,
        talla: llevaTalla ? talla : null,
        nombre,
        telefono,
      }),
    onSuccess: () => {
      setApartada({ talla: llevaTalla ? talla : null })
      void clienteQuery.invalidateQueries({ queryKey: ['producto', id] })
      void clienteQuery.invalidateQueries({ queryKey: ['catalogo'] })
    },
  })

  if (isLoading) return <p className="mensaje">Cargando...</p>

  if (error || !data) {
    return (
      <div className="mensaje">
        <strong>Esta gorra ya no está</strong>
        Se vendió o se apartó. Mira lo que hay disponible ahora.
        <p style={{ marginTop: 16 }}>
          <Link to="/">Ver todas las gorras</Link>
        </p>
      </div>
    )
  }

  const tipo = data.categoria ? TIPOS_CLIENTE[data.categoria as Categoria] : null
  const stock = data.stock_disponible ?? 0

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    reserva.mutate()
  }

  if (apartada) {
    const detalleTalla = apartada.talla ? ` talla ${apartada.talla}` : ''
    const mensaje =
      `Hola, soy ${nombre.trim()}. Acabo de apartar la gorra ${data.nombre}${detalleTalla} ` +
      `en ${precioEnPesos(data.precio_venta_mxn)}. ¿Cómo quedamos para la entrega?`

    return (
      <div className="producto">
        <section className="apartado">
          <h2>Apartada a tu nombre</h2>
          <p>
            Tu {data.nombre}
            {detalleTalla} te espera <span className="cuenta">24 horas</span>. Escríbenos por
            WhatsApp para quedar dónde y a qué hora la recoges.
          </p>
          <a className="boton boton-whatsapp" href={enlaceWhatsApp(mensaje)}>
            Escribir por WhatsApp
          </a>
          <p className="nota-forma">
            Si no nos escribes hoy, la gorra regresa al catálogo automáticamente. Pagas al
            recibirla, en efectivo, transferencia o tarjeta.
          </p>
        </section>

        <p style={{ marginTop: 24 }}>
          <Link to="/">Seguir viendo gorras</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="producto">
      <Link className="volver" to="/">
        Volver al catálogo
      </Link>

      <div className="producto-caja">
        <div className="producto-foto">
          {data.foto_url ? (
            <img src={data.foto_url} alt={data.nombre ?? 'Gorra'} />
          ) : (
            <div className="sin-foto">Foto en camino</div>
          )}
        </div>

        <div>
          <h1 className="producto-nombre">{data.nombre}</h1>
          <p className="producto-equipo">
            {[data.equipo, data.color, tipo].filter(Boolean).join(', ')}
          </p>

          <p className="producto-precio">{precioEnPesos(data.precio_venta_mxn)}</p>

          {data.descripcion ? <p className="producto-descripcion">{data.descripcion}</p> : null}

          <div className="bloque">
            <p className="bloque-titulo">{llevaTalla ? 'Elige tu talla' : 'Talla'}</p>

            {llevaTalla ? (
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
            ) : (
              <p className="talla-boton talla-unica" style={{ display: 'inline-block' }}>
                Ajustable, le queda a todos
              </p>
            )}

            {stock <= 2 ? (
              <p className="nota-forma">
                {stock === 1 ? 'Es la última pieza.' : 'Quedan 2 piezas.'}
              </p>
            ) : null}
          </div>

          <form className="formulario" onSubmit={enviar}>
            <p className="bloque-titulo">Apártala 24 horas</p>

            {reserva.error ? <p className="error">{(reserva.error as Error).message}</p> : null}

            <label className="campo">
              <span>Tu nombre</span>
              <input
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                autoComplete="name"
                required
              />
            </label>

            <label className="campo">
              <span>Tu WhatsApp</span>
              <input
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="10 dígitos"
                required
              />
            </label>

            <button
              className="boton"
              type="submit"
              disabled={reserva.isPending || (llevaTalla && !talla)}
            >
              {reserva.isPending
                ? 'Apartando'
                : llevaTalla && !talla
                  ? 'Elige tu talla primero'
                  : 'Apartar esta gorra'}
            </button>

            <p className="nota-forma">
              No pagas nada ahora. La guardamos a tu nombre y la pagas cuando la recojas.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
