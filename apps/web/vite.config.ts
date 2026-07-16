import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin '/api' in dev mirrors the production nginx routing
    // ('/' -> web container, '/api' -> api container), so the frontend
    // always calls relative URLs and never deals with CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
