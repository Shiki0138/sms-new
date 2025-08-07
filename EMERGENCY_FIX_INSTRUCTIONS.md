# 緊急修正手順書

## 問題: React Hook エラー「usePlanLimits must be used within a PlanLimitsProvider」

### 原因
PlanLimitsProviderがApp.tsxで正しくラップされていなかったため、usePlanLimitsフックがコンテキストを見つけられない。

### 実施した修正

#### 1. App.tsx の修正
PlanLimitsProviderをインポートし、適切な階層でラップ：

```tsx
import { PlanLimitsProvider } from './contexts/PlanLimitsContext';

// 以下の順序でプロバイダーをネスト
<AuthProvider>
  <PlanLimitsProvider>
    <BusinessHoursProvider>
      {/* アプリケーションの内容 */}
    </BusinessHoursProvider>
  </PlanLimitsProvider>
</AuthProvider>
```

### 追加で必要な作業

#### 1. 環境変数の設定（必須）
`salon-light-plan/.env.local` ファイルを作成：

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 2. 開発サーバーの再起動
```bash
cd salon-light-plan
npm run dev
```

### 確認事項

1. **ブラウザコンソール**でエラーが解消されているか確認
2. **ネットワークタブ**でSupabaseへの接続が成功しているか確認
3. **顧客管理ページ**が正常に表示されるか確認

### トラブルシューティング

#### まだローディングが続く場合
1. Supabase環境変数が正しく設定されているか確認
2. ブラウザのキャッシュをクリア（Ctrl+Shift+R）
3. localStorage をクリア：
   ```javascript
   localStorage.clear()
   ```

#### エラーが続く場合
1. `npm install` を再実行
2. `node_modules` と `.next` を削除して再インストール：
   ```bash
   rm -rf node_modules .next
   npm install
   ```

### 本番リリース前の最終チェック

1. 全ページで動作確認
2. ログイン・ログアウトのテスト
3. 顧客登録・予約登録のテスト
4. プラン制限の動作確認
5. エラーハンドリングの確認

---

修正完了日時: 2025年8月6日