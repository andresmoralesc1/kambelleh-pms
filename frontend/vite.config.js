import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // PWA disabled - causes stale cache issues in production
    // VitePWA({ ... }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
        },
      },
    },
    modulePreload: false,
  },
})
