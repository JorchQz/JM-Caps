import { useEffect, useState } from 'react'
import type { DatosVenta, UnidadConModelo } from './consultas'

const CLAVE_PIEZAS = 'jmcaps:cache:vendibles'
const CLAVE_COLA = 'jmcaps:cola:ventas'

/* -------------------------------------------------------------------------
   Inventario guardado en el dispositivo

   Entregando en casa del cliente la red falla. Sin una copia local, escanear
   una gorra no encuentra nada y no se puede cobrar. La copia se refresca cada
   vez que hay señal, y siempre se muestra de cuándo es: un inventario viejo
   que se presenta como actual es peor que no tener ninguno.
   ------------------------------------------------------------------------- */

export type PiezasEnCache = {
  piezas: UnidadConModelo[]
  guardadoEn: string
}

export function guardarPiezas(piezas: UnidadConModelo[]): void {
  try {
    const dato: PiezasEnCache = { piezas, guardadoEn: new Date().toISOString() }
    localStorage.setItem(CLAVE_PIEZAS, JSON.stringify(dato))
  } catch {
    // Sin espacio: se sigue trabajando en línea, solo no habrá respaldo.
  }
}

export function leerPiezas(): PiezasEnCache | null {
  try {
    const crudo = localStorage.getItem(CLAVE_PIEZAS)
    return crudo ? (JSON.parse(crudo) as PiezasEnCache) : null
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------
   Ventas pendientes de subir
   ------------------------------------------------------------------------- */

export type VentaEnCola = {
  id: string
  datos: DatosVenta
  /** Para poder mostrar qué se vendió sin volver a consultar la base. */
  resumen: string
  total: number
  creadaEn: string
  /** Se llena solo si la base rechazó la venta: ahí ya no es falta de red. */
  problema?: string
}

export function leerCola(): VentaEnCola[] {
  try {
    const crudo = localStorage.getItem(CLAVE_COLA)
    return crudo ? (JSON.parse(crudo) as VentaEnCola[]) : []
  } catch {
    return []
  }
}

function escribirCola(cola: VentaEnCola[]): void {
  try {
    localStorage.setItem(CLAVE_COLA, JSON.stringify(cola))
  } catch {
    // Si esto falla no hay dónde más guardar; el aviso en pantalla es la red
    // de seguridad para que la venta se capture a mano.
  }
}

export function encolarVenta(venta: Omit<VentaEnCola, 'id' | 'creadaEn'>): VentaEnCola {
  const nueva: VentaEnCola = {
    ...venta,
    id: crypto.randomUUID(),
    creadaEn: new Date().toISOString(),
  }
  escribirCola([...leerCola(), nueva])
  return nueva
}

export function quitarDeCola(id: string): void {
  escribirCola(leerCola().filter((venta) => venta.id !== id))
}

/** Un fallo de red se reintenta solo; uno de validación necesita a una persona. */
function esFalloDeRed(error: unknown): boolean {
  if (!navigator.onLine) return true
  const mensaje = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    mensaje.includes('failed to fetch') ||
    mensaje.includes('networkerror') ||
    mensaje.includes('load failed') ||
    mensaje.includes('timeout')
  )
}

export type ResultadoSincronizacion = { subidas: number; conProblema: number }

/**
 * Sube las ventas que quedaron pendientes. La base vuelve a validar cada una,
 * así que si una pieza ya se vendió por otro lado la venta no pasa: se queda
 * en la cola marcada con el motivo, para resolverla a mano.
 */
export async function sincronizarVentas(): Promise<ResultadoSincronizacion> {
  let subidas = 0
  let conProblema = 0

  // Import diferido: así este módulo se puede cargar y probar sin arrastrar el
  // cliente de Supabase, que necesita variables de entorno para construirse.
  const { registrarVenta } = await import('./consultas')

  for (const venta of leerCola()) {
    try {
      await registrarVenta(venta.datos)
      quitarDeCola(venta.id)
      subidas += 1
    } catch (error) {
      if (esFalloDeRed(error)) break // Sigue sin señal: se intenta después.

      const mensaje = error instanceof Error ? error.message : String(error)
      escribirCola(
        leerCola().map((fila) => (fila.id === venta.id ? { ...fila, problema: mensaje } : fila)),
      )
      conProblema += 1
    }
  }

  return { subidas, conProblema }
}

/* -------------------------------------------------------------------------
   Enganches de React
   ------------------------------------------------------------------------- */

export function useHayRed(): boolean {
  const [hayRed, setHayRed] = useState(() => navigator.onLine)

  useEffect(() => {
    const conectado = () => setHayRed(true)
    const desconectado = () => setHayRed(false)
    window.addEventListener('online', conectado)
    window.addEventListener('offline', desconectado)
    return () => {
      window.removeEventListener('online', conectado)
      window.removeEventListener('offline', desconectado)
    }
  }, [])

  return hayRed
}

/** Cuenta de ventas pendientes, que se refresca sola al recuperar la señal. */
export function useVentasPendientes() {
  const [cola, setCola] = useState<VentaEnCola[]>(() => leerCola())
  const hayRed = useHayRed()

  const refrescar = () => setCola(leerCola())

  useEffect(() => {
    if (!hayRed || leerCola().length === 0) return
    let activo = true

    void sincronizarVentas().then(() => {
      if (activo) refrescar()
    })

    return () => {
      activo = false
    }
  }, [hayRed])

  return { cola, hayRed, refrescar }
}
