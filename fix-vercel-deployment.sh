#!/bin/bash

echo "🔧 Vercel デプロイ問題の修正を試みます..."
echo ""

# 色の定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}1️⃣ 現在のVercel状態を確認...${NC}"
npx vercel whoami
echo ""

echo -e "${BLUE}2️⃣ 既存の設定をクリア...${NC}"
rm -rf .vercel
echo "✅ .vercelディレクトリを削除"
echo ""

echo -e "${BLUE}3️⃣ 新しいプロジェクトとしてデプロイを試行...${NC}"
echo "この方法では、新しいVercelプロジェクトが作成される可能性があります"
echo ""

# タイムスタンプ付きの名前で新しくデプロイ
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
NEW_PROJECT_NAME="sms-new-${TIMESTAMP}"

echo -e "${YELLOW}新しいプロジェクト名: ${NEW_PROJECT_NAME}${NC}"
echo ""

if npx vercel --prod --yes --name "${NEW_PROJECT_NAME}"; then
    echo ""
    echo -e "${GREEN}✅ デプロイに成功しました！${NC}"
    echo ""
    
    # .vercel/project.jsonが作成されていれば表示
    if [ -f ".vercel/project.json" ]; then
        echo -e "${BLUE}📋 新しいプロジェクト情報:${NC}"
        cat .vercel/project.json | python3 -m json.tool
        
        PROJECT_ID=$(cat .vercel/project.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('projectId', 'NOT_FOUND'))")
        ORG_ID=$(cat .vercel/project.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('orgId', 'NOT_FOUND'))")
        
        echo ""
        echo -e "${YELLOW}🔑 新しいGitHubシークレット値:${NC}"
        echo "=================================="
        echo "VERCEL_PROJECT_ID: ${PROJECT_ID}"
        echo "VERCEL_ORG_ID: ${ORG_ID}"
        echo "=================================="
        echo ""
        echo -e "${BLUE}👉 https://github.com/Shiki0138/sms-new/settings/secrets/actions${NC}"
        echo "   で上記の値に更新してください"
        echo ""
    fi
    
    echo -e "${YELLOW}📝 次のステップ:${NC}"
    echo "1. GitHubシークレットを新しい値で更新"
    echo "2. 古いVercelプロジェクトが不要なら削除"
    echo "3. ドメイン設定があれば新しいプロジェクトに移行"
    echo "4. GitHub Actionsを再実行してテスト"
    
else
    echo ""
    echo -e "${RED}❌ デプロイに失敗しました${NC}"
    echo ""
    echo -e "${YELLOW}🔄 代替案:${NC}"
    echo "1. Vercelにブラウザでログインして手動でプロジェクト作成"
    echo "2. GitHub Actionsを無効にして手動デプロイを使用"
    echo "3. 別のホスティングサービスを検討"
fi