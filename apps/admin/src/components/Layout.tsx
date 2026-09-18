import { NavLink, Outlet } from 'react-router-dom'
import { useSesion } from '../lib/auth'

const SECCIONES = [
  { ruta: '/', texto: 'Inventario', exacta: true },
  { ruta: '/productos', texto: 'Registrar productos' },
  { ruta: '/venta', texto: 'Registrar venta' },
  { ruta: '/apartados', texto: 'Apartados' },
  { ruta: '/lotes', texto: 'Lotes' },
  { ruta: '/ventas', texto: 'Historial' },
]

export function Layout() {
  const { correo, cerrarSesion } = useSesion()

  return (
    <div className="marco">
      <aside className="barra-lateral no-imprimir">
        <div className="marca">
          JM <span>Caps</span>
        </div>

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

      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
