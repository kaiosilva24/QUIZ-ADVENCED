import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress chunk size warnings
        if (warning.code === 'LARGE_BUNDLE' || warning.code === 'CHUNK_TOO_LARGE') return;
        if (warning.message?.includes('chunk')) return;
        warn(warning);
      }
    }
  }
})
