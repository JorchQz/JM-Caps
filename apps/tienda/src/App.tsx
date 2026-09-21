import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Catalogo } from './paginas/Catalogo'
import { Producto } from './paginas/Producto'
import { ComoComprar } from './paginas/ComoComprar'
import { Terminos } from './paginas/Terminos'
import { Privacidad } from './paginas/Privacidad'
import { Menu } from './componentes/Menu'
import { enlaceWhatsApp } from './lib/catalogo'

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // El stock cambia cuando alguien aparta o compra: conviene recargarlo al
      // volver a la pestaña para no ofrecer lo que ya no hay.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={cliente}>
      <BrowserRouter>
        <Armazon />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function Armazon() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const enProducto = ubicacion.pathname.startsWith('/gorra/')

  return (
    <>
      <header className="encabezado">
        <div className="encabezado-fila">
          {enProducto ? (
            <button type="button" className="volver" onClick={() => navegar('/')}>
              Volver
            </button>
          ) : (
            <Link to="/" aria-label="Ir al catálogo">
              <img src="/logo-blanco.svg" alt="JM Caps" />
            </Link>
          )}

          <Menu />
        </div>
      </header>

      <main className="envoltura">
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/gorra/:id" element={<Producto />} />
          <Route path="/como-comprar" element={<ComoComprar />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/aviso-de-privacidad" element={<Privacidad />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="pie">
        <div>
          <div className="pie-titulo">Entrega en mano</div>
          <p>
            Colotlán y Tepatitlán. Nos vemos en el punto que acuerdes o en tu domicilio. Pagas al
            recibir: efectivo, transferencia o tarjeta con terminal.
          </p>
          <nav className="pie-enlaces">
            <Link to="/como-comprar">Cómo comprar</Link>
            <Link to="/terminos">Términos y condiciones</Link>
            <Link to="/aviso-de-privacidad">Aviso de privacidad</Link>
          </nav>
        </div>
        <a className="pie-enlace" href={enlaceWhatsApp('Hola, tengo una duda sobre las gorras.')}>
          Escribir por WhatsApp
        </a>
      </footer>
    </>
  )
}
