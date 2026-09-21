import type { Categoria } from '@jm-caps/db'
import type { Producto } from './catalogo'
// Importado de vocabulario y no de catalogo: asi este modulo no arrastra el
// cliente de Supabase y se puede probar solo.
import { AJUSTE, ESTILO } from './vocabulario'
import { compararTallas } from './tallas'

/** Las formas en que un cliente busca una gorra, en el orden en que pregunta. */
export type Dimension = 'estilo' | 'ajuste' | 'talla' | 'color' | 'equipo'

export type Seleccion = Record<Dimension, string[]>

export const SIN_FILTROS: Seleccion = {
  estilo: [],
  ajuste: [],
  talla: [],
  color: [],
  equipo: [],
}

// El orden de este objeto es el orden en que salen las filas de filtros.
export const ROTULOS: Record<Dimension, string> = {
  estilo: 'Estilo',
  ajuste: 'Ajuste',
  talla: 'Talla',
  color: 'Color',
  equipo: 'Equipo',
}

export type Grupo = {
  dimension: Dimension
  opciones: Array<{ valor: string; cuantas: number }>
}

/** El color viene como texto libre: "negro" y "Negro" son el mismo color. */
function claveColor(valor: string): string {
  return valor.trim().toLowerCase()
}

function presentarColor(valor: string): string {
  const limpio = valor.trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

/** Los valores de un producto en cada dimensión. Una talla puede tener varias. */
function valoresDe(producto: Producto, dimension: Dimension): string[] {
  switch (dimension) {
    case 'estilo':
      return producto.categoria ? [ESTILO[producto.categoria as Categoria]] : []
    case 'ajuste':
      return producto.categoria ? [AJUSTE[producto.categoria as Categoria]] : []
    case 'talla':
      return producto.tallas_disponibles ?? []
    case 'color':
      return producto.color?.trim() ? [presentarColor(producto.color)] : []
    case 'equipo':
      return producto.equipo?.trim() ? [producto.equipo.trim()] : []
  }
}

function coincide(producto: Producto, dimension: Dimension, elegidos: string[]): boolean {
  if (elegidos.length === 0) return true

  const valores = valoresDe(producto, dimension)
  if (dimension === 'color') {
    const claves = valores.map(claveColor)
    return elegidos.some((elegido) => claves.includes(claveColor(elegido)))
  }
  return elegidos.some((elegido) => valores.includes(elegido))
}

/** Dentro de una dimensión los valores suman; entre dimensiones se restringen. */
export function filtrar(productos: Producto[], seleccion: Seleccion): Producto[] {
  const dimensiones = Object.keys(ROTULOS) as Dimension[]
  return productos.filter((producto) =>
    dimensiones.every((dimension) => coincide(producto, dimension, seleccion[dimension])),
  )
}

/**
 * Las opciones de cada dimensión, con cuántos modelos quedarían al elegirlas.
 *
 * El conteo se calcula contra los productos ya filtrados por las **otras**
 * dimensiones, no por la propia. Así, si el cliente marca "Negro", las tallas
 * siguen mostrando todas las que hay en negro, y sigue pudiendo marcar un
 * segundo color sin que la lista se le haya encogido por su propia elección.
 *
 * Una opción que dejaría la pantalla vacía no se ofrece. Es la diferencia
 * entre un filtro que ayuda y uno que manda al cliente a un callejón.
 */
export function opcionesDe(productos: Producto[], seleccion: Seleccion): Grupo[] {
  const dimensiones = Object.keys(ROTULOS) as Dimension[]

  return dimensiones
    .map((dimension) => {
      const otras = dimensiones.filter((otra) => otra !== dimension)
      const candidatos = productos.filter((producto) =>
        otras.every((otra) => coincide(producto, otra, seleccion[otra])),
      )

      const cuenta = new Map<string, { valor: string; cuantas: number }>()
      for (const producto of candidatos) {
        for (const valor of valoresDe(producto, dimension)) {
          const clave = dimension === 'color' ? claveColor(valor) : valor
          const fila = cuenta.get(clave) ?? { valor, cuantas: 0 }
          fila.cuantas += 1
          cuenta.set(clave, fila)
        }
      }

      // Lo ya elegido se queda aunque nada lo tenga: si no, el chip activo
      // desaparecería y no habría forma de desmarcarlo.
      for (const elegido of seleccion[dimension]) {
        const clave = dimension === 'color' ? claveColor(elegido) : elegido
        if (!cuenta.has(clave)) cuenta.set(clave, { valor: elegido, cuantas: 0 })
      }

      const opciones = [...cuenta.values()].sort((a, b) =>
        dimension === 'talla'
          ? compararTallas(a.valor, b.valor)
          : a.valor.localeCompare(b.valor, 'es'),
      )

      return { dimension, opciones }
    })
    // Una sola opción no filtra nada: ocupa espacio y sugiere una decisión
    // que no existe.
    .filter((grupo) => grupo.opciones.length > 1)
}

export function alternar(seleccion: Seleccion, dimension: Dimension, valor: string): Seleccion {
  const actuales = seleccion[dimension]
  const comparar = dimension === 'color' ? claveColor : (v: string) => v
  const quitando = actuales.some((otro) => comparar(otro) === comparar(valor))

  return {
    ...seleccion,
    [dimension]: quitando
      ? actuales.filter((otro) => comparar(otro) !== comparar(valor))
      : [...actuales, valor],
  }
}

export function estaActivo(seleccion: Seleccion, dimension: Dimension, valor: string): boolean {
  const comparar = dimension === 'color' ? claveColor : (v: string) => v
  return seleccion[dimension].some((otro) => comparar(otro) === comparar(valor))
}

export function cuantosFiltros(seleccion: Seleccion): number {
  return Object.values(seleccion).reduce((suma, lista) => suma + lista.length, 0)
}
