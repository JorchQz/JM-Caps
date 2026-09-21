import { useCallback, useEffect, useState } from 'react'

const PREFIJO = 'jmcaps:'

/**
 * Estado que sobrevive a que se cierre la pestaña o se bloquee el celular.
 *
 * El panel se usa en el teléfono, y los navegadores móviles descartan pestañas
 * en segundo plano sin avisar. Perder un formulario a medias es molestia;
 * perder un carrito de venta con el cliente enfrente es otra cosa.
 *
 * Guarda en el propio dispositivo, así que no sustituye a la base: es un
 * respaldo de lo que todavía no se ha enviado.
 */
export function usePersistente<T>(clave: string, inicial: T) {
  const llave = PREFIJO + clave

  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(llave)
      return guardado === null ? inicial : (JSON.parse(guardado) as T)
    } catch {
      // Modo privado, almacenamiento lleno o un JSON corrupto de otra versión:
      // se arranca limpio en vez de tumbar la pantalla.
      return inicial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(llave, JSON.stringify(valor))
    } catch {
      // Sin espacio o sin permiso: el trabajo sigue, solo se pierde el respaldo.
    }
  }, [llave, valor])

  const limpiar = useCallback(() => {
    setValor(inicial)
    try {
      localStorage.removeItem(llave)
    } catch {
      // Nada que hacer: el valor en memoria ya volvió a su estado inicial.
    }
    // `inicial` se omite a propósito: si el padre lo recrea en cada render,
    // incluirlo haría que limpiar cambie de identidad todo el tiempo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llave])

  return [valor, setValor, limpiar] as const
}

// ---------------------------------------------------------------------------

/**
 * Sube este valor para que todos los dispositivos tiren lo que tengan guardado
 * la próxima vez que abran el panel.
 *
 * Sirve para dos casos: cuando se vacía el inventario y lo guardado dejó de
 * corresponder a nada, y cuando cambia la forma de lo que se guarda y un dato
 * viejo ya no se puede leer.
 */
const VERSION_DATOS = '2026-09-21-arranque'

const CLAVE_VERSION = PREFIJO + 'version-datos'

/** La cola de ventas sin subir nunca se borra: es dinero que ya se cobró. */
const INTOCABLES = new Set([PREFIJO + 'cola:ventas', CLAVE_VERSION])

/**
 * Tira lo guardado en este dispositivo si viene de una versión anterior.
 *
 * Se llama una vez al arrancar. Sin esto, al vaciar el inventario el celular
 * seguiría mostrando piezas que ya no existen hasta que recupere señal, y
 * arrastrando borradores de productos que nunca se van a dar de alta.
 */
export function limpiarDatosViejos(): void {
  try {
    if (localStorage.getItem(CLAVE_VERSION) === VERSION_DATOS) return

    const sobran = Object.keys(localStorage).filter(
      (clave) => clave.startsWith(PREFIJO) && !INTOCABLES.has(clave),
    )
    for (const clave of sobran) localStorage.removeItem(clave)

    localStorage.setItem(CLAVE_VERSION, VERSION_DATOS)
  } catch {
    // Modo privado o almacenamiento bloqueado: no hay nada guardado que tirar.
  }
}
