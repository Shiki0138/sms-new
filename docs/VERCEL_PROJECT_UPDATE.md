# 🚀 Vercel プロジェクト設定更新ガイド

## 📋 現在の状況

- **プロジェクト名**: `sms-new`
- **プロジェクトID**: `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc`
- **問題**: Vercelトークンが無効

## 🔧 必要な対応

### 1. GitHub Secretsの更新

以下の3つのシークレットを更新する必要があります：

| シークレット名 | 値 | 状態 |
|---|---|---|
| `VERCEL_PROJECT_ID` | `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc` | ✅ 正しい値を確認済み |
| `VERCEL_ORG_ID` | Vercelダッシュボードで確認 | ❓ 要確認 |
| `VERCEL_TOKEN` | 新しく生成必要 | ❌ 無効 |

### 2. 新しいVercelトークンの生成

#### 手順：

1. **Vercelトークンページにアクセス**
   ```
   https://vercel.com/account/tokens
   ```

2. **新しいトークンを作成**
   - `Create` ボタンをクリック
   - **Token Name**: `github-actions-sms-new-2025`
   - **Scope**: `Full Account` （必須！）
   - **Expiration**: `No Expiration` または長期間

3. **トークンをコピー**
   - 形式: `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **重要**: トークンは一度しか表示されません！

### 3. GitHub Secretsの設定

1. **GitHub Secretsページを開く**
   ```
   https://github.com/Shiki0138/sms-new/settings/secrets/actions
   ```

2. **各シークレットを更新**

   #### VERCEL_PROJECT_ID
   - 鉛筆アイコンをクリック
   - 値: `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc`
   - `Update secret` をクリック

   #### VERCEL_ORG_ID
   - Vercelダッシュボードで確認した値を入力
   - 個人アカウントの場合は、ユーザーIDを使用

   #### VERCEL_TOKEN
   - 新しく生成したトークンを貼り付け
   - 前後のスペースがないことを確認

### 4. トークンのテスト

```bash
# ローカルでテスト
export VERCEL_TOKEN="vercel_新しいトークン"
npx vercel whoami

# 成功すれば、ユーザー名が表示されます
# 例: > shiki0138
```

### 5. デプロイの再実行

1. GitHub Actionsページにアクセス
   ```
   https://github.com/Shiki0138/sms-new/actions
   ```

2. 失敗したワークフローを選択

3. `Re-run failed jobs` をクリック

## 🎯 Quick Check リスト

- [ ] 新しいVercelトークンを生成した
- [ ] トークンに `Full Account` 権限がある
- [ ] VERCEL_PROJECT_ID = `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc`
- [ ] VERCEL_ORG_IDを確認・設定した
- [ ] VERCEL_TOKENを新しいトークンに更新した
- [ ] ローカルでトークンをテストした

## 🆘 トラブルシューティング

### それでもエラーが出る場合

1. **別のトークンを作成**
   - 異なる名前で再度作成
   - Personal Accountで作成することを確認

2. **手動デプロイでテスト**
   ```bash
   # プロジェクトIDを指定して直接デプロイ
   VERCEL_PROJECT_ID="prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc" \
   VERCEL_TOKEN="新しいトークン" \
   npx vercel --prod
   ```

3. **Vercelプロジェクトの確認**
   ```bash
   # プロジェクト一覧を表示
   VERCEL_TOKEN="新しいトークン" npx vercel projects ls
   
   # sms-new プロジェクトが表示されることを確認
   ```

## 📌 重要な注意事項

- トークンの `vercel_` プレフィックスを含めて全体をコピー
- トークンの前後にスペースや改行を入れない
- `Full Account` 権限が必須
- プロジェクトIDは正確に `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc` を使用

## 🔗 関連リンク

- [Vercel Token管理](https://vercel.com/account/tokens)
- [GitHub Secrets設定](https://github.com/Shiki0138/sms-new/settings/secrets/actions)
- [GitHub Actions](https://github.com/Shiki0138/sms-new/actions)
- [Vercelダッシュボード](https://vercel.com/dashboard)