# 🚀 GitHub Actions クイックセットアップ

GitHub Actionsの自動化が設定されました！以下の手順で有効化してください。

## 📋 必要な作業（3ステップ）

### 1️⃣ Vercelトークンの取得（2分）

1. https://vercel.com/account/tokens にアクセス
2. 「Create」ボタンをクリック
3. トークン名: `github-actions-sms-new` と入力
4. 「Create Token」をクリック
5. **表示されたトークンをコピー**（一度しか表示されません！）

### 2️⃣ Vercelプロジェクト情報の取得（1分）

Vercelダッシュボードから：
1. https://vercel.com/dashboard にアクセス
2. `sms-new` プロジェクトをクリック
3. Settings → General に移動
4. 以下をメモ：
   - **Project ID**: （プロジェクト設定に表示）
   - **Team ID**: （URLまたは設定に表示）

### 3️⃣ GitHubシークレットの設定（3分）

1. https://github.com/Shiki0138/sms-new/settings/secrets/actions にアクセス
2. 「New repository secret」をクリックして、以下を追加：

| Secret Name | Value |
|------------|--------|
| `VERCEL_TOKEN` | 手順1でコピーしたトークン |
| `VERCEL_ORG_ID` | 手順2のTeam ID |
| `VERCEL_PROJECT_ID` | 手順2のProject ID |

## ✅ 確認方法

設定が完了したら：
1. このファイルを少し編集（スペース追加など）
2. コミット＆プッシュ
3. https://github.com/Shiki0138/sms-new/actions で実行状況を確認

## 🎉 自動化される内容

- **mainブランチへのプッシュ** → 本番環境へ自動デプロイ
- **プルリクエスト作成** → プレビュー環境を自動作成
- **毎週月曜日** → セキュリティスキャン実行
- **依存関係の更新** → Dependabotが自動でPR作成

## ❓ トラブルシューティング

デプロイが失敗する場合：
- シークレットの値が正しいか確認
- Vercelプロジェクトがアクティブか確認
- Actions タブのログでエラー詳細を確認

---

設定は以上です！コードをプッシュすると自動的にデプロイされます 🚀