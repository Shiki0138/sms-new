#!/bin/bash

echo "🚀 本番デプロイ前チェックを開始します..."

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーカウンター
ERROR_COUNT=0

# 1. Node.jsバージョンチェック
echo -e "\n📌 Node.jsバージョンチェック..."
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then 
    echo -e "${GREEN}✅ Node.js バージョン: v$NODE_VERSION (OK)${NC}"
else
    echo -e "${RED}❌ Node.js バージョンが古いです。v18.0.0以上が必要です。${NC}"
    ((ERROR_COUNT++))
fi

# 2. 必須ファイルの存在確認
echo -e "\n📌 必須ファイルチェック..."
REQUIRED_FILES=(
    "package.json"
    "vercel.json"
    "api/index.js"
    "src/server-simple.js"
    "public/index.html"
    "public/login.html"
    "public/dashboard.html"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file が見つかりません${NC}"
        ((ERROR_COUNT++))
    fi
done

# 3. 環境変数ファイルチェック
echo -e "\n📌 環境変数設定チェック..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example 存在${NC}"
else
    echo -e "${RED}❌ .env.example が見つかりません${NC}"
    ((ERROR_COUNT++))
fi

# 4. ビルドテスト
echo -e "\n📌 ビルドテスト..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ビルド成功${NC}"
else
    echo -e "${RED}❌ ビルドエラー${NC}"
    ((ERROR_COUNT++))
fi

# 5. 依存関係チェック
echo -e "\n📌 依存関係チェック..."
if npm list --depth=0 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 依存関係OK${NC}"
else
    echo -e "${YELLOW}⚠️  依存関係に問題がある可能性があります${NC}"
fi

# 6. セキュリティファイルチェック
echo -e "\n📌 セキュリティチェック..."
SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "*.key"
    "*.pem"
)

FOUND_SENSITIVE=0
for pattern in "${SENSITIVE_FILES[@]}"; do
    if ls $pattern 2>/dev/null | grep -v ".example" > /dev/null; then
        echo -e "${YELLOW}⚠️  センシティブファイル検出: $pattern${NC}"
        FOUND_SENSITIVE=1
    fi
done

if [ $FOUND_SENSITIVE -eq 0 ]; then
    echo -e "${GREEN}✅ センシティブファイルは.gitignoreされています${NC}"
fi

# 7. package.jsonの確認
echo -e "\n📌 package.json検証..."
if grep -q '"start":' package.json && grep -q '"build":' package.json; then
    echo -e "${GREEN}✅ 必須スクリプト存在${NC}"
else
    echo -e "${RED}❌ startまたはbuildスクリプトが見つかりません${NC}"
    ((ERROR_COUNT++))
fi

# 結果サマリー
echo -e "\n======================================"
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ すべてのチェックをパスしました！${NC}"
    echo -e "${GREEN}デプロイの準備が整っています。${NC}"
    echo -e "\n次のステップ:"
    echo -e "1. Vercelダッシュボードで環境変数を設定"
    echo -e "2. git add . && git commit -m 'Production ready'"
    echo -e "3. git push origin main"
    echo -e "4. vercel --prod"
else
    echo -e "${RED}❌ $ERROR_COUNT 個のエラーが見つかりました。${NC}"
    echo -e "${RED}デプロイ前に問題を修正してください。${NC}"
    exit 1
fi

echo -e "======================================"