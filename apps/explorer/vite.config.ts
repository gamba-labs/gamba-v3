import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@solana') || id.includes('/@gamba/')) return 'solana'
            if (id.includes('@visx') || id.includes('/d3-')) return 'charts'
            return 'vendor'
          }

          if (id.includes('/src/views/Transaction/') || id.includes('/src/lib/tx/')) return 'route-transaction'
          if (id.includes('/src/views/Pool/') || id.includes('/src/lib/pool')) return 'route-pool'
          if (id.includes('/src/views/Debug/')) return 'route-debug'

          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    open: false,
  },
  preview: {
    port: 5175,
    strictPort: true,
    host: true,
    open: false,
  },
})
