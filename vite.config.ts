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
        manualChunks: (id) => {
          // 依存関係に基づいたチャンク分割
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion') || id.includes('@heroicons')) {
              return 'ui-vendor';
            }
            if (id.includes('@supabase') || id.includes('@tanstack')) {
              return 'data-vendor';
            }
            return 'vendor';
          }
          // コンテキスト関連のファイルは別チャンクに
          if (id.includes('PlanLimitsContext') || id.includes('usePlanLimits')) {
            return 'plan-limits';
          }
        },
        // ファイル名パターン
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      },
      // 外部依存関係の明示
      external: [],
      // コンテキストプロバイダーをアプリケーションコードとして扱う
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    target: 'esnext',
    minify: 'terser', // terserでより良い最適化
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info'] : [],
        passes: 2
      },
      format: {
        comments: false
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 1000,
    // CSSのコード分割
    cssCodeSplit: true,
    // モジュールプリロードの設定
    modulePreload: {
      polyfill: true
    }
  },
  optimizeDeps: {
    // 依存関係の事前バンドル最適化
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'framer-motion',
      'sonner'
    ],
    // コンテキスト関連を明示的に含める
    exclude: [],
    // ESMモジュールの変換を強制
    esbuildOptions: {
      target: 'esnext',
      // コンテキストの保持
      keepNames: true
    }
  },
  // プレビュー最適化
  ssr: {
    noExternal: ['@supabase/supabase-js']
  },
  // ワーカー設定
  worker: {
    format: 'es'
  }
})
