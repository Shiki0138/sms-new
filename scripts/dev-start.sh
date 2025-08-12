#!/bin/bash

# SMS美容室管理システム - 開発環境起動スクリプト

echo "🚀 SMS美容室管理システム 開発環境を起動します..."

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# プロジェクトディレクトリに移動
cd "$(dirname "$0")/.." || exit

# 既存のプロセスを終了
echo -e "${YELLOW}既存のプロセスを終了中...${NC}"
pkill -f "node src/server.js" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# 依存関係のインストール確認
echo -e "${YELLOW}依存関係を確認中...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}依存関係をインストール中...${NC}"
    npm install
fi

# 環境変数の設定
export NODE_ENV=development
export PORT=3001

# サーバー起動
echo -e "${GREEN}サーバーを起動中...${NC}"
npm start &

# サーバーの起動を待つ
echo -e "${YELLOW}サーバーの起動を待っています...${NC}"
sleep 5

# ブラウザを開く
echo -e "${GREEN}ブラウザを開いています...${NC}"
open http://localhost:3001

echo -e "${GREEN}✅ 開発環境が起動しました！${NC}"
echo ""
echo "📋 アクセス情報:"
echo "   URL: http://localhost:3001"
echo "   メール: admin@salon.com"
echo "   パスワード: admin123"
echo ""
echo "🛑 サーバーを停止するには: Ctrl+C"
echo ""

# フォアグラウンドでサーバーを維持
wait