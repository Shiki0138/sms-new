#!/bin/bash

echo "🔗 既存のVercelプロジェクトにリンクします..."
echo ""

# 既存の.vercelディレクトリを削除
rm -rf .vercel

echo "📝 手順："
echo "1. 以下のコマンドを実行"
echo "2. プロンプトで以下を選択:"
echo "   - Set up and deploy? → N (No)"
echo "   - Link to existing project? → Y (Yes)"
echo "   - What's the name of your existing project? → sms-new"
echo ""
echo "コマンドを実行します..."
echo ""

# バージョンを指定して実行
npx vercel@latest link

# 結果を確認
if [ -f ".vercel/project.json" ]; then
    echo ""
    echo "✅ リンクに成功しました！"
    echo ""
    echo "📋 プロジェクト情報:"
    cat .vercel/project.json | python3 -m json.tool
    
    PROJECT_ID=$(cat .vercel/project.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('projectId', 'NOT_FOUND'))")
    ORG_ID=$(cat .vercel/project.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('orgId', 'NOT_FOUND'))")
    
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
    echo "⚠️  重要: 上記の値をコピーして、GitHubシークレットに"
    echo "   正確に設定してください（前後のスペースなし）"
else
    echo ""
    echo "❌ リンクに失敗しました"
    echo ""
    echo "🔄 代替手段："
    echo "1. Vercelダッシュボードで手動確認"
    echo "   https://vercel.com/shikis-projects-6e27447a/sms-new/settings"
    echo ""
    echo "2. 新しいプロジェクトとしてデプロイ:"
    echo "   npx vercel --name sms-new-v2"
fi