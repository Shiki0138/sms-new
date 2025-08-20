#!/bin/bash

echo "🔑 Vercel Token テストツール"
echo "================================"
echo ""
echo "このスクリプトは、Vercelトークンが有効かどうかをテストします。"
echo ""

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# トークンの入力を求める
echo -n "Vercelトークンを入力してください (表示されません): "
read -s VERCEL_TOKEN
echo ""
echo ""

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ トークンが入力されませんでした${NC}"
    exit 1
fi

# トークンの形式をチェック
echo "📋 トークン情報:"
echo "- 長さ: ${#VERCEL_TOKEN} 文字"
echo "- 開始文字: ${VERCEL_TOKEN:0:7}..."
echo ""

# vercel_ プレフィックスのチェック
if [[ $VERCEL_TOKEN == vercel_* ]]; then
    echo -e "${GREEN}✅ トークン形式: 正しい (vercel_ プレフィックス)${NC}"
else
    echo -e "${YELLOW}⚠️  警告: トークンが 'vercel_' で始まっていません${NC}"
fi
echo ""

# トークンの有効性をテスト
echo "🔍 トークンの有効性をテスト中..."
export VERCEL_TOKEN

# whoami コマンドでテスト
if RESULT=$(npx vercel whoami 2>&1); then
    echo -e "${GREEN}✅ トークンは有効です！${NC}"
    echo "ユーザー: $RESULT"
    echo ""
    
    # プロジェクト一覧を取得
    echo "📋 アクセス可能なプロジェクト:"
    npx vercel projects ls --token="$VERCEL_TOKEN" 2>/dev/null | head -10
    
    echo ""
    echo -e "${GREEN}🎉 このトークンをGitHub Secretsに設定してください${NC}"
    echo "https://github.com/Shiki0138/sms-new/settings/secrets/actions"
else
    echo -e "${RED}❌ トークンが無効です${NC}"
    echo "エラー: $RESULT"
    echo ""
    echo "解決方法:"
    echo "1. https://vercel.com/account/tokens で新しいトークンを作成"
    echo "2. 'Full Account' 権限を選択"
    echo "3. トークン全体をコピー（vercel_ プレフィックス含む）"
fi

echo ""
echo "================================"
echo "テスト完了"