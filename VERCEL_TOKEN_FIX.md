# 🔑 Vercel Token エラー解決ガイド

## エラー内容
```
Error: The specified token is not valid. Use `vercel login` to generate a new token.
```

## 原因
GitHubに設定されたVERCEL_TOKENが：
1. 無効または期限切れ
2. 権限不足
3. 形式が間違っている

## 解決手順

### 1. 新しいVercelトークンを生成

1. **Vercelトークンページにアクセス**
   https://vercel.com/account/tokens

2. **新しいトークンを作成**
   - "Create" ボタンをクリック
   - トークン名: `github-actions-sms-new-2024`
   - Scope: `Full Account` を選択（重要！）
   - Expiration: `No Expiration` または長期間

3. **トークンをコピー**
   - 生成されたトークン全体をコピー
   - 形式: `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ このトークンは一度しか表示されません！

### 2. GitHubシークレットを更新

1. **GitHub Secretsページにアクセス**
   https://github.com/Shiki0138/sms-new/settings/secrets/actions

2. **VERCEL_TOKENを更新**
   - `VERCEL_TOKEN` の右側の鉛筆アイコンをクリック
   - 古い値を削除
   - 新しいトークンを貼り付け（前後のスペースなし）
   - "Update secret" をクリック

### 3. ローカルでトークンをテスト

新しいトークンが正しく動作するか確認：
```bash
# 環境変数に設定
export VERCEL_TOKEN="vercel_新しいトークン"

# テスト
npx vercel whoami
```

成功すれば、あなたのユーザー名が表示されます。

### 4. GitHub Actionsを再実行

1. https://github.com/Shiki0138/sms-new/actions
2. 失敗したワークフローをクリック
3. "Re-run failed jobs" をクリック

## トークンの形式確認

### ✅ 正しい形式
```
vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ❌ 間違った形式
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    # プレフィックスなし
"vercel_xxxxx"                      # クォーテーション付き
vercel_xxxxx                        # 短すぎる
Bearer vercel_xxxxx                 # Bearerプレフィックス付き
```

## トラブルシューティング

### それでもエラーが出る場合

1. **別のトークンを作成**
   - 異なる名前で新しいトークンを作成
   - Full Account権限を確実に選択

2. **Personal Accountで確認**
   - Team accountではなくPersonal accountでトークンを作成
   - https://vercel.com/account/tokens でアカウントを切り替え

3. **手動デプロイでテスト**
   ```bash
   # ローカルで直接テスト
   VERCEL_TOKEN="新しいトークン" npx vercel --prod
   ```

## 代替案

### GitHub Actions を一時的に無効化
```yaml
# .github/workflows/deploy.yml の最初に追加
on:
  workflow_dispatch:  # 手動実行のみに変更
```

### ローカルから手動デプロイ
```bash
npx vercel --prod
```

## 重要な注意点

- トークンは一度しか表示されない
- Full Account権限が必要
- Team設定によっては追加の権限が必要な場合がある
- トークンの前後にスペースを入れない