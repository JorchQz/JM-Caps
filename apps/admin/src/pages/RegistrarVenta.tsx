import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CANALES_VENTA,
  METODOS_PAGO,
  formatearMXN,
  telefonoWhatsApp,
  type CanalVenta,
  type MetodoPago,
} from '@jm-caps/db'
import {
  llaves,
  registrarVenta,
  unidadesVendibles,
  type UnidadConModelo,
} from '../lib/consultas'
import { Aviso, Campo, Cargando, EncabezadoPagina, MensajeError, Vacio } from '../components/ui'
import { EscanerQR } from '../components/EscanerQR'

export function RegistrarVenta() {
  const clienteQuery = useQueryClient()
  const campoBusqueda = useRef<HTMLInputElement>(null)

  const [busqueda, setBusqueda] = useState('')
  const [escaneando, setEscaneando] = useState(false)
  const [avisoEscaneo, setAvisoEscaneo] = useState<string | null>(null)
  const [carrito, setCarrito] = useState<UnidadConModelo[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [canal, setCanal] = useState<CanalVenta>('local_colotlan')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [ultimaVenta, setUltimaVenta] = useState<{ total: number; piezas: number } | null>(null)

  const vendibles = useQuery({ queryKey: ['vendibles'], queryFn: unidadesVendibles })

  const enCarrito = useMemo(() => new Set(carrito.map((unidad) => unidad.id)), [carrito])

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return []
    return (vendibles.data ?? [])
      .filter((unidad) => {
        if (enCarrito.has(unidad.id)) return false
        return (
          unidad.folio.includes(texto) ||
          unidad.modelo.nombre.toLowerCase().includes(texto) ||
          unidad.modelo.codigo.toLowerCase().includes(texto) ||
          (unidad.modelo.color ?? '').toLowerCase().includes(texto)
        )
      })
      .slice(0, 12)
  }, [busqueda, vendibles.data, enCarrito])

  const total = carrito.reduce((suma, unidad) => suma + unidad.modelo.precio_venta_mxn, 0)

  function agregar(unidad: UnidadConModelo) {
    setCarrito((previo) => (previo.some((x) => x.id === unidad.id) ? previo : [...previo, unidad]))
    setBusqueda('')
    // Con la cámara abierta, enfocar el campo levantaría el teclado encima del
    // visor justo cuando se está apuntando a la siguiente gorra.
    if (!escaneando) campoBusqueda.current?.focus()
  }

  function quitar(id: string) {
    setCarrito((previo) => previo.filter((unidad) => unidad.id !== id))
  }

  /** El lector de códigos escribe el id completo y manda Enter. */
  function alEnviarBusqueda(evento: FormEvent) {
    evento.preventDefault()
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return

    const exacta = (vendibles.data ?? []).find((unidad) => unidad.folio === texto)
    if (exacta) {
      agregar(exacta)
      return
    }
    if (resultados.length === 1 && resultados[0]) agregar(resultados[0])
  }

  const venta = useMutation({
    mutationFn: () =>
      registrarVenta({
        unidadIds: carrito.map((unidad) => unidad.id),
        metodo_pago: metodoPago,
        canal,
        cliente_nombre: nombre.trim() || null,
        cliente_telefono: telefono.trim() || null,
        notas: notas.trim() || null,
      }),
    onSuccess: () => {
      setUltimaVenta({ total, piezas: carrito.length })
      setCarrito([])
      setNombre('')
      setTelefono('')
      setNotas('')
      void vendibles.refetch()
      void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
      void clienteQuery.invalidateQueries({ queryKey: llaves.apartados })
      void clienteQuery.invalidateQueries({ queryKey: llaves.ventas })
    },
  })

  const apartadasEnCarrito = carrito.filter((unidad) => unidad.estado === 'apartada')

  return (
    <>
      <EncabezadoPagina
        titulo="Registrar venta"
        descripcion="Escanea el código de cada gorra o búscala por nombre. Se cobra la pieza exacta, así el inventario y la talla quedan correctos."
      />

      {ultimaVenta ? (
        <Aviso tipo="exito">
          Venta registrada: {ultimaVenta.piezas} pieza(s) por {formatearMXN(ultimaVenta.total)}.
        </Aviso>
      ) : null}

      <div className="tarjeta">
        <form onSubmit={alEnviarBusqueda}>
          <Campo
            etiqueta="Escanear o buscar pieza"
            ayuda="Escanea con la cámara, teclea el folio de la etiqueta, o busca por nombre del modelo."
          >
            <div className="fila">
              <input
                ref={campoBusqueda}
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Folio o nombre del modelo"
                inputMode="numeric"
                style={{ flex: '1 1 200px' }}
                autoFocus
              />
              <button
                type="button"
                className={escaneando ? '' : 'principal'}
                onClick={() => {
                  setAvisoEscaneo(null)
                  setEscaneando(!escaneando)
                }}
              >
                {escaneando ? 'Cerrar cámara' : 'Escanear'}
              </button>
            </div>
          </Campo>
        </form>

        {escaneando ? (
          <EscanerQR
            alCerrar={() => setEscaneando(false)}
            alLeer={(texto) => {
              const folio = texto.trim()
              const unidad = (vendibles.data ?? []).find((pieza) => pieza.folio === folio)

              if (!unidad) {
                setAvisoEscaneo(
                  `El folio ${folio} no está disponible para venta. Puede que ya se haya vendido o que la etiqueta sea de otra tienda.`,
                )
                return
              }
              if (enCarrito.has(unidad.id)) {
                setAvisoEscaneo(`${unidad.modelo.nombre} (folio ${folio}) ya está en la venta.`)
                return
              }

              setAvisoEscaneo(`Agregada: ${unidad.modelo.nombre} · folio ${folio}`)
              agregar(unidad)
            }}
          />
        ) : null}

        {avisoEscaneo ? <Aviso>{avisoEscaneo}</Aviso> : null}

        {vendibles.isLoading ? <Cargando texto="Cargando piezas" /> : null}
        <MensajeError error={vendibles.error} />

        {resultados.length > 0 ? (
          <div className="tabla-contenedor">
            <table>
              <tbody>
                {resultados.map((unidad) => (
                  <tr key={unidad.id}>
                    <td>
                      <strong>{unidad.modelo.nombre}</strong>
                      <div className="tenue" style={{ fontSize: '0.83rem' }}>
                        <span className="mono">{unidad.modelo.codigo}</span> ·{' '}
                        {unidad.talla ?? 'Ajustable'}
                        {unidad.estado === 'apartada'
                          ? ` · apartada por ${unidad.apartado_nombre ?? 'cliente'}`
                          : ''}
                      </div>
                    </td>
                    <td className="numero">{formatearMXN(unidad.modelo.precio_venta_mxn)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" onClick={() => agregar(unidad)}>
                        Agregar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : busqueda.trim() && !vendibles.isLoading ? (
          <Vacio>Ninguna pieza disponible coincide con esa búsqueda.</Vacio>
        ) : null}
      </div>

      <div className="tarjeta">
        <h2 style={{ marginBottom: 12 }}>Piezas de esta venta ({carrito.length})</h2>

        {carrito.length === 0 ? (
          <Vacio>Todavía no has agregado piezas.</Vacio>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <tbody>
                {carrito.map((unidad) => (
                  <tr key={unidad.id}>
                    <td>
                      <strong>{unidad.modelo.nombre}</strong>
                      <div className="tenue" style={{ fontSize: '0.83rem' }}>
                        <span className="mono">{unidad.folio}</span> ·{' '}
                        {unidad.talla ?? 'Ajustable'}
                      </div>
                    </td>
                    <td className="numero">{formatearMXN(unidad.modelo.precio_venta_mxn)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="discreto" onClick={() => quitar(unidad.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className="numero">
                    <strong>{formatearMXN(total)}</strong>
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {apartadasEnCarrito.length > 0 ? (
          <Aviso>
            {apartadasEnCarrito.length} pieza(s) están apartadas. Al cobrar se cierra ese apartado.
          </Aviso>
        ) : null}
      </div>

      <div className="tarjeta">
        <h2 style={{ marginBottom: 12 }}>Cobro</h2>

        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            venta.mutate()
          }}
        >
          <div className="rejilla">
            <Campo etiqueta="Método de pago">
              <select
                value={metodoPago}
                onChange={(evento) => setMetodoPago(evento.target.value as MetodoPago)}
              >
                {Object.entries(METODOS_PAGO).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo etiqueta="Canal">
              <select value={canal} onChange={(evento) => setCanal(evento.target.value as CanalVenta)}>
                {Object.entries(CANALES_VENTA).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo etiqueta="Nombre del cliente">
              <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
            </Campo>

            <Campo etiqueta="Teléfono">
              <input
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                inputMode="tel"
                placeholder="10 dígitos"
              />
            </Campo>
          </div>

          <Campo etiqueta="Notas">
            <textarea rows={2} value={notas} onChange={(evento) => setNotas(evento.target.value)} />
          </Campo>

          <MensajeError error={venta.error} />

          <div className="fila">
            <button
              type="submit"
              className="principal"
              disabled={carrito.length === 0 || venta.isPending}
            >
              {venta.isPending ? 'Registrando' : `Cobrar ${formatearMXN(total)}`}
            </button>

            {telefono.trim() ? (
              <a
                href={`https://wa.me/${telefonoWhatsApp(telefono)}`}
                target="_blank"
                rel="noreferrer"
              >
                <button type="button">Abrir WhatsApp</button>
              </a>
            ) : null}
          </div>
        </form>
      </div>
    </>
  )
}
