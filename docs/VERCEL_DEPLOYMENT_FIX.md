# Vercel Deployment Fix Guide

## 問題
GitHub ActionsでVercelデプロイが失敗する（トークンエラー）

## 解決手順

### 1. Vercelトークンの生成・更新

1. **Vercel Dashboardにアクセス**
   - https://vercel.com/account/tokens

2. **新しいトークンを作成**
   - "Create Token"をクリック
   - Name: `github-actions-sms-new`
   - Scope: `Full Account`
   - Expiration: `No Expiration`（推奨）

3. **トークンをコピー**
   - 生成されたトークンを安全な場所にコピー

### 2. GitHub Secretsの更新

1. **GitHub リポジトリの設定ページにアクセス**
   - https://github.com/Shiki0138/sms-new/settings/secrets/actions

2. **VERCEL_TOKEN を更新**
   - 既存の`VERCEL_TOKEN`を選択
   - "Update secret"をクリック
   - 新しいトークンを貼り付け

3. **その他のSecrets確認**
   ```
   VERCEL_ORG_ID: (確認済み)
   VERCEL_PROJECT_ID: prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc
   VERCEL_TOKEN: (新しく更新したトークン)
   ```

### 3. 環境変数の設定

#### Vercel Project環境変数設定
1. **Vercel Dashboardにアクセス**
   - https://vercel.com/shiki0138/sms-new/settings/environment-variables

2. **必須環境変数を設定**
   ```
   JWT_SECRET=<32文字以上のランダム文字列>
   ADMIN_EMAIL=your-admin@yourdomain.com
   ADMIN_PASSWORD=YourSecurePassword123!
   ALLOWED_ORIGINS=https://sms-new-shiki0138.vercel.app
   NODE_ENV=production
   ```

#### セキュアな値の生成
```bash
# JWT Secret生成（32文字以上）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 手動デプロイの実行

#### GitHub Actionsから手動実行
1. **Actions タブにアクセス**
   - https://github.com/Shiki0138/sms-new/actions

2. **"Manual Deploy to Vercel"を選択**
   - "Run workflow"をクリック
   - Environment: `production`を選択
   - "Run workflow"を実行

#### ローカルから直接デプロイ
```bash
# Vercel CLIでデプロイ
vercel --prod

# または環境変数を指定してデプロイ
VERCEL_TOKEN=<新しいトークン> vercel --prod
```

### 5. デプロイ確認

#### デプロイ成功の確認
1. **GitHub Actions ログ確認**
   - デプロイが成功しているかチェック

2. **Vercel Dashboard確認**
   - https://vercel.com/shiki0138/sms-new
   - 最新デプロイの状態確認

3. **本番サイト動作確認**
   - https://sms-new-shiki0138.vercel.app
   - ログイン画面の表示確認
   - 基本機能の動作確認

### トラブルシューティング

#### よくある問題と解決方法

1. **"Project not found"エラー**
   ```bash
   # プロジェクトIDを確認
   vercel project ls
   
   # .vercelディレクトリを削除して再リンク
   rm -rf .vercel
   vercel link
   ```

2. **環境変数が読み込まれない**
   - Vercel Dashboardで環境変数を再確認
   - Production環境に設定されているか確認

3. **CORS エラー**
   - `ALLOWED_ORIGINS`にVercelドメインを追加
   - カンマ区切りで複数ドメイン設定可能

### セキュリティチェックリスト

- [ ] JWT_SECRETが32文字以上
- [ ] ADMIN_PASSWORDが8文字以上で複雑
- [ ] ALLOWED_ORIGINSに本番ドメインのみ設定
- [ ] GitHub Secretsに機密情報が適切に設定
- [ ] Vercel環境変数が本番環境用に設定

## 完了後の確認事項

1. **GitHub Actions成功**
2. **Vercelデプロイ成功**
3. **本番サイト正常動作**
4. **ログイン機能動作**
5. **CORS設定正常**

これらの手順完了後、システムが正常にデプロイされ、セキュアな状態で稼働します。