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
    host: process.env.NODE_ENV === 'production' ? false : '127.0.0.1', // セキュリティ強化: 本番では外部アクセス禁止
    port: 5173,
    strictPort: false, // ポートが使用中の場合は別のポートを使用
    open: true, // ブラウザを自動的に開く
    cors: {
      origin: process.env.VITE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
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
