import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Permite abrirla desde el celular por Tailscale. Vite rechaza por
    // defecto los nombres de host que no conoce, como los de la red privada.
    allowedHosts: ['.ts.net'],
  },
  resolve: {
    alias: {
      '@jm-caps/db': fileURLToPath(new URL('../../packages/db/src/index.ts', import.meta.url)),
    },
  },
})
