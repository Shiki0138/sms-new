#!/bin/bash

echo "🔍 Vercel API経由でProject IDを取得します..."
echo ""
echo "⚠️  Vercelトークンが必要です"
echo ""

# トークンの入力を求める
echo -n "Vercelトークンを入力してください (表示されません): "
read -s VERCEL_TOKEN
echo ""
echo ""

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ トークンが入力されませんでした"
    echo ""
    echo "トークンの取得方法:"
    echo "1. https://vercel.com/account/tokens にアクセス"
    echo "2. 既存のトークンを使用するか、新しいトークンを作成"
    exit 1
fi

echo "📋 プロジェクト一覧を取得中..."
echo ""

# プロジェクト一覧を取得してsms-newを探す
RESPONSE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects?teamId=shikis-projects-6e27447a")

# エラーチェック
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ エラーが発生しました:"
    echo "$RESPONSE" | python3 -m json.tool
    echo ""
    echo "別のteamIdで試してみます..."
    echo ""
    
    # teamIdなしで試す
    RESPONSE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v9/projects")
fi

# sms-newプロジェクトを探す
PROJECT_INFO=$(echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for project in data.get('projects', []):
    if project['name'] == 'sms-new':
        print(f\"Project ID: {project['id']}\")
        print(f\"Account ID: {project.get('accountId', 'N/A')}\")
        print(f\"Team ID: {project.get('teamId', 'N/A')}\")
        break
else:
    print('Project not found')
")

if [ "$PROJECT_INFO" = "Project not found" ]; then
    echo "❌ プロジェクト 'sms-new' が見つかりませんでした"
    echo ""
    echo "全プロジェクトリスト:"
    echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for project in data.get('projects', []):
    print(f\"- {project['name']} (ID: {project['id']})\")
"
else
    echo "✅ プロジェクト情報を取得しました:"
    echo ""
    echo "$PROJECT_INFO"
    echo ""
    echo "=================================="
    echo "📋 GitHubシークレットに設定する値:"
    echo "=================================="
    
    # IDを抽出
    PROJECT_ID=$(echo "$PROJECT_INFO" | grep "Project ID:" | cut -d' ' -f3)
    ACCOUNT_ID=$(echo "$PROJECT_INFO" | grep "Account ID:" | cut -d' ' -f3)
    
    echo ""
    echo "VERCEL_PROJECT_ID: $PROJECT_ID"
    echo "VERCEL_ORG_ID: $ACCOUNT_ID"
    echo ""
    echo "👉 https://github.com/Shiki0138/sms-new/settings/secrets/actions"
    echo "   で上記の値を設定してください"
fi