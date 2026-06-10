import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/compras': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/ventas': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/configuracion': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/reportes': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/produccion': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/status': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})

