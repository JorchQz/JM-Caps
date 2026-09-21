import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    /*
      El panel se usa entregando gorras en casa del cliente, donde la red de
      datos falla. Sin esto, abrir el panel sin señal no muestra nada.

      Solo se guarda el panel en sí (código, estilos, fuentes). Los datos del
      inventario NO se cachean aquí a propósito: que el navegador sirviera un
      inventario viejo sin avisar llevaría a vender una gorra que ya no está.
      Eso se maneja en el código, donde se puede decir desde cuándo son los
      datos que se están viendo.
    */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono-192.png', 'icono-512.png'],
      manifest: {
        name: 'JM Caps — Administración',
        short_name: 'JM Caps',
        description: 'Inventario, pedidos y ventas de JM Caps',
        lang: 'es-MX',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icono-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        // Las peticiones a Supabase nunca se sirven desde cache: los datos de
        // inventario tienen que ser los de ahora o decir claramente que no lo son.
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@jm-caps/db': fileURLToPath(new URL('../../packages/db/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Permite abrirlo desde el celular por Tailscale. Vite rechaza por
    // defecto los nombres de host que no conoce, como los de la red privada.
    allowedHosts: ['.ts.net'],
  },
})
