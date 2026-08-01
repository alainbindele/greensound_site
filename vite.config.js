import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

const API_PORT = process.env.API_PORT || 3001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // In development Vite serves the app and forwards API traffic to the
    // Express process, so the browser sees a single origin and the session
    // cookie behaves exactly as it will in production.
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
