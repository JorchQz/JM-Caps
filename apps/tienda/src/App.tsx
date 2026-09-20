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
            <Link to="/">
              <img src="/logo-blanco.svg" alt="JM Caps" />
            </Link>
          )}

          {enProducto ? (
            <Link to="/" style={{ marginLeft: 'auto' }}>
              <img src="/logo-blanco.svg" alt="JM Caps" style={{ height: 26 }} />
            </Link>
          ) : (
            <span className="encabezado-lugar">Colotlán, Jal.</span>
          )}
        </div>
      </header>

      <main className="envoltura">
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/gorra/:id" element={<Producto />} />
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
        </div>
        <a className="pie-enlace" href={enlaceWhatsApp('Hola, tengo una duda sobre las gorras.')}>
          Escribir por WhatsApp
        </a>
      </footer>
    </>
  )
}
