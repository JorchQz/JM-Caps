import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProveedorSesion, useSesion } from './lib/auth'
import { Layout } from './components/Layout'
import { Cargando } from './components/ui'
import { Login } from './pages/Login'
import { Inventario } from './pages/Inventario'
import { ModeloDetalle } from './pages/ModeloDetalle'
import { RegistrarProductos } from './pages/RegistrarProductos'
import { RegistrarVenta } from './pages/RegistrarVenta'
import { Apartados } from './pages/Apartados'
import { Lotes } from './pages/Lotes'
import { RecepcionLote } from './pages/RecepcionLote'
import { PedidoProveedor } from './pages/PedidoProveedor'
import { Historial } from './pages/Historial'
import { Precios } from './pages/Precios'

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})

function Rutas() {
  const { sesion, cargando } = useSesion()

  if (cargando) return <Cargando texto="Verificando sesión" />
  if (!sesion) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inventario />} />
        <Route path="modelo/:id" element={<ModeloDetalle />} />
        <Route path="productos" element={<RegistrarProductos />} />
        <Route path="venta" element={<RegistrarVenta />} />
        <Route path="apartados" element={<Apartados />} />
        <Route path="lotes" element={<Lotes />} />
        <Route path="lotes/:id/pedido" element={<PedidoProveedor />} />
        <Route path="lotes/:id/recibir" element={<RecepcionLote />} />
        <Route path="precios" element={<Precios />} />
        <Route path="ventas" element={<Historial />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={cliente}>
      <ProveedorSesion>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </ProveedorSesion>
    </QueryClientProvider>
  )
}
