import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development, the React app runs on :5173 and forwards API calls to the Express server on :5000.
const target = 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': target,
      '/uploads': target,
      '/socket.io': { target, ws: true },
    },
  },
})
