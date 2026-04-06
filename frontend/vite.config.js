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
    target: ['es2020', 'chrome96', 'firefox90', 'safari15'],

    modulePreload: {
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        return deps.filter(dep => {
          const f = typeof dep === 'string' ? dep : (dep.file || '');
          return !f.includes('tiptap') && !f.includes('charts') && !f.includes('Admin') && !f.includes('emoji') && !f.includes('dndkit');
        });
      }
    },
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Tiptap editor (pesado, só usado no Admin/Builder)
          if (id.includes('@tiptap')) return 'tiptap';
          // Emoji picker (pesado, só usado no Editor)
          if (id.includes('emoji-picker-react') || id.includes('emoji-mart')) return 'emoji';
          // Recharts (usado só no Admin)
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
          // DnD kit (Editor)
          if (id.includes('@dnd-kit')) return 'dndkit';
          // React/ReactDOM base
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
          // Lucide icons (compartilhado)
          if (id.includes('lucide-react')) return 'icons';
          // React Router
          if (id.includes('react-router-dom') || id.includes('react-router')) return 'router';
        },
      },
      onwarn(warning, warn) {
        if (warning.code === 'LARGE_BUNDLE' || warning.code === 'CHUNK_TOO_LARGE') return;
        if (warning.message?.includes('chunk')) return;
        warn(warning);
      }
    }
  }
})
