import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CATEGORIAS,
  TIPOS_DESCUENTO,
  etiquetaDescuento,
  formatearFecha,
  formatearMXN,
  ofertaVigente,
  precioEfectivo,
  type Categoria,
  type TipoDescuento,
} from '@jm-caps/db'
import {
  aplicarOferta,
  cargarInventario,
  cargarPreciosCategoria,
  guardarPrecioCategoria,
  guardarPrecios,
  llaves,
  quitarOferta,
  repreciarCategoria,
  type FilaInventario,
} from '../lib/consultas'
import {
  Aviso,
  Campo,
  Cargando,
  EncabezadoPagina,
  MensajeError,
  Vacio,
} from '../components/ui'

/**
 * Precios y ofertas.
 *
 * El **precio de lista** es lo que vale la gorra, y se edita aquí en masa en
 * vez de entrar modelo por modelo.
 *
 * Una **oferta** vive en el modelo y la ve el cliente en la tienda con el
 * precio anterior tachado. Se guarda el descuento, no el precio resultante,
 * así que si sube el precio de lista la oferta lo sigue.
 */
export function Precios() {
  return (
    <>
      <EncabezadoPagina
        titulo="Precios y ofertas"
        descripcion="Cambia el precio de varios modelos a la vez y pon rebajas que el cliente ve en la tienda con el precio anterior tachado."
        acciones={
          <Link to="/">
            <button type="button">Volver a inventario</button>
          </Link>
        }
      />

      <PreciosPorTipo />
      <TablaPrecios />
    </>
  )
}

// ---------------------------------------------------------------------------
// Precios y ofertas
// ---------------------------------------------------------------------------

function TablaPrecios() {
  const clienteQuery = useQueryClient()
  const inventario = useQuery({ queryKey: llaves.inventario, queryFn: cargarInventario })

  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [editados, setEditados] = useState<Record<string, string>>({})
  const [seleccion, setSeleccion] = useState<string[]>([])

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (inventario.data ?? []).filter((fila) => {
      if (categoria && fila.modelo.categoria !== categoria) return false
      if (!texto) return true
      const campos = [fila.modelo.nombre, fila.modelo.codigo, fila.modelo.equipo, fila.modelo.color]
      return campos.some((campo) => campo?.toLowerCase().includes(texto))
    })
  }, [inventario.data, categoria, busqueda])

  const visibles = filas.map((fila) => fila.modelo.id)
  const marcados = seleccion.filter((id) => visibles.includes(id))

  const pendientes = Object.entries(editados).filter(([id, valor]) => {
    const original = (inventario.data ?? []).find((fila) => fila.modelo.id === id)
    return original && Number(valor) > 0 && Number(valor) !== original.modelo.precio_venta_mxn
  })

  function refrescar() {
    void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
  }

  const guardar = useMutation({
    mutationFn: () =>
      guardarPrecios(pendientes.map(([id, valor]) => ({ id, precio_venta_mxn: Number(valor) }))),
    onSuccess: () => {
      setEditados({})
      refrescar()
    },
  })

  function precioDe(fila: FilaInventario): number {
    const editado = editados[fila.modelo.id]
    return editado !== undefined && Number(editado) > 0
      ? Number(editado)
      : fila.modelo.precio_venta_mxn
  }

  function alternar(id: string) {
    setSeleccion((previo) =>
      previo.includes(id) ? previo.filter((otro) => otro !== id) : [...previo, id],
    )
  }

  if (inventario.isLoading) return <Cargando />
  if (inventario.error) return <MensajeError error={inventario.error} />

  return (
    <>
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
            <option value="">Todos los tipos</option>
            {Object.values(CATEGORIAS).map((info) => (
              <option key={info.codigo} value={info.codigo}>
                {info.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <AjusteMasivo
          filas={filas}
          marcados={marcados}
          alCalcular={(calcular) => {
            setEditados((previo) => {
              const copia = { ...previo }
              const objetivo = marcados.length > 0 ? marcados : visibles
              for (const id of objetivo) {
                const fila = filas.find((otra) => otra.modelo.id === id)
                if (fila) copia[id] = String(calcular(fila.modelo.precio_venta_mxn))
              }
              return copia
            })
          }}
        />

        {filas.length === 0 ? (
          <Vacio>Ningún modelo coincide con ese filtro.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los visibles"
                      checked={marcados.length === visibles.length && visibles.length > 0}
                      onChange={(evento) =>
                        setSeleccion(evento.target.checked ? visibles : [])
                      }
                    />
                  </th>
                  <th>Modelo</th>
                  <th className="numero">Precio de lista</th>
                  <th>Oferta</th>
                  <th className="numero">Se cobra</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const lista = precioDe(fila)
                  const final = precioEfectivo(lista, fila.modelo)
                  const conOferta = ofertaVigente(fila.modelo)

                  return (
                    <tr key={fila.modelo.id}>
                      <td className="acciones">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${fila.modelo.nombre}`}
                          checked={seleccion.includes(fila.modelo.id)}
                          onChange={() => alternar(fila.modelo.id)}
                        />
                      </td>
                      <td className="principal">
                        <Link to={`/modelo/${fila.modelo.id}`}>{fila.modelo.nombre}</Link>
                        <div className="tenue" style={{ fontSize: '0.83rem' }}>
                          <span className="mono">{fila.modelo.codigo}</span> ·{' '}
                          {CATEGORIAS[fila.modelo.categoria].etiqueta} · {fila.disponibles} en stock
                        </div>
                      </td>
                      <td className="numero" data-etiqueta="Precio de lista">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editados[fila.modelo.id] ?? String(fila.modelo.precio_venta_mxn)}
                          style={{ width: 96, textAlign: 'right' }}
                          onChange={(evento) =>
                            setEditados((previo) => ({
                              ...previo,
                              [fila.modelo.id]: evento.target.value,
                            }))
                          }
                        />
                      </td>
                      <td data-etiqueta="Oferta">
                        {conOferta && fila.modelo.oferta_tipo && fila.modelo.oferta_valor ? (
                          <>
                            <span className="insignia exito">
                              {etiquetaDescuento(fila.modelo.oferta_tipo, fila.modelo.oferta_valor)}
                            </span>
                            {fila.modelo.oferta_hasta ? (
                              <div className="tenue" style={{ fontSize: '0.78rem' }}>
                                hasta {formatearFecha(fila.modelo.oferta_hasta)}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <span className="tenue">Sin oferta</span>
                        )}
                      </td>
                      <td className="numero" data-etiqueta="Se cobra">
                        <strong>{formatearMXN(final)}</strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <MensajeError error={guardar.error} />

        {pendientes.length > 0 ? (
          <div className="fila-separada" style={{ marginTop: 14 }}>
            <span className="tenue">{pendientes.length} precio(s) por guardar.</span>
            <div className="fila" style={{ gap: 6 }}>
              <button type="button" className="discreto" onClick={() => setEditados({})}>
                Descartar
              </button>
              <button
                type="button"
                className="principal"
                disabled={guardar.isPending}
                onClick={() => guardar.mutate()}
              >
                {guardar.isPending ? 'Guardando' : `Guardar ${pendientes.length} precio(s)`}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <FormularioOferta
        marcados={marcados}
        visibles={visibles}
        alTerminar={() => {
          setSeleccion([])
          refrescar()
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------

/**
 * Cambia muchos precios de golpe sin guardarlos todavía: escribe los valores
 * en la tabla para poder revisarlos antes de confirmar. Un error de dedo en un
 * ajuste masivo se arregla descartando, no yendo modelo por modelo.
 */
function AjusteMasivo({
  filas,
  marcados,
  alCalcular,
}: {
  filas: FilaInventario[]
  marcados: string[]
  alCalcular: (calcular: (precio: number) => number) => void
}) {
  const [modo, setModo] = useState<'fijo' | 'porcentaje' | 'monto'>('fijo')
  const [valor, setValor] = useState('')

  const alcance = marcados.length > 0 ? marcados.length : filas.length
  const numero = Number(valor)
  const listo = valor.trim() !== '' && Number.isFinite(numero) && numero !== 0

  function aplicar() {
    if (!listo) return
    alCalcular((precio) => {
      if (modo === 'fijo') return Math.max(Math.round(numero), 1)
      if (modo === 'porcentaje') return Math.max(Math.round(precio * (1 + numero / 100)), 1)
      return Math.max(Math.round(precio + numero), 1)
    })
    setValor('')
  }

  if (filas.length === 0) return null

  return (
    <div className="aviso" style={{ marginBottom: 14 }}>
      <div className="fila" style={{ alignItems: 'flex-end', gap: 8 }}>
        <Campo etiqueta="Ajuste masivo">
          <select
            value={modo}
            onChange={(evento) => setModo(evento.target.value as typeof modo)}
            style={{ minWidth: 150 }}
          >
            <option value="fijo">Dejar todos en</option>
            <option value="porcentaje">Cambiar un porcentaje</option>
            <option value="monto">Sumar o restar pesos</option>
          </select>
        </Campo>

        <Campo etiqueta={modo === 'porcentaje' ? 'Porcentaje' : 'Pesos'}>
          <input
            type="number"
            step="1"
            value={valor}
            placeholder={modo === 'porcentaje' ? '10 sube, -10 baja' : modo === 'monto' ? '-20' : '419'}
            style={{ width: 130 }}
            onChange={(evento) => setValor(evento.target.value)}
          />
        </Campo>

        <button type="button" disabled={!listo} onClick={aplicar} style={{ marginBottom: 14 }}>
          Aplicar a {alcance}
        </button>
      </div>

      <span className="tenue" style={{ fontSize: '0.83rem' }}>
        {marcados.length > 0
          ? `Se escribe en los ${marcados.length} modelo(s) seleccionados.`
          : 'Sin selección se escribe en todos los modelos que el filtro deja a la vista.'}{' '}
        Todavía no se guarda: revisa la tabla y confirma abajo.
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FormularioOferta({
  marcados,
  visibles,
  alTerminar,
}: {
  marcados: string[]
  visibles: string[]
  alTerminar: () => void
}) {
  const [tipo, setTipo] = useState<TipoDescuento>('porcentaje')
  const [valor, setValor] = useState('')
  const [hasta, setHasta] = useState('')
  const [nota, setNota] = useState('')

  const objetivo = marcados.length > 0 ? marcados : visibles

  const poner = useMutation({
    mutationFn: () =>
      aplicarOferta(objetivo, {
        tipo,
        valor: Number(valor),
        // La fecha se guarda al final de ese día: si escribe el domingo, la
        // oferta dura todo el domingo.
        hasta: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : null,
        nota: nota.trim() || null,
      }),
    onSuccess: () => {
      setValor('')
      setNota('')
      alTerminar()
    },
  })

  const quitar = useMutation({
    mutationFn: () => quitarOferta(objetivo),
    onSuccess: alTerminar,
  })

  const numero = Number(valor)
  const listo = objetivo.length > 0 && Number.isFinite(numero) && numero > 0

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 4 }}>Oferta</h2>
      <p className="tenue" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        La ve el cliente en la tienda con el precio anterior tachado. Se guarda el descuento, no el
        precio rebajado, así que si luego subes el precio de lista la oferta lo sigue.
      </p>

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          poner.mutate()
        }}
      >
        <div className="rejilla">
          <Campo etiqueta="Tipo de descuento">
            <select value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoDescuento)}>
              {Object.entries(TIPOS_DESCUENTO).map(([clave, texto]) => (
                <option key={clave} value={clave}>
                  {texto}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta={tipo === 'porcentaje' ? 'Porcentaje de descuento' : 'Pesos de descuento'}
            ayuda={tipo === 'porcentaje' ? 'Máximo 90.' : undefined}
          >
            <input
              type="number"
              min="1"
              max={tipo === 'porcentaje' ? 90 : undefined}
              step="1"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              required
            />
          </Campo>

          <Campo etiqueta="Vence el" ayuda="Opcional. Sin fecha dura hasta que la quites.">
            <input type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} />
          </Campo>

          <Campo etiqueta="Nota interna" ayuda="No se muestra al cliente.">
            <input
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
              placeholder="Buen Fin"
            />
          </Campo>
        </div>

        <MensajeError error={poner.error} />
        <MensajeError error={quitar.error} />
        {poner.isSuccess ? <Aviso tipo="exito">Oferta aplicada.</Aviso> : null}
        {quitar.isSuccess ? <Aviso tipo="exito">Oferta quitada.</Aviso> : null}

        <div className="fila" style={{ gap: 8 }}>
          <button type="submit" className="principal" disabled={!listo || poner.isPending}>
            {poner.isPending ? 'Aplicando' : `Poner oferta a ${objetivo.length} modelo(s)`}
          </button>
          <button
            type="button"
            className="discreto"
            disabled={objetivo.length === 0 || quitar.isPending}
            onClick={() => quitar.mutate()}
          >
            Quitar oferta a {objetivo.length}
          </button>
        </div>

        <p className="tenue" style={{ fontSize: '0.83rem', marginBottom: 0 }}>
          {marcados.length > 0
            ? `Aplica a los ${marcados.length} modelo(s) seleccionados arriba.`
            : 'Sin selección aplica a todos los modelos que el filtro deja a la vista.'}
        </p>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Precio por tipo de gorra
// ---------------------------------------------------------------------------

/**
 * El precio con el que nace un producto nuevo de cada tipo.
 *
 * Se separa del precio de cada gorra a propósito. Cambiar el número de aquí no
 * reprecia lo que ya está en catálogo: eso es un acto aparte, con su propio
 * botón, porque bajarle el precio a treinta gorras sin querer es caro.
 */
function PreciosPorTipo() {
  const clienteQuery = useQueryClient()

  const precios = useQuery({
    queryKey: llaves.preciosCategoria,
    queryFn: cargarPreciosCategoria,
  })
  const inventario = useQuery({ queryKey: llaves.inventario, queryFn: cargarInventario })

  const [editados, setEditados] = useState<Partial<Record<Categoria, string>>>({})

  function refrescar() {
    void clienteQuery.invalidateQueries({ queryKey: llaves.preciosCategoria })
    void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
  }

  const guardar = useMutation({
    mutationFn: ({ categoria, precio }: { categoria: Categoria; precio: number }) =>
      guardarPrecioCategoria(categoria, precio),
    onSuccess: (_datos, variables) => {
      setEditados((previo) => {
        const copia = { ...previo }
        delete copia[variables.categoria]
        return copia
      })
      refrescar()
    },
  })

  const repreciar = useMutation({
    mutationFn: ({ categoria, precio }: { categoria: Categoria; precio: number }) =>
      repreciarCategoria(categoria, precio),
    onSuccess: refrescar,
  })

  function cuantos(categoria: Categoria): number {
    return (inventario.data ?? []).filter((fila) => fila.modelo.categoria === categoria).length
  }

  if (precios.isLoading) return <Cargando />

  return (
    <div className="tarjeta">
      <h2 style={{ marginBottom: 4 }}>Precio por tipo de gorra</h2>
      <p className="tenue" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        Con este precio nace cada producto nuevo, para no teclearlo una y otra vez. Guardarlo no
        cambia lo que ya está en catálogo; para eso está el botón de aplicar.
      </p>

      <MensajeError error={precios.error} />
      <MensajeError error={guardar.error} />
      <MensajeError error={repreciar.error} />

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th className="numero">Precio</th>
              <th className="numero">Modelos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Object.values(CATEGORIAS).map((info) => {
              const vigente = precios.data?.[info.codigo]
              const valor = editados[info.codigo] ?? (vigente != null ? String(vigente) : '')
              const numero = Number(valor)
              const cambiado = valor !== '' && numero > 0 && numero !== vigente
              const modelos = cuantos(info.codigo)

              return (
                <tr key={info.codigo}>
                  <td className="principal">
                    <strong>{info.etiqueta}</strong>
                    {info.pausada ? (
                      <div className="tenue" style={{ fontSize: '0.83rem' }}>
                        Pausada: no se compra por ahora.
                      </div>
                    ) : null}
                  </td>
                  <td className="numero" data-etiqueta="Precio">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={valor}
                      style={{ width: 96, textAlign: 'right' }}
                      onChange={(evento) =>
                        setEditados((previo) => ({ ...previo, [info.codigo]: evento.target.value }))
                      }
                    />
                  </td>
                  <td className="numero" data-etiqueta="Modelos">
                    {modelos}
                  </td>
                  <td className="acciones">
                    <div className="fila" style={{ justifyContent: 'flex-end', gap: 4 }}>
                      {cambiado ? (
                        <button
                          type="button"
                          className="principal"
                          disabled={guardar.isPending}
                          onClick={() => guardar.mutate({ categoria: info.codigo, precio: numero })}
                        >
                          Guardar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="discreto"
                        disabled={modelos === 0 || numero <= 0 || repreciar.isPending}
                        onClick={() => {
                          const texto = `Poner ${formatearMXN(numero)} a los ${modelos} modelo(s) de tipo ${info.codigo}. Se pierde el precio que tengan ahora.`
                          if (confirm(texto)) {
                            repreciar.mutate({ categoria: info.codigo, precio: numero })
                          }
                        }}
                      >
                        Aplicar a los {modelos}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
