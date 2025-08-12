#!/bin/bash

# Gitの設定とプッシュ
echo "🚀 GitHubへのプッシュを開始..."

# 既存の.gitディレクトリを削除
rm -rf .git

# 新しくGitリポジトリを初期化
git init

# リモートリポジトリを追加
git remote add origin https://github.com/Shiki0138/sms-new.git

# すべてのファイルを追加
git add .

# コミット
git commit -m "SMS美容室管理システム - Vercel対応版"

# mainブランチに切り替え
git branch -M main

# GitHubにプッシュ
git push -u origin main --force

echo "✅ GitHubへのプッシュが完了しました！"
echo "🔄 Vercelが自動的にデプロイを開始します..."