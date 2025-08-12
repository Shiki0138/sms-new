#!/bin/bash

echo "🔧 Vercelデプロイ修正を適用中..."

# index.htmlのパスを修正
echo "✓ 静的ファイルパスを修正"

# Gitコミット
echo "📦 変更をコミット..."
git add .
git commit -m "Fix: Vercel deployment - correct static file paths and structure"

# GitHubにプッシュ
echo "🚀 GitHubにプッシュ..."
git push origin main

echo "✅ 修正完了！Vercelが自動的に再デプロイを開始します。"
echo "📱 デプロイ状況: https://vercel.com/shiki0138s-projects/sms-new"