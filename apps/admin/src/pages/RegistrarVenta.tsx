import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CANALES_VENTA,
  METODOS_PAGO,
  formatearFecha,
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
import { usePersistente } from '../lib/persistencia'
import {
  encolarVenta,
  guardarPiezas,
  leerPiezas,
  useVentasPendientes,
} from '../lib/sinRed'

export function RegistrarVenta() {
  const clienteQuery = useQueryClient()
  const campoBusqueda = useRef<HTMLInputElement>(null)

  const [busqueda, setBusqueda] = useState('')
  const [escaneando, setEscaneando] = useState(false)
  const [avisoEscaneo, setAvisoEscaneo] = useState<string | null>(null)
  const [foliosCarrito, setFoliosCarrito, limpiarCarrito] = usePersistente<string[]>(
    'venta:carrito',
    [],
  )
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [canal, setCanal] = useState<CanalVenta>('local_colotlan')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [ultimaVenta, setUltimaVenta] = useState<{
    total: number
    piezas: number
    pendiente: boolean
  } | null>(null)

  const { cola, hayRed, refrescar: refrescarCola } = useVentasPendientes()

  const vendibles = useQuery({
    queryKey: ['vendibles'],
    queryFn: async () => {
      const piezas = await unidadesVendibles()
      // Cada consulta con señal deja lista la copia para cuando no la haya.
      guardarPiezas(piezas)
      return piezas
    },
  })

  // Sin red se trabaja con la última copia. Se avisa de cuándo es, porque un
  // inventario viejo presentado como actual lleva a vender lo que ya no está.
  const respaldo = vendibles.data ? null : leerPiezas()
  const piezas = vendibles.data ?? respaldo?.piezas ?? []

  // El carrito se reconstruye contra lo que la base dice ahora mismo: si una
  // pieza guardada ya se vendió por otro lado, sale sola en vez de cobrarse dos
  // veces. Los folios que ya no existen se descartan al registrar la venta.
  const carrito = useMemo(
    () =>
      foliosCarrito
        .map((folio) => piezas.find((unidad) => unidad.folio === folio))
        .filter((unidad): unidad is UnidadConModelo => Boolean(unidad)),
    [foliosCarrito, piezas],
  )

  const perdidas = piezas.length > 0 ? foliosCarrito.length - carrito.length : 0

  const enCarrito = useMemo(() => new Set(carrito.map((unidad) => unidad.id)), [carrito])

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return []
    return piezas
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
  }, [busqueda, piezas, enCarrito])

  const total = carrito.reduce((suma, unidad) => suma + unidad.modelo.precio_venta_mxn, 0)

  function agregar(unidad: UnidadConModelo) {
    setFoliosCarrito((previo) =>
      previo.includes(unidad.folio) ? previo : [...previo, unidad.folio],
    )
    setBusqueda('')
    // Con la cámara abierta, enfocar el campo levantaría el teclado encima del
    // visor justo cuando se está apuntando a la siguiente gorra.
    if (!escaneando) campoBusqueda.current?.focus()
  }

  function quitar(folio: string) {
    setFoliosCarrito((previo) => previo.filter((valor) => valor !== folio))
  }

  /** El lector de códigos escribe el id completo y manda Enter. */
  function alEnviarBusqueda(evento: FormEvent) {
    evento.preventDefault()
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return

    const exacta = piezas.find((unidad) => unidad.folio === texto)
    if (exacta) {
      agregar(exacta)
      return
    }
    if (resultados.length === 1 && resultados[0]) agregar(resultados[0])
  }

  const venta = useMutation({
    mutationFn: async () => {
      const datos = {
        unidadIds: carrito.map((unidad) => unidad.id),
        metodo_pago: metodoPago,
        canal,
        cliente_nombre: nombre.trim() || null,
        cliente_telefono: telefono.trim() || null,
        notas: notas.trim() || null,
      }

      // Sin señal la venta no se pierde: se guarda en el dispositivo y sube
      // sola al recuperar red. El cliente ya pagó, el cobro no puede depender
      // de que haya datos en la puerta de su casa.
      if (!hayRed) {
        encolarVenta({
          datos,
          resumen: carrito.map((unidad) => unidad.modelo.nombre).join(', '),
          total,
        })
        return { pendiente: true }
      }

      await registrarVenta(datos)
      return { pendiente: false }
    },
    onSuccess: (resultado) => {
      setUltimaVenta({ total, piezas: carrito.length, pendiente: resultado.pendiente })
      limpiarCarrito()
      setNombre('')
      setTelefono('')
      setNotas('')
      refrescarCola()

      if (!resultado.pendiente) {
        void vendibles.refetch()
        void clienteQuery.invalidateQueries({ queryKey: llaves.inventario })
        void clienteQuery.invalidateQueries({ queryKey: llaves.apartados })
        void clienteQuery.invalidateQueries({ queryKey: llaves.ventas })
      }
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
        <Aviso tipo={ultimaVenta.pendiente ? 'neutro' : 'exito'}>
          {ultimaVenta.pendiente
            ? `Venta guardada sin señal: ${ultimaVenta.piezas} pieza(s) por ${formatearMXN(ultimaVenta.total)}. Sube sola en cuanto haya red.`
            : `Venta registrada: ${ultimaVenta.piezas} pieza(s) por ${formatearMXN(ultimaVenta.total)}.`}
        </Aviso>
      ) : null}

      {!hayRed ? (
        <Aviso>
          Sin conexión. Puedes escanear y cobrar igual: el inventario que ves es la última copia
          {respaldo ? ` guardada ${formatearFecha(respaldo.guardadoEn)}` : ''}, y la venta se
          sube sola cuando vuelva la señal.
        </Aviso>
      ) : null}

      {cola.length > 0 ? (
        <Aviso tipo={cola.some((fila) => fila.problema) ? 'error' : 'neutro'}>
          {cola.length} venta(s) esperando subir.
          {cola.some((fila) => fila.problema)
            ? ' Alguna fue rechazada al subir: revisa el detalle abajo.'
            : hayRed
              ? ' Subiendo.'
              : ' Se suben al recuperar la señal.'}
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {cola.map((fila) => (
              <li key={fila.id} style={{ fontSize: '0.88rem' }}>
                {formatearFecha(fila.creadaEn)} — {fila.resumen || 'Venta'} por{' '}
                {formatearMXN(fila.total)}
                {fila.problema ? `. Rechazada: ${fila.problema}` : ''}
              </li>
            ))}
          </ul>
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
              const unidad = piezas.find((pieza) => pieza.folio === folio)

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
                    <td className="principal">
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
                    <td className="acciones">
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
                    <td className="principal">
                      <strong>{unidad.modelo.nombre}</strong>
                      <div className="tenue" style={{ fontSize: '0.83rem' }}>
                        <span className="mono">{unidad.folio}</span> ·{' '}
                        {unidad.talla ?? 'Ajustable'}
                      </div>
                    </td>
                    <td className="numero">{formatearMXN(unidad.modelo.precio_venta_mxn)}</td>
                    <td className="acciones">
                      <button type="button" className="discreto" onClick={() => quitar(unidad.folio)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="principal">
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

        {perdidas > 0 ? (
          <Aviso>
            {perdidas} pieza(s) que tenías en esta venta ya no están disponibles y salieron del
            carrito. Revisa que no se hayan vendido antes de cobrar.
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
