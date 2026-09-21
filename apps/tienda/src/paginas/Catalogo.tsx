import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Categoria } from '@jm-caps/db'
import {
  TIPOS_CLIENTE,
  cargarCatalogo,
  enlaceWhatsApp,
  precioEnPesos,
  preciosDe,
  type Producto,
} from '../lib/catalogo'
import { compararTallas } from '../lib/tallas'
import {
  ROTULOS,
  SIN_FILTROS,
  alternar,
  cuantosFiltros,
  estaActivo,
  filtrar,
  opcionesDe,
  type Dimension,
  type Seleccion,
} from '../lib/filtros'

const TEXTO_ENTREGA =
  'Todas están físicamente en mano. La apartas hoy y te la entregamos hoy mismo en Colotlán.'

/** Arriba de esto, un grupo se recorta y ofrece abrirse. */
const OPCIONES_A_LA_VISTA = 8

export function Catalogo() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['catalogo'],
    queryFn: cargarCatalogo,
  })

  const [filtros, setFiltros] = useState<Seleccion>(SIN_FILTROS)
  const [abiertos, setAbiertos] = useState<Dimension[]>([])
  const productos = data ?? []

  // Los filtros se arman con lo que de verdad hay: ofrecer una talla que nadie
  // tiene solo lleva al cliente a una pantalla vacía.
  const grupos = useMemo(() => opcionesDe(productos, filtros), [productos, filtros])
  const visibles = useMemo(() => filtrar(productos, filtros), [productos, filtros])

  const piezas = productos.reduce((suma, producto) => suma + (producto.stock_disponible ?? 0), 0)
  const cuantos = cuantosFiltros(filtros)

  function limpiar() {
    setFiltros(SIN_FILTROS)
    setAbiertos([])
  }

  if (isLoading) return <Esqueleto />

  if (error) {
    return (
      <div className="mensaje">
        <div className="mensaje-titulo">No pudimos cargar el catálogo</div>
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
        <div className="mensaje-titulo">Estamos surtiendo</div>
        <p className="mensaje-texto">
          Por ahora no tenemos piezas disponibles. Recibimos mercancía cada semana. Escríbenos y te
          avisamos en cuanto llegue.
        </p>
        <a
          className="boton-mensaje"
          href={enlaceWhatsApp('Hola, avísenme cuando llegue mercancía nueva.')}
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

      <section className="filtros" aria-label="Filtros">
        {grupos.map((grupo) => {
          const abierto = abiertos.includes(grupo.dimension)
          const recortado = !abierto && grupo.opciones.length > OPCIONES_A_LA_VISTA
          const alaVista = recortado ? grupo.opciones.slice(0, OPCIONES_A_LA_VISTA) : grupo.opciones
          const ocultas = grupo.opciones.length - alaVista.length

          return (
            <div className="filtros-grupo" key={grupo.dimension}>
              <div className="filtros-rotulo" id={`rotulo-${grupo.dimension}`}>
                {ROTULOS[grupo.dimension]}
              </div>

              <div className="filtros-fila" role="group" aria-labelledby={`rotulo-${grupo.dimension}`}>
                {alaVista.map((opcion) => (
                  <Ficha
                    key={opcion.valor}
                    etiqueta={opcion.valor}
                    cuantas={opcion.cuantas}
                    activa={estaActivo(filtros, grupo.dimension, opcion.valor)}
                    alTocar={() =>
                      setFiltros((previo) => alternar(previo, grupo.dimension, opcion.valor))
                    }
                  />
                ))}

                {recortado ? (
                  <button
                    type="button"
                    className="ficha ficha-mas"
                    onClick={() => setAbiertos((previo) => [...previo, grupo.dimension])}
                  >
                    {ocultas} más
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}

        {cuantos > 0 ? (
          <button type="button" className="limpiar-filtros" onClick={limpiar}>
            Quitar {cuantos === 1 ? 'el filtro' : `los ${cuantos} filtros`}
          </button>
        ) : null}
      </section>

      {visibles.length === 0 ? (
        <div className="mensaje">
          <div className="mensaje-titulo">Nada con esos filtros</div>
          <p className="mensaje-texto">
            Quita uno y vuelve a ver: hay {piezas} {piezas === 1 ? 'gorra' : 'gorras'} disponibles
            en total.
          </p>
          <button type="button" className="boton-mensaje" onClick={limpiar}>
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

      {cuantos > 0 && visibles.length > 0 ? (
        <p className="conteo-filtrado">
          {visibles.length} {visibles.length === 1 ? 'modelo' : 'modelos'} con esos filtros.{' '}
          <button type="button" className="enlace" onClick={limpiar}>
            Ver todo
          </button>
        </p>
      ) : null}
    </>
  )
}

function Ficha({
  etiqueta,
  cuantas,
  activa,
  alTocar,
}: {
  etiqueta: string
  cuantas?: number
  activa: boolean
  alTocar: () => void
}) {
  return (
    <button type="button" className="ficha" aria-pressed={activa} onClick={alTocar}>
      {etiqueta}
      {cuantas !== undefined ? <span className="ficha-conteo">{cuantas}</span> : null}
    </button>
  )
}

function Tarjeta({ producto }: { producto: Producto }) {
  const tallas = (producto.tallas_disponibles ?? []).slice().sort(compararTallas)
  const stock = producto.stock_disponible ?? 0
  const tipo = producto.categoria ? TIPOS_CLIENTE[producto.categoria as Categoria] : null
  const meta = [producto.color, tipo].filter(Boolean).join(' · ')
  const precios = preciosDe(producto)

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
        {precios.hayOferta ? <span className="marca-oferta">Rebajada</span> : null}
      </div>

      <div className="tarjeta-cuerpo">
        <div className="tarjeta-nombre">{producto.nombre}</div>
        {meta ? <div className="tarjeta-meta">{meta}</div> : null}
        <div className="tarjeta-precio">
          {precios.hayOferta ? (
            <span className="precio-antes">{precioEnPesos(precios.lista)}</span>
          ) : null}
          {precioEnPesos(precios.final)}
        </div>

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
