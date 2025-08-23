# Vercel環境変数設定ガイド

## 必要な環境変数

Vercelのプロジェクト設定で以下の環境変数を設定してください：

### 1. JWT_SECRET
- **値**: `your-very-strong-secret-key-minimum-32-characters-long-production`
- **説明**: JWTトークンの署名に使用される秘密鍵（本番環境用に強力なものを生成）

### 2. ADMIN_EMAIL
- **値**: `admin@salon-lumiere.com`
- **説明**: 管理者アカウントのメールアドレス

### 3. ADMIN_PASSWORD
- **値**: `YourStrongAdminPassword123!`
- **説明**: 管理者アカウントのパスワード（本番環境用に変更推奨）

### 4. ALLOWED_ORIGINS
- **値**: `https://sms-new.vercel.app,http://localhost:3000,http://localhost:3001`
- **説明**: CORS許可するオリジン（カンマ区切り）

## 設定方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. "Settings" タブをクリック
4. "Environment Variables" セクションへ移動
5. 各環境変数を追加：
   - Key: 環境変数名
   - Value: 上記の値
   - Environment: Production, Preview, Development すべてにチェック
6. "Save" をクリック

## 設定後の確認

1. Vercelで再デプロイをトリガー（GitHubにプッシュまたは手動デプロイ）
2. デプロイ完了後、https://sms-new.vercel.app/login.html でログインテスト
3. 以下のアカウントでテスト：
   - Email: admin@salon-lumiere.com
   - Password: YourStrongAdminPassword123!

## トラブルシューティング

### ログイン後にリダイレクトされない場合
1. ブラウザの開発者ツールでコンソールエラーを確認
2. ネットワークタブで/api/auth/loginのレスポンスを確認
3. 環境変数が正しく設定されているか確認

### CORSエラーが発生する場合
ALLOWED_ORIGINSに本番URLが含まれているか確認