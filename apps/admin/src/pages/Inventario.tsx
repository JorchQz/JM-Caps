import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CATEGORIAS, formatearMXN, type Categoria } from '@jm-caps/db'
import { cargarInventario, llaves, type FilaInventario } from '../lib/consultas'
import { Cargando, EncabezadoPagina, MensajeError, Vacio } from '../components/ui'

type Filtro = 'todos' | 'con_stock' | 'sin_stock'

export function Inventario() {
  const { data, isLoading, error } = useQuery({
    queryKey: llaves.inventario,
    queryFn: cargarInventario,
  })

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (data ?? []).filter((fila) => {
      if (categoria && fila.modelo.categoria !== categoria) return false
      if (filtro === 'con_stock' && fila.disponibles === 0) return false
      if (filtro === 'sin_stock' && fila.disponibles > 0) return false
      if (!texto) return true
      const campos = [
        fila.modelo.nombre,
        fila.modelo.color ?? '',
        fila.modelo.equipo ?? '',
        fila.modelo.codigo,
      ]
      return campos.some((campo) => campo.toLowerCase().includes(texto))
    })
  }, [data, busqueda, categoria, filtro])

  const totales = useMemo(() => {
    const base = { disponibles: 0, apartadas: 0, enCamino: 0, valor: 0 }
    for (const fila of data ?? []) {
      base.disponibles += fila.disponibles
      base.apartadas += fila.apartadas
      base.enCamino += fila.enCamino
      base.valor += fila.disponibles * fila.modelo.precio_venta_mxn
    }
    return base
  }, [data])

  return (
    <>
      <EncabezadoPagina
        titulo="Inventario"
        descripcion="Modelos dados de alta y las piezas físicas de cada uno. El catálogo público solo muestra los que tienen disponibles mayor a cero."
        acciones={
          <>
            <Link to="/precios">
              <button type="button">Precios y ofertas</button>
            </Link>
            <Link to="/productos">
              <button type="button" className="principal">
                Registrar productos
              </button>
            </Link>
          </>
        }
      />

      <MensajeError error={error} />

      <div className="rejilla indicadores" style={{ marginBottom: 18 }}>
        <Indicador titulo="Disponibles" valor={String(totales.disponibles)} />
        <Indicador titulo="Apartadas" valor={String(totales.apartadas)} />
        <Indicador titulo="En camino" valor={String(totales.enCamino)} />
        <Indicador
          titulo="Valor a precio de lista"
          valor={formatearMXN(totales.valor)}
          nota="Solo unidades disponibles"
        />
      </div>

      <div className="tarjeta">
        <div className="fila" style={{ marginBottom: 14 }}>
          <input
            type="search"
            placeholder="Buscar por nombre, equipo, color o código"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            style={{ flex: '1 1 220px' }}
          />
          <select
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value as Categoria | '')}
            style={{ flex: '0 1 220px' }}
          >
            <option value="">Todas las categorías</option>
            {Object.values(CATEGORIAS).map((info) => (
              <option key={info.codigo} value={info.codigo}>
                {info.etiqueta}
              </option>
            ))}
          </select>
          <select
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value as Filtro)}
            style={{ flex: '0 1 180px' }}
          >
            <option value="todos">Todo el catálogo</option>
            <option value="con_stock">Con stock</option>
            <option value="sin_stock">Agotados</option>
          </select>
        </div>

        {isLoading ? (
          <Cargando />
        ) : filas.length === 0 ? (
          <Vacio>
            No hay modelos que coincidan. Captura productos desde Registrar productos.
          </Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Foto</th>
                  <th>Modelo</th>
                  <th>Tallas disponibles</th>
                  <th className="numero">Precio</th>
                  <th className="numero">Disp.</th>
                  <th className="numero">Apart.</th>
                  <th className="numero">Vend.</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <FilaModelo key={fila.modelo.id} fila={fila} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function FilaModelo({ fila }: { fila: FilaInventario }) {
  const { modelo } = fila
  const conStock = fila.tallas.filter((talla) => talla.disponibles > 0)

  return (
    <tr>
      <td className="principal foto">
        {modelo.foto_url ? (
          <img className="miniatura" src={modelo.foto_url} alt="" loading="lazy" />
        ) : (
          <div className="miniatura" />
        )}
      </td>
      <td className="principal">
        <Link to={`/modelo/${modelo.id}`} style={{ fontWeight: 600 }}>
          {modelo.nombre}
        </Link>
        <div className="tenue" style={{ fontSize: '0.83rem' }}>
          <span className="mono">{modelo.codigo}</span>
          {modelo.equipo ? ` · ${modelo.equipo}` : ''}
          {modelo.color ? ` · ${modelo.color}` : ''}
          {modelo.activo ? '' : ' · inactivo'}
        </div>
      </td>
      <td data-etiqueta="Tallas">
        {conStock.length === 0 ? (
          <span className="tenue">Agotado</span>
        ) : (
          <div className="fila" style={{ gap: 6 }}>
            {conStock.map((talla) => (
              <span key={talla.talla ?? 'ajustable'} className="insignia">
                {talla.talla ?? 'Ajustable'} · {talla.disponibles}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="numero" data-etiqueta="Precio">{formatearMXN(modelo.precio_venta_mxn)}</td>
      <td className="numero" data-etiqueta="Disponibles">{fila.disponibles}</td>
      <td className="numero" data-etiqueta="Apartadas">{fila.apartadas}</td>
      <td className="numero" data-etiqueta="Vendidas">{fila.vendidas}</td>
    </tr>
  )
}

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="tarjeta">
      <div className="tenue" style={{ fontSize: '0.82rem' }}>
        {titulo}
      </div>
      <div className="numero" style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 2 }}>
        {valor}
      </div>
      {nota ? (
        <div className="tenue" style={{ fontSize: '0.78rem' }}>
          {nota}
        </div>
      ) : null}
    </div>
  )
}
