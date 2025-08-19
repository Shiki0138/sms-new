# 🚀 本番環境デプロイチェックリスト

## ✅ 事前チェック完了項目

### 1. **パッケージ管理**
- ✅ package.json の依存関係確認済み
- ✅ Node.js バージョン要件: >=18.0.0（Vercel対応）
- ✅ ビルドスクリプト動作確認済み
- ✅ 不要な devDependencies は本番ビルドから除外

### 2. **コード品質**
- ✅ CommonJS形式で統一（ES6モジュール混在なし）
- ✅ 循環依存なし
- ✅ エラーハンドリング実装済み
- ✅ Twilio初期化エラーは警告のみ（アプリケーション停止しない）

### 3. **セキュリティ**
- ✅ helmet.js によるセキュリティヘッダー設定
- ✅ CORS設定適切
- ✅ レート制限実装済み
- ✅ JWT認証実装済み
- ✅ パスワードハッシュ化（bcrypt）

### 4. **静的ファイル**
- ✅ publicディレクトリ構成確認
- ✅ 必要なHTMLファイル全て存在
- ✅ CSSファイル適用確認

## ⚠️ デプロイ前の必須設定

### 1. **環境変数設定**
```bash
# Vercelダッシュボードで以下を設定
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
JWT_SECRET=strong_random_secret_key
SESSION_SECRET=another_strong_secret
NODE_ENV=production

# オプション（SMS機能使用時）
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# セキュリティ強化用
BACKUP_ENCRYPTION_KEY=backup_encryption_secret
ENCRYPTION_KEY=data_encryption_secret
```

### 2. **Vercel設定最適化**
```json
// vercel.json に追加推奨
{
  "functions": {
    "api/index.js": {
      "maxDuration": 10
    }
  },
  "buildCommand": "npm run vercel-build"
}
```

### 3. **データベース準備**
- Supabaseプロジェクトの作成
- 必要なテーブルの作成（スクリプト実行）
- RLS（Row Level Security）の設定

## 📋 デプロイ手順

### 1. **最終ビルドテスト**
```bash
# ローカルでの最終確認
npm run build
npm run start:supabase
```

### 2. **Gitコミット**
```bash
git add .
git commit -m "Production deployment - security features added"
git push origin main
```

### 3. **Vercelデプロイ**
```bash
# Vercel CLIを使用
vercel --prod

# または GitHub連携でのの自動デプロイ
```

### 4. **デプロイ後の確認**
- [ ] ヘルスチェックエンドポイント確認
- [ ] ログイン機能テスト
- [ ] 基本的なCRUD操作テスト
- [ ] SMS機能テスト（設定済みの場合）

## 🔍 トラブルシューティング

### よくあるエラーと対処法

1. **Module not found エラー**
   - node_modules削除して再インストール
   - package-lock.json も削除

2. **環境変数エラー**
   - Vercelダッシュボードで全て設定されているか確認
   - プレビューと本番で別々に設定必要

3. **CORS エラー**
   - vercel.json のheaders設定確認
   - フロントエンドのURLを環境変数に追加

4. **タイムアウトエラー**
   - Vercel無料プランは10秒制限
   - 重い処理は非同期化またはエッジ関数使用

## 📊 デプロイ後のモニタリング

1. **Vercelダッシュボード**
   - Function logs確認
   - Error率監視
   - パフォーマンスメトリクス

2. **アプリケーション監視**
   - /health エンドポイント定期チェック
   - エラーログ収集
   - ユーザーフィードバック

## ✅ 最終確認項目

- [ ] 全ての依存関係がpackage.jsonに記載
- [ ] 環境変数が本番用に設定
- [ ] セキュリティヘッダーが適切
- [ ] エラーハンドリングが本番モード対応
- [ ] ログが本番環境用に設定
- [ ] 不要なconsole.logが削除
- [ ] テストアカウントが無効化
- [ ] バックアップ設定確認

---

これらすべてをチェックしたら、安全にデプロイ可能です。