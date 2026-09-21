import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { limpiarDatosViejos } from './lib/persistencia'
import './styles.css'

// Antes de montar nada: lo guardado de una version anterior ya no sirve.
limpiarDatosViejos()

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('No se encontró el nodo raíz de la aplicación')

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
