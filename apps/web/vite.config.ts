import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.BUSANFIT_WEB_PORT || '5173'),
    strictPort: true,
    proxy: { '/api': { target: process.env.BUSANFIT_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true } },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
})
