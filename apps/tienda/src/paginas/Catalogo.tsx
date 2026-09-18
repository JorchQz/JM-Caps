import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Categoria } from '@jm-caps/db'
import {
  FILTROS_TIPO,
  cargarCatalogo,
  precioEnPesos,
  type Producto,
} from '../lib/catalogo'

export function Catalogo() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['catalogo'],
    queryFn: cargarCatalogo,
  })

  const [tipo, setTipo] = useState<string | null>(null)
  const [talla, setTalla] = useState<string | null>(null)
  const [equipo, setEquipo] = useState<string | null>(null)

  const productos = data ?? []

  // Los filtros se arman con lo que de verdad hay en existencia. Ofrecer una
  // talla que nadie tiene solo lleva al cliente a una pantalla vacía.
  const tallasDisponibles = useMemo(() => {
    const juego = new Set<string>()
    for (const producto of productos) {
      for (const valor of producto.tallas_disponibles ?? []) juego.add(valor)
    }
    return [...juego].sort(compararTallas)
  }, [productos])

  const equiposDisponibles = useMemo(() => {
    const juego = new Set<string>()
    for (const producto of productos) {
      if (producto.equipo) juego.add(producto.equipo)
    }
    return [...juego].sort((a, b) => a.localeCompare(b, 'es'))
  }, [productos])

  const tiposDisponibles = useMemo(
    () =>
      FILTROS_TIPO.filter((filtro) =>
        productos.some(
          (producto) =>
            producto.categoria && filtro.categorias.includes(producto.categoria as Categoria),
        ),
      ),
    [productos],
  )

  const visibles = useMemo(
    () =>
      productos.filter((producto) => {
        if (tipo) {
          const filtro = FILTROS_TIPO.find((opcion) => opcion.etiqueta === tipo)
          if (
            !filtro ||
            !producto.categoria ||
            !filtro.categorias.includes(producto.categoria as Categoria)
          ) {
            return false
          }
        }
        if (talla && !(producto.tallas_disponibles ?? []).includes(talla)) return false
        if (equipo && producto.equipo !== equipo) return false
        return true
      }),
    [productos, tipo, talla, equipo],
  )

  const hayFiltros = Boolean(tipo || talla || equipo)
  const piezas = productos.reduce((suma, producto) => suma + (producto.stock_disponible ?? 0), 0)

  function limpiar() {
    setTipo(null)
    setTalla(null)
    setEquipo(null)
  }

  if (error) {
    return (
      <p className="mensaje">
        <strong>No cargó el catálogo</strong>
        Revisa tu conexión y vuelve a intentar.
      </p>
    )
  }

  if (isLoading) {
    return <p className="mensaje">Cargando gorras...</p>
  }

  if (productos.length === 0) {
    return (
      <div className="mensaje">
        <strong>Estamos surtiendo</strong>
        Ahorita no hay gorras en existencia. Vuelve en unos días.
      </div>
    )
  }

  return (
    <>
      <section className="portada">
        <h1 className="portada-conteo">
          {piezas} {piezas === 1 ? 'gorra lista' : 'gorras listas'} hoy
        </h1>
        <p className="portada-nota">
          Todas están aquí, físicamente. Apartas la tuya y la recoges el mismo día en Colotlán o
          Tepatitlán.
        </p>
      </section>

      <section className="filtros" aria-label="Filtros">
        <div className="filtros-carril">
          {tiposDisponibles.map((filtro) => (
            <button
              key={filtro.etiqueta}
              type="button"
              className="ficha"
              aria-pressed={tipo === filtro.etiqueta}
              onClick={() => setTipo(tipo === filtro.etiqueta ? null : filtro.etiqueta)}
            >
              {filtro.etiqueta}
            </button>
          ))}

          {tallasDisponibles.map((valor) => (
            <button
              key={valor}
              type="button"
              className="ficha"
              aria-pressed={talla === valor}
              onClick={() => setTalla(talla === valor ? null : valor)}
            >
              Talla {valor}
            </button>
          ))}

          {equiposDisponibles.map((valor) => (
            <button
              key={valor}
              type="button"
              className="ficha"
              aria-pressed={equipo === valor}
              onClick={() => setEquipo(equipo === valor ? null : valor)}
            >
              {valor}
            </button>
          ))}
        </div>

        {hayFiltros ? (
          <div className="filtros-resumen">
            <span>
              {visibles.length} {visibles.length === 1 ? 'modelo' : 'modelos'}
            </span>
            <button type="button" className="enlace-limpiar" onClick={limpiar}>
              Quitar filtros
            </button>
          </div>
        ) : null}
      </section>

      {visibles.length === 0 ? (
        <div className="mensaje">
          <strong>Nada con esos filtros</strong>
          Prueba con otra talla, o quita los filtros para ver todo lo que hay.
        </div>
      ) : (
        <div className="rejilla">
          {visibles.map((producto) => (
            <Tarjeta key={producto.modelo_id} producto={producto} />
          ))}
        </div>
      )}
    </>
  )
}

function Tarjeta({ producto }: { producto: Producto }) {
  const tallas = (producto.tallas_disponibles ?? []).slice().sort(compararTallas)
  const stock = producto.stock_disponible ?? 0

  return (
    <Link className="tarjeta" to={`/gorra/${producto.modelo_id}`}>
      <div className="tarjeta-foto">
        {producto.foto_url ? (
          <img src={producto.foto_url} alt={producto.nombre ?? 'Gorra'} loading="lazy" />
        ) : (
          <div className="sin-foto">Foto en camino</div>
        )}
        {stock === 1 ? <span className="marca-ultima">Última</span> : null}
        {stock === 2 ? <span className="marca-ultima">Quedan 2</span> : null}
      </div>

      <div className="tarjeta-cuerpo">
        <div className="tarjeta-nombre">{producto.nombre}</div>
        {producto.color ? <div className="tarjeta-detalle">{producto.color}</div> : null}
        <div className="precio">{precioEnPesos(producto.precio_venta_mxn)}</div>

        <div className="tallas">
          {tallas.length === 0 ? (
            <span className="talla talla-ajustable">Ajustable</span>
          ) : (
            tallas.map((valor) => (
              <span className="talla" key={valor}>
                {valor}
              </span>
            ))
          )}
        </div>
      </div>
    </Link>
  )
}

/** Ordena 7, 7 1/8, 7 1/4... como números, no como texto. */
export function compararTallas(a: string, b: string): number {
  return valorDeTalla(a) - valorDeTalla(b)
}

function valorDeTalla(talla: string): number {
  const [entero, fraccion] = talla.trim().split(' ')
  const base = Number(entero)
  if (Number.isNaN(base)) return Number.POSITIVE_INFINITY
  if (!fraccion) return base

  const [arriba, abajo] = fraccion.split('/').map(Number)
  if (!arriba || !abajo) return base
  return base + arriba / abajo
}
