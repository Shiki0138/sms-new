# 🚀 手動デプロイ手順

## GitHubへのプッシュ

ターミナルで以下のコマンドを順番に実行してください：

```bash
# 1. 既存の.gitディレクトリを削除
rm -rf .git

# 2. 新しくGitリポジトリを初期化
git init

# 3. リモートリポジトリを追加
git remote add origin https://github.com/Shiki0138/sms-new.git

# 4. すべてのファイルを追加
git add .

# 5. コミット
git commit -m "SMS美容室管理システム統合版"

# 6. mainブランチに設定
git branch -M main

# 7. GitHubにプッシュ（認証が必要な場合があります）
git push -u origin main --force
```

## Vercelでの確認

1. プッシュ後、Vercelが自動的にデプロイを開始します
2. https://vercel.com/shiki0138s-projects/sms-new でデプロイ状況を確認
3. デプロイ完了後、提供されるURLでアプリケーションにアクセス

## トラブルシューティング

### Git認証エラーの場合
```bash
# GitHubの個人アクセストークンを使用
git remote set-url origin https://YOUR_TOKEN@github.com/Shiki0138/sms-new.git
```

### Vercelビルドエラーの場合
- Vercelダッシュボードでビルドログを確認
- 環境変数の設定を確認（JWT_SECRET等）

## プロジェクト情報

- **GitHub**: https://github.com/Shiki0138/sms-new.git
- **Vercel Project ID**: prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc
- **主要機能**: SMS送信、美容室管理、日本語UI対応