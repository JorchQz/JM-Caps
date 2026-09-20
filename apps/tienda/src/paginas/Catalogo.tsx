import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Categoria } from '@jm-caps/db'
import {
  TIPOS_CLIENTE,
  cargarCatalogo,
  enlaceWhatsApp,
  precioEnPesos,
  type Producto,
} from '../lib/catalogo'
import { compararTallas } from '../lib/tallas'

const TEXTO_ENTREGA =
  'Todas están físicamente en mano. La apartas hoy y te la entrego hoy mismo en Colotlán.'

type Filtros = { tipo: string | null; talla: string | null; equipo: string | null }

export function Catalogo() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo'],
    queryFn: cargarCatalogo,
  })

  const [filtros, setFiltros] = useState<Filtros>({ tipo: null, talla: null, equipo: null })
  const productos = data ?? []

  // Los filtros se arman con lo que de verdad hay: ofrecer una talla que nadie
  // tiene solo lleva al cliente a una pantalla vacía.
  const opciones = useMemo(() => {
    const tipos: string[] = []
    const tallas: string[] = []
    const equipos: string[] = []

    for (const producto of productos) {
      const tipo = producto.categoria ? TIPOS_CLIENTE[producto.categoria as Categoria] : null
      if (tipo && !tipos.includes(tipo)) tipos.push(tipo)
      if (producto.equipo && !equipos.includes(producto.equipo)) equipos.push(producto.equipo)
      for (const talla of producto.tallas_disponibles ?? []) {
        if (!tallas.includes(talla)) tallas.push(talla)
      }
    }

    return {
      tipos,
      tallas: tallas.sort(compararTallas),
      equipos: equipos.sort((a, b) => a.localeCompare(b, 'es')),
    }
  }, [productos])

  const visibles = useMemo(
    () =>
      productos.filter((producto) => {
        const tipo = producto.categoria ? TIPOS_CLIENTE[producto.categoria as Categoria] : null
        if (filtros.tipo && tipo !== filtros.tipo) return false
        if (filtros.equipo && producto.equipo !== filtros.equipo) return false
        if (filtros.talla && !(producto.tallas_disponibles ?? []).includes(filtros.talla)) {
          return false
        }
        return true
      }),
    [productos, filtros],
  )

  const piezas = productos.reduce((suma, producto) => suma + (producto.stock_disponible ?? 0), 0)
  const hayFiltros = Boolean(filtros.tipo || filtros.talla || filtros.equipo)

  function alternar(campo: keyof Filtros, valor: string) {
    setFiltros((previo) => ({ ...previo, [campo]: previo[campo] === valor ? null : valor }))
  }

  if (isLoading) return <Esqueleto />

  if (error) {
    return (
      <div className="mensaje">
        <div className="mensaje-titulo">No cargó el catálogo</div>
        <p className="mensaje-texto">
          Se cortó la conexión antes de traer las gorras. Revisa tus datos y vuelve a intentar.
        </p>
        <button type="button" className="boton-mensaje oscuro" onClick={() => void refetch()}>
          Reintentar
        </button>
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="mensaje">
        <div className="mensaje-titulo">Se está surtiendo</div>
        <p className="mensaje-texto">
          Ahorita no hay piezas en mano. Llega mercancía cada semana; escríbeme y te aviso en
          cuanto baje la caja.
        </p>
        <a
          className="boton-mensaje"
          href={enlaceWhatsApp('Hola, avísame cuando llegue mercancía nueva.')}
        >
          Avísame por WhatsApp
        </a>
      </div>
    )
  }

  return (
    <>
      <section className="portada">
        <div className="portada-cifra">
          <div className="portada-conteo">{piezas}</div>
          <div className="portada-titulo">
            {piezas === 1 ? 'gorra lista hoy' : 'gorras listas hoy'}
          </div>
        </div>
        <p className="portada-nota">{TEXTO_ENTREGA}</p>
      </section>

      <nav className="filtros" aria-label="Filtros">
        {opciones.tipos.map((valor) => (
          <Ficha
            key={valor}
            etiqueta={valor}
            activa={filtros.tipo === valor}
            alTocar={() => alternar('tipo', valor)}
          />
        ))}
        {opciones.tallas.map((valor) => (
          <Ficha
            key={valor}
            etiqueta={valor}
            activa={filtros.talla === valor}
            alTocar={() => alternar('talla', valor)}
          />
        ))}
        {opciones.equipos.map((valor) => (
          <Ficha
            key={valor}
            etiqueta={valor}
            activa={filtros.equipo === valor}
            alTocar={() => alternar('equipo', valor)}
          />
        ))}
      </nav>

      {visibles.length === 0 ? (
        <div className="mensaje">
          <div className="mensaje-titulo">Nada con esos filtros</div>
          <p className="mensaje-texto">
            Quita uno y vuelve a ver: hay {piezas} {piezas === 1 ? 'gorra' : 'gorras'} en mano
            ahorita.
          </p>
          <button
            type="button"
            className="boton-mensaje"
            onClick={() => setFiltros({ tipo: null, talla: null, equipo: null })}
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <div className="rejilla">
          {visibles.map((producto) => (
            <Tarjeta key={producto.modelo_id} producto={producto} />
          ))}
        </div>
      )}

      {hayFiltros && visibles.length > 0 ? (
        <p style={{ margin: '0 16px 24px', fontSize: 13, color: 'var(--tinta-suave)' }}>
          {visibles.length} {visibles.length === 1 ? 'modelo' : 'modelos'} con esos filtros.{' '}
          <button
            type="button"
            onClick={() => setFiltros({ tipo: null, talla: null, equipo: null })}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              color: 'var(--cobalto)',
              textDecoration: 'underline',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Quitar filtros
          </button>
        </p>
      ) : null}
    </>
  )
}

function Ficha({
  etiqueta,
  activa,
  alTocar,
}: {
  etiqueta: string
  activa: boolean
  alTocar: () => void
}) {
  return (
    <button type="button" className="ficha" aria-pressed={activa} onClick={alTocar}>
      {etiqueta}
    </button>
  )
}

function Tarjeta({ producto }: { producto: Producto }) {
  const tallas = (producto.tallas_disponibles ?? []).slice().sort(compararTallas)
  const stock = producto.stock_disponible ?? 0
  const tipo = producto.categoria ? TIPOS_CLIENTE[producto.categoria as Categoria] : null
  const meta = [producto.color, tipo].filter(Boolean).join(' · ')

  return (
    <Link className="tarjeta" to={`/gorra/${producto.modelo_id}`}>
      <div className="marco-foto">
        {producto.foto_url ? (
          <img src={producto.foto_url} alt={producto.nombre ?? 'Gorra'} loading="lazy" />
        ) : (
          <div className="sin-foto">sin foto</div>
        )}
        {stock <= 2 ? (
          <span className="escasez">{stock === 1 ? 'Última pieza' : 'Quedan 2'}</span>
        ) : null}
      </div>

      <div className="tarjeta-cuerpo">
        <div className="tarjeta-nombre">{producto.nombre}</div>
        {meta ? <div className="tarjeta-meta">{meta}</div> : null}
        <div className="tarjeta-precio">{precioEnPesos(producto.precio_venta_mxn)}</div>

        <div className="tallas-lista">
          {tallas.length === 0 ? (
            <span className="talla-ajustable">Ajustable</span>
          ) : (
            tallas.map((valor) => (
              <span className="talla-mini" key={valor}>
                {valor}
              </span>
            ))
          )}
        </div>
      </div>
    </Link>
  )
}

/** Mientras carga se muestra la forma de la pantalla, no un texto de espera. */
function Esqueleto() {
  return (
    <>
      <div className="esqueleto-titulo" />
      <div className="rejilla">
        {[0, 1, 2, 3].map((indice) => (
          <div
            key={indice}
            style={{
              background: 'var(--nieve)',
              border: '1px solid var(--gris-hondo)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div className="brillo" style={{ aspectRatio: '1 / 1' }} />
            <div style={{ padding: 8 }}>
              <div className="esqueleto-linea" />
              <div className="esqueleto-linea corta" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
