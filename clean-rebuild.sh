#!/bin/bash
# 完全なクリーンビルドスクリプト

echo "🧹 クリーンアップ開始..."

# 1. プロセスを停止
echo "既存のプロセスを停止..."
pkill -f "npm run dev" || true
pkill -f "vite" || true

# 2. キャッシュとビルドファイルを削除
echo "キャッシュを削除..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .parcel-cache
rm -rf .next

# 3. 問題のあるファイルを確認
echo "ファイル構造を確認..."
ls -la src/contexts/PlanLimits*

# 4. node_modulesを再インストール（オプション）
read -p "node_modulesを再インストールしますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "node_modulesを削除..."
    rm -rf node_modules
    echo "依存関係を再インストール..."
    npm install
fi

# 5. 開発サーバーを起動
echo "✅ クリーンアップ完了！"
echo "開発サーバーを起動..."
npm run dev