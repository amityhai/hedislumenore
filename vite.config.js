import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

// Two separate bundles from one codebase: the staff app (index.html →
// src/App.js) and the provider portal (provider.html → src/ProviderApp.js)
// are genuinely different entry points/output chunks, not just different
// hash routes inside one bundle — so the provider bundle never pulls in
// staff-only code (Care Action Center, v2 scorecard, etc.) and vice versa.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: r('./index.html'),
        provider: r('./provider.html'),
      },
    },
  },
  publicDir: 'public',
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
