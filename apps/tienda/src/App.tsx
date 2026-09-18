import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Catalogo } from './paginas/Catalogo'
import { Producto } from './paginas/Producto'
import { enlaceWhatsApp } from './lib/catalogo'

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // El stock cambia solo cuando alguien aparta o compra: conviene
      // recargarlo al volver a la pestaña para no ofrecer lo que ya no hay.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={cliente}>
      <BrowserRouter>
        <header className="encabezado">
          <div className="envoltura encabezado-fila">
            <Link className="logotipo" to="/">
              JM CAPS
            </Link>
            <span className="lugar">Colotlán y Tepatitlán</span>
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
          <div className="envoltura">
            <p style={{ margin: 0 }}>
              Entrega en persona sin costo en Colotlán y Tepatitlán. Pagas al recibir, en
              efectivo, transferencia o tarjeta.
            </p>
            <p style={{ margin: '8px 0 0' }}>
              <a href={enlaceWhatsApp('Hola, tengo una duda sobre las gorras.')}>
                Escríbenos por WhatsApp
              </a>
            </p>
          </div>
        </footer>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
