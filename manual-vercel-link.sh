#!/bin/bash

echo "🔗 Vercelプロジェクトを手動でリンクします..."
echo ""

# .vercelディレクトリを作成
mkdir -p .vercel

# ユーザー情報を取得
USER=$(npx vercel whoami)
echo "現在のユーザー: $USER"

echo ""
echo "📝 以下の手順で手動設定を行います："
echo ""
echo "1. Vercelダッシュボードにアクセス:"
echo "   https://vercel.com/shikis-projects-6e27447a/sms-new/settings"
echo ""
echo "2. Settings → General で以下を確認:"
echo "   - Project ID (例: prj_xxxx...)"
echo "   - Team ID (チーム名の下に表示)"
echo ""
echo "3. 以下のコマンドを実行して .vercel/project.json を作成:"
echo ""
echo "cat > .vercel/project.json << EOF"
echo "{"
echo '  "projectId": "YOUR_PROJECT_ID",'
echo '  "orgId": "YOUR_ORG_ID"'
echo "}"
echo "EOF"
echo ""
echo "=================================="
echo "🎯 より簡単な方法："
echo "=================================="
echo ""
echo "Vercel ダッシュボードで:"
echo "1. プロジェクト sms-new をクリック"
echo "2. URLを確認: https://vercel.com/[team-id]/sms-new"
echo "3. ブラウザの開発者ツール (F12) を開く"
echo "4. Network タブで API リクエストを確認"
echo "5. projectId と orgId/teamId を探す"
echo ""
echo "または、Settings → General の最下部で"
echo "Project ID が表示されている場合があります"
echo ""
echo "=================================="
echo "📋 GitHubでの設定:"
echo "=================================="
echo "https://github.com/Shiki0138/sms-new/settings/secrets/actions"
echo ""
echo "必要なシークレット:"
echo "- VERCEL_PROJECT_ID: prj_で始まるID"
echo "- VERCEL_ORG_ID: team_で始まるID (shikis-projects-6e27447a の場合もあり)"
echo "- VERCEL_TOKEN: 既に設定済み"