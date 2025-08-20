# Vercel Token更新手順

## 問題
GitHub ActionsでVercelへのデプロイが失敗する（トークンエラー）

## 解決手順

### 1. 新しいVercelトークンを生成

1. [Vercel Dashboard](https://vercel.com/account/tokens)にアクセス
2. "Create Token"をクリック
3. トークン名を入力（例: `github-actions-sms-new`）
4. Scopeは"Full Account"を選択
5. 生成されたトークンをコピー

### 2. GitHub Secretsを更新

1. GitHubリポジトリの[Settings > Secrets and variables > Actions](https://github.com/Shiki0138/sms-new/settings/secrets/actions)にアクセス
2. 以下のSecretsを確認・更新:
   - `VERCEL_TOKEN`: 新しく生成したトークン
   - `VERCEL_ORG_ID`: Vercelのアカウント設定から取得
   - `VERCEL_PROJECT_ID`: `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc`（現在の値）

### 3. Vercel CLIでプロジェクトIDを確認

```bash
# Vercel CLIをインストール
npm i -g vercel

# ログイン
vercel login

# プロジェクト情報を取得
vercel project ls
```

### 4. 手動デプロイのテスト

```bash
# ローカルから直接デプロイ
vercel --prod
```

### 5. GitHub Actionsの再実行

1. GitHubの[Actions](https://github.com/Shiki0138/sms-new/actions)タブへ
2. 失敗したワークフローを選択
3. "Re-run jobs"をクリック

## トラブルシューティング

### トークンが無効と表示される場合
- トークンの有効期限を確認
- Scopeが正しいか確認
- Organization IDが正しいか確認

### プロジェクトが見つからない場合
```bash
# プロジェクトをリンク
vercel link

# プロジェクト設定を確認
cat .vercel/project.json
```

## 代替手段

### Vercel CLIで直接デプロイ
```bash
# 環境変数を設定
export VERCEL_TOKEN="your-token"
export VERCEL_ORG_ID="your-org-id"
export VERCEL_PROJECT_ID="prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc"

# デプロイ実行
vercel --prod --yes
```

### Vercel Dashboardから手動デプロイ
1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. "Deployments"タブで最新のコミットを確認
4. "Redeploy"をクリック