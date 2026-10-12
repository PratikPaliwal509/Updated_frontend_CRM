import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/components': '/src/components',
      '@/utils': '/src/utils',
      '@/hooks': '/src/hooks',
    },
  },
  // the end-to-end encryption engine loads its WebAssembly file relative to itself;
  // pre-bundling would break that path in development
  optimizeDeps: { exclude: ['@matrix-org/matrix-sdk-crypto-wasm'] },
})
