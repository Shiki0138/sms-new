# 🚀 Salon Lumière - 本番環境デプロイガイド

## ✅ デプロイ前チェック完了

全てのチェックをパスしました。以下の手順でデプロイを進めてください。

## 📋 デプロイ手順

### 1. Vercel環境変数設定

Vercelダッシュボード（https://vercel.com）で以下の環境変数を設定：

#### 必須環境変数
```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-strong-jwt-secret
SESSION_SECRET=your-strong-session-secret
```

#### オプション（SMS機能使用時）
```
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+81-your-number
```

#### セキュリティ強化（推奨）
```
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key
ENCRYPTION_KEY=your-data-encryption-key
ALLOWED_ORIGINS=https://your-domain.com,https://sms-new.vercel.app
```

### 2. Gitコミット

```bash
git add .
git commit -m "Production deployment - SMS blast features and security enhancements added"
git push origin main
```

### 3. Vercelデプロイ

#### オプション1: GitHub連携（推奨）
- GitHubにプッシュすると自動的にデプロイされます

#### オプション2: Vercel CLI
```bash
vercel --prod
```

### 4. デプロイ後の確認

1. **ヘルスチェック**
   ```
   https://your-app.vercel.app/health
   ```

2. **ログインテスト**
   - https://your-app.vercel.app/login.html
   - テストアカウント作成して動作確認

3. **基本機能確認**
   - 顧客登録
   - 予約作成
   - SMS送信（Twilio設定済みの場合）

## 🔍 トラブルシューティング

### エラーが発生した場合

1. **Vercelのログを確認**
   - Functions タブでエラーログ確認
   - Build ログで依存関係エラーチェック

2. **環境変数の確認**
   - すべて正しく設定されているか
   - Production環境に設定されているか

3. **よくある問題**
   - CORS エラー: `ALLOWED_ORIGINS` に正しいURLを設定
   - タイムアウト: 重い処理を非同期化
   - Module not found: `node_modules` キャッシュクリア

## 📊 デプロイ後のモニタリング

1. **Vercelダッシュボード**
   - リアルタイムログ
   - エラー率
   - レスポンスタイム

2. **アプリケーション監視**
   - `/api/monitoring/dashboard` エンドポイント（実装済み）
   - エラーアラート設定

## 🎉 デプロイ完了後

1. **カスタムドメイン設定**（オプション）
2. **SSL証明書確認**（Vercelが自動設定）
3. **バックアップスケジュール確認**
4. **モニタリングアラート設定**

---

問題が発生した場合は、`/docs` ディレクトリの詳細なドキュメントを参照してください。