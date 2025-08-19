#!/bin/bash

echo "🔍 Vercel Project情報を取得します..."

# Vercelにログイン確認
echo "現在のユーザー: $(npx vercel whoami)"

# プロジェクトをリンク
echo ""
echo "📎 既存のプロジェクトにリンクします..."
echo "以下のプロンプトで:"
echo "1. 'Set up and deploy' と聞かれたら 'N' (No) を選択"
echo "2. 'Link to existing project?' と聞かれたら 'Y' (Yes) を選択"
echo "3. プロジェクト名として 'sms-new' を入力"
echo ""

npx vercel

# .vercel/project.jsonを確認
if [ -f ".vercel/project.json" ]; then
    echo ""
    echo "✅ プロジェクト情報:"
    cat .vercel/project.json | python3 -m json.tool
    
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "📋 GitHubシークレットに設定する値:"
    echo "=================================="
    echo "VERCEL_PROJECT_ID: ${PROJECT_ID}"
    echo "VERCEL_ORG_ID: ${ORG_ID}"
    echo "=================================="
    echo ""
    echo "👉 https://github.com/Shiki0138/sms-new/settings/secrets/actions"
    echo "   で上記の値を設定してください"
else
    echo "❌ プロジェクトのリンクに失敗しました"
fi