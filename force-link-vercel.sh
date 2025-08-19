#!/bin/bash

echo "🔗 Vercelプロジェクトに強制的にリンクします..."
echo ""

# 既存の.vercelを削除
rm -rf .vercel

# vercel.jsonの内容を確認
if [ -f "vercel.json" ]; then
    echo "📄 現在のvercel.json:"
    cat vercel.json
    echo ""
fi

echo "🚀 新しいデプロイを作成してプロジェクトIDを取得します..."
echo ""
echo "以下のプロンプトに答えてください:"
echo "- Setup and deploy? → Y"
echo "- Which scope? → あなたのスコープを選択"
echo "- Link to existing project? → Y"
echo "- What's the name of your existing project? → sms-new"
echo ""

# インタラクティブモードでVercelを実行
npx vercel

# .vercel/project.jsonが作成されたか確認
if [ -f ".vercel/project.json" ]; then
    echo ""
    echo "✅ プロジェクトのリンクに成功しました!"
    echo ""
    echo "📋 プロジェクト情報:"
    cat .vercel/project.json | python3 -m json.tool
    
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "=================================="
    echo "🔑 GitHubシークレットに設定する値:"
    echo "=================================="
    echo ""
    echo "VERCEL_PROJECT_ID: ${PROJECT_ID}"
    echo "VERCEL_ORG_ID: ${ORG_ID}"
    echo ""
    echo "👉 https://github.com/Shiki0138/sms-new/settings/secrets/actions"
    echo ""
else
    echo ""
    echo "❌ プロジェクトのリンクに失敗しました"
    echo ""
    echo "🔄 代替方法:"
    echo "1. ./get-project-id-api.sh を実行（Vercelトークンが必要）"
    echo "2. Vercelダッシュボードで手動確認"
fi