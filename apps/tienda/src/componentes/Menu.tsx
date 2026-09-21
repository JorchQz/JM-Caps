import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { enlaceWhatsApp } from '../lib/catalogo'

const SECCIONES = [
  { ruta: '/', texto: 'Catálogo' },
  { ruta: '/como-comprar', texto: 'Cómo comprar' },
  { ruta: '/terminos', texto: 'Términos y condiciones' },
  { ruta: '/aviso-de-privacidad', texto: 'Aviso de privacidad' },
]

export function Menu() {
  const [abierto, setAbierto] = useState(false)
  const ubicacion = useLocation()
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  // Navegar cierra el menú: si no, queda tapando la página a la que acabas
  // de entrar.
  useEffect(() => {
    setAbierto(false)
  }, [ubicacion.pathname])

  useEffect(() => {
    if (!abierto) return

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }

    function alTocarFuera(evento: MouseEvent) {
      const destino = evento.target as Node
      if (!panel.current?.contains(destino) && !boton.current?.contains(destino)) {
        setAbierto(false)
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    document.addEventListener('mousedown', alTocarFuera)
    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.removeEventListener('mousedown', alTocarFuera)
    }
  }, [abierto])

  return (
    <>
      <button
        ref={boton}
        type="button"
        className="boton-menu"
        aria-expanded={abierto}
        aria-controls="menu-tienda"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setAbierto(!abierto)}
      >
        <span className={abierto ? 'rayas abiertas' : 'rayas'} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {abierto ? (
        <div className="menu-panel" id="menu-tienda" ref={panel}>
          <nav>
            {SECCIONES.map((seccion) => (
              <Link
                key={seccion.ruta}
                to={seccion.ruta}
                aria-current={ubicacion.pathname === seccion.ruta ? 'page' : undefined}
              >
                {seccion.texto}
              </Link>
            ))}
            <a href={enlaceWhatsApp('Hola, tengo una duda sobre las gorras.')}>
              Escribir por WhatsApp
            </a>
          </nav>
          <div className="menu-pie">Entrega en mano en Colotlán y Tepatitlán</div>
        </div>
      ) : null}
    </>
  )
}
