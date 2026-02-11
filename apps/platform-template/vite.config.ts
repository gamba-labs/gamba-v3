import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    port: 4001,
    strictPort: true,
  },
  preview: {
    port: 4001,
    strictPort: true,
  },
})
