#!/bin/bash

echo "🔍 Vercel Project情報を別の方法で取得します..."

# 現在のユーザーを確認
USER=$(npx vercel whoami)
echo "ユーザー: $USER"

# プロジェクト一覧から sms-new の情報を取得
echo ""
echo "📋 プロジェクト 'sms-new' の詳細を取得中..."

# Vercel プロジェクトをインスペクト
npx vercel inspect sms-new

echo ""
echo "=================================="
echo "🔑 GitHubシークレットの設定方法:"
echo "=================================="
echo ""
echo "1. 上記の出力から以下の情報を確認:"
echo "   - id: これが VERCEL_PROJECT_ID"
echo "   - accountId または ownerId: これが VERCEL_ORG_ID"
echo ""
echo "2. https://github.com/Shiki0138/sms-new/settings/secrets/actions"
echo "   でシークレットを更新"
echo ""
echo "3. 形式の例:"
echo "   VERCEL_PROJECT_ID: prj_xxxxxxxxxxxxx"
echo "   VERCEL_ORG_ID: team_xxxxxxxxxxxxx"
echo ""

# 別の方法：API経由での取得を案内
echo "=================================="
echo "🔄 代替方法（APIを使用）:"
echo "=================================="
echo ""
echo "Vercelトークンをお持ちの場合、以下のコマンドも使えます:"
echo ""
echo 'curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \'
echo '  https://api.vercel.com/v2/projects | jq ".projects[] | select(.name==\"sms-new\")"'
echo ""