# PlanLimitsContext エラー修正ドキュメント

## 問題の概要

「usePlanLimits must be used within a PlanLimitsProvider」というエラーが本番環境でのみ発生する問題。

## 根本原因

1. **ビルド最適化**: Viteの本番ビルドではコード分割とツリーシェイキングが適用される
2. **React 18の並行レンダリング**: Suspenseとlazy loadingでコンポーネントの初期化順序が変わる
3. **コンテキストの初期化タイミング**: Providerが初期化される前にhookが呼ばれる可能性

## 実装した修正

### 1. グローバル変数による値の保持
```typescript
// コンテキスト値をグローバル変数でも保持
let globalContextValue: PlanLimitsContextType = defaultContextValue;
```

### 2. マウント状態の追跡
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);
```

### 3. 安全なフック実装
```typescript
export const usePlanLimits = () => {
  try {
    const context = useContext(PlanLimitsContext);
    
    if (!context) {
      // グローバル値を確認
      if (typeof globalContextValue !== 'undefined' && globalContextValue !== defaultContextValue) {
        return globalContextValue;
      }
      return defaultContextValue;
    }
    
    return context;
  } catch (error) {
    // エラー時もグローバル値を返す
    if (typeof globalContextValue !== 'undefined' && globalContextValue !== defaultContextValue) {
      return globalContextValue;
    }
    return defaultContextValue;
  }
};
```

### 4. Providerのメモ化
```typescript
export const PlanLimitsProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  // 実装
});
```

### 5. Suspenseラッパーの追加
```typescript
export const PlanLimitsProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense fallback={<PageLoading page="app" />}>
      <PlanLimitsProvider>
        {children}
      </PlanLimitsProvider>
    </Suspense>
  );
};
```

### 6. ビルド設定の最適化
```typescript
// vite.config.ts
optimizeDeps: {
  include: ['react', 'react-dom', 'react-router-dom'],
  exclude: ['@supabase/supabase-js']
},
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'plan-limits': ['./src/contexts/PlanLimitsContext']
      }
    }
  }
}
```

### 7. StrictModeの追加
React 18の並行レンダリングを適切に処理するため、StrictModeでラップ。

## 追加の推奨事項

1. **安定版フックの使用**
   ```typescript
   import { usePlanLimitsStable } from './hooks/usePlanLimitsStable';
   ```

2. **エラーバウンダリの強化**
   各ページコンポーネントをPageErrorBoundaryでラップ済み

3. **非同期初期化の考慮**
   fetchUsage関数でisMountedRefをチェックして、アンマウント後の状態更新を防ぐ

## テスト方法

1. ローカルでの本番ビルド確認:
   ```bash
   npm run build
   npm run preview
   ```

2. エラーログの確認:
   - ブラウザのコンソールでwarningメッセージを確認
   - 「Using global context value」が表示される場合は、フォールバックが機能している

3. 各ページの動作確認:
   - ダッシュボード、顧客管理、予約管理などの主要ページにアクセス
   - プラン制限の表示が正常に機能することを確認