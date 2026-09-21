import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes,
  Clock,
  PackagePlus,
  Receipt,
  ScanLine,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { useSesion } from '../lib/auth'

type Seccion = {
  ruta: string
  texto: string
  /** Etiqueta corta para la barra del celular, donde no cabe la larga. */
  corto: string
  icono: LucideIcon
  exacta?: boolean
}

const SECCIONES: Seccion[] = [
  { ruta: '/', texto: 'Inventario', corto: 'Inventario', icono: Boxes, exacta: true },
  { ruta: '/productos', texto: 'Registrar productos', corto: 'Productos', icono: PackagePlus },
  { ruta: '/venta', texto: 'Registrar venta', corto: 'Vender', icono: ScanLine },
  { ruta: '/apartados', texto: 'Apartados', corto: 'Apartados', icono: Clock },
  { ruta: '/lotes', texto: 'Lotes', corto: 'Lotes', icono: Truck },
  { ruta: '/ventas', texto: 'Historial', corto: 'Historial', icono: Receipt },
]

/**
 * En escritorio la navegación es una barra lateral con texto. En el celular
 * baja al pie como iconos: el panel se usa con el teléfono en una mano y una
 * gorra en la otra, y abajo el pulgar llega sin reacomodar. Además devuelve la
 * parte de arriba al contenido, que es lo que antes se comía la lista de
 * enlaces en texto.
 */
export function Layout() {
  const { correo, cerrarSesion } = useSesion()

  return (
    <div className="marco">
      <aside className="barra-lateral no-imprimir">
        <img className="marca-logo" src="/logo-blanco.svg" alt="JM Caps" />

        <nav className="navegacion">
          {SECCIONES.map((seccion) => (
            <NavLink
              key={seccion.ruta}
              to={seccion.ruta}
              end={seccion.exacta}
              className={({ isActive }) => (isActive ? 'activo' : '')}
            >
              {seccion.texto}
            </NavLink>
          ))}
        </nav>

        <div className="pie-sesion">
          <span className="correo">{correo}</span>
          <button type="button" className="discreto" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Barra superior del celular: solo marca y salida, una sola línea. */}
      <header className="barra-movil no-imprimir">
        <img src="/logo-blanco.svg" alt="JM Caps" />
        <button type="button" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </button>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      <nav className="barra-inferior no-imprimir" aria-label="Secciones del panel">
        {SECCIONES.map((seccion) => {
          const Icono = seccion.icono
          return (
            <NavLink
              key={seccion.ruta}
              to={seccion.ruta}
              end={seccion.exacta}
              className={({ isActive }) => (isActive ? 'activo' : '')}
              aria-label={seccion.texto}
            >
              <Icono size={20} strokeWidth={2} aria-hidden="true" />
              <span>{seccion.corto}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
