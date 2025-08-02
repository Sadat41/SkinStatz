import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    sourcemap: false, // Disable source maps for production
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Suppress source map warnings in development
  define: {
    __DEV__: JSON.stringify(false)
  },
  optimizeDeps: {
    // Exclude problematic files from dependency optimization
    exclude: ['lucide.js', 'index.min.js']
  }
})