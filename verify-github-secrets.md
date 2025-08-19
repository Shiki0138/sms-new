# 🔑 GitHub Secrets 設定確認ガイド

## 必要なシークレット

GitHub Actionsが正常に動作するには、以下の3つのシークレットが必要です：

### 1. VERCEL_TOKEN ✅
- **取得方法**: https://vercel.com/account/tokens
- **形式**: `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **権限**: Write権限が必要

### 2. VERCEL_ORG_ID ❓
- **取得方法**: Vercelダッシュボードまたは API
- **形式**: `team_xxxxxxxxxxxxxxxxxxxx` または `shikis-projects-6e27447a`
- **確認**: https://vercel.com/shikis-projects-6e27447a

### 3. VERCEL_PROJECT_ID ❓  
- **取得方法**: プロジェクト設定ページ
- **形式**: `prj_xxxxxxxxxxxxxxxxxxxx`
- **確認**: https://vercel.com/shikis-projects-6e27447a/sms-new/settings

## 設定場所

https://github.com/Shiki0138/sms-new/settings/secrets/actions

## 現在のエラーの原因

ログから見ると：
```
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

これは以下のいずれかが原因です：

1. **VERCEL_TOKEN が設定されていない**
2. **VERCEL_TOKEN の値が間違っている**
3. **VERCEL_TOKEN の権限が不足している**

## 確認方法

### GitHub Actions ログで確認
最新の実行ログで以下をチェック：
- `VERCEL_TOKEN is set: true` になっているか
- エラーメッセージの詳細

### ローカルでテスト
```bash
# 環境変数にトークンを設定
export VERCEL_TOKEN="your_token_here"

# Vercelコマンドをテスト
npx vercel whoami
```

## 修正手順

### 手順1: トークンの再確認
1. https://vercel.com/account/tokens でトークンを確認
2. 必要に応じて新しいトークンを作成
3. トークン全体をコピー（プレフィックス含む）

### 手順2: GitHubシークレット更新
1. https://github.com/Shiki0138/sms-new/settings/secrets/actions
2. `VERCEL_TOKEN` の鉛筆アイコンをクリック
3. 新しい値を貼り付け（前後にスペースなし）
4. 「Update secret」をクリック

### 手順3: Project IDの取得
```bash
./fix-vercel-deployment.sh
```
このスクリプトで正しいProject IDとOrg IDを取得

### 手順4: GitHub Actionsの再実行
1. https://github.com/Shiki0138/sms-new/actions
2. 失敗したワークフローの「Re-run all jobs」をクリック

## 代替案

### GitHub Actionsが動作しない場合
```bash
# ローカルで手動デプロイ
npx vercel --prod
```

### 新しいプロジェクトとして作成
```bash
# 新しい名前でデプロイ
npx vercel --prod --name salon-lumiere-new
```

## トラブルシューティング

### よくある間違い
- ❌ トークンの一部のみコピー
- ❌ 古い/無効なトークンを使用
- ❌ 権限不足のトークン
- ❌ 前後に余分なスペース

### 正しい設定例
- ✅ `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- ✅ `prj_xxxxxxxxxxxxxxxxxxxxx`
- ✅ `team_xxxxxxxxxxxxxxxxxxxxx`