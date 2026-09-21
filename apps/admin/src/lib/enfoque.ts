import { useEffect, useRef } from 'react'

/**
 * Enfoca un campo al montar, pero solo con mouse.
 *
 * En la computadora enfocar el primer campo ahorra un clic por pantalla. En
 * el celular hace lo contrario: abre el teclado, la página se encoge y hay
 * que cerrarlo antes de poder ver nada. `pointer: fine` distingue un puntero
 * preciso (mouse, trackpad) de un dedo.
 */
export function useEnfoqueEscritorio<T extends HTMLElement>() {
  const referencia = useRef<T>(null)

  useEffect(() => {
    if (!esPunteroFino()) return
    referencia.current?.focus()
  }, [])

  return referencia
}

export function esPunteroFino(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: fine)').matches
}
