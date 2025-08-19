#!/bin/bash

echo "🔧 Vercel環境変数設定スクリプト"
echo "================================="

# 必須環境変数の設定
echo "📝 必須環境変数を設定します..."

echo "1. SUPABASE_URL"
vercel env add SUPABASE_URL production

echo "2. SUPABASE_ANON_KEY"  
vercel env add SUPABASE_ANON_KEY production

echo "3. SUPABASE_SERVICE_ROLE_KEY"
vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo "4. JWT_SECRET"
vercel env add JWT_SECRET production

echo "5. SESSION_SECRET"
vercel env add SESSION_SECRET production

echo "6. NODE_ENV"
vercel env add NODE_ENV production

echo "✅ 環境変数設定完了！"
echo "🚀 本番デプロイを実行します..."

# 本番デプロイ
vercel --prod

echo "🎉 デプロイ完了！"