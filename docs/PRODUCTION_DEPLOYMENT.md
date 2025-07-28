# 本番環境デプロイガイド

## 環境変数の設定

### 1. Vercelでの環境変数設定

Vercelダッシュボードで以下の環境変数を設定してください：

#### 必須設定
```env
# Supabase（必須）
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# アプリケーション情報
VITE_APP_NAME=美容サロン管理システム
VITE_APP_VERSION=1.0.0
```

#### オプション設定（機能を有効化する場合）
```env
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Gemini AI（AI返信機能）
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 2. Supabaseの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで`database-schema.sql`を実行
3. Authentication > Settingsで以下を設定：
   - Email認証を有効化
   - サイトURLを本番URLに設定

### 3. GitHubシークレットの設定

GitHub リポジトリの Settings > Secrets で以下を設定：

```
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
VERCEL_TOKEN=your_vercel_token
```

## デプロイ手順

### 自動デプロイ（推奨）

1. mainブランチにプッシュ
   ```bash
   git push origin main
   ```

2. GitHub Actionsが自動的に以下を実行：
   - ビルド
   - テスト
   - Vercelへのデプロイ

### 手動デプロイ

```bash
# Vercel CLIでデプロイ
vercel --prod
```

## 本番環境での機能確認

### 1. 基本機能の確認

- [ ] ログイン・サインアップ
- [ ] ダッシュボード表示
- [ ] 顧客管理（作成・編集・削除）
- [ ] 予約管理（作成・編集・削除）
- [ ] メッセージ管理

### 2. 設定機能の確認

- [ ] 営業時間設定
- [ ] 休日設定
- [ ] スタッフ管理
- [ ] リマインダー設定

### 3. 連携機能の確認

- [ ] 休日が予約カレンダーに反映される
- [ ] 営業時間が予約可能時間に反映される
- [ ] プラン制限が正しく動作する

### 4. マーケティング機能の確認

- [ ] 一斉配信機能
- [ ] リマインダー設定
- [ ] 配信履歴

## トラブルシューティング

### エラー: Supabase接続エラー

環境変数が正しく設定されているか確認：
- `VITE_SUPABASE_URL`が正しいURL形式
- `VITE_SUPABASE_ANON_KEY`が正しいキー

### エラー: ビルドエラー

```bash
# ローカルでビルドを確認
npm run build
```

### エラー: 404 Not Found

Vercelの設定で以下を確認：
- Framework Preset: Vite
- Output Directory: dist

## 本番環境URL

デプロイ後、以下のURLでアクセス可能：
- Production: `https://your-project.vercel.app`
- Preview: `https://your-project-git-branch.vercel.app`

## セキュリティ注意事項

1. 環境変数には機密情報を含むため、公開リポジトリにはコミットしない
2. Supabaseのセキュリティルールを適切に設定
3. CORS設定を本番ドメインのみに制限

## 監視とログ

- Vercel Dashboard: デプロイ状況とエラーログ
- Supabase Dashboard: データベース使用状況とクエリログ
- GitHub Actions: CI/CDパイプラインの状態

## サポート

問題が発生した場合：
1. このドキュメントのトラブルシューティングを確認
2. Vercelのログを確認
3. Supabaseのログを確認