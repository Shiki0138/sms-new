import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    global: 'globalThis',
  },
  server: {
    host: true, // 0.0.0.0でリッスン
    port: 5173,
    strictPort: false, // ポートが使用中の場合は別のポートを使用
    open: true, // ブラウザを自動的に開く
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', '@heroicons/react'],
          'data-vendor': ['@supabase/supabase-js']
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  }
})
