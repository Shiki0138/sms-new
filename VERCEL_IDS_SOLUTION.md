# ✅ Vercel ID 解決策

## 判明した情報

あなたのVercelチーム名から、以下の情報が判明しました：

- **Team/Org ID**: `shikis-projects-6e27447a`
- **プロジェクト名**: `sms-new`
- **プロジェクトURL**: https://vercel.com/shikis-projects-6e27447a/sms-new

## GitHub Secretsの設定

### 1. VERCEL_ORG_ID
```
shikis-projects-6e27447a
```

### 2. VERCEL_PROJECT_ID
Project IDを取得する方法：

**方法A: Vercelダッシュボードから**
1. https://vercel.com/shikis-projects-6e27447a/sms-new/settings にアクセス
2. ページの一番下までスクロール
3. "Project ID" の項目を探す（prj_で始まる文字列）

**方法B: ブラウザの開発者ツールから**
1. https://vercel.com/shikis-projects-6e27447a/sms-new を開く
2. F12キーで開発者ツールを開く
3. Networkタブを選択
4. ページをリロード
5. APIリクエストのレスポンスから `"id": "prj_xxxx"` を探す

**方法C: Vercel CLIで強制的にリンク**
```bash
# .vercelディレクトリを作成
mkdir -p .vercel

# project.jsonを手動作成（PROJECT_IDは仮の値）
cat > .vercel/project.json << EOF
{
  "projectId": "prj_NEED_TO_FIND",
  "orgId": "shikis-projects-6e27447a"
}
EOF

# Vercelにデプロイを試みる（エラーからProject IDが判明する場合がある）
npx vercel --prod --yes
```

## GitHubでの設定手順

1. https://github.com/Shiki0138/sms-new/settings/secrets/actions にアクセス

2. 以下のシークレットを設定/更新：
   - **VERCEL_ORG_ID**: `shikis-projects-6e27447a`
   - **VERCEL_PROJECT_ID**: Vercelダッシュボードで確認したprj_で始まるID
   - **VERCEL_TOKEN**: （既に設定済みなら変更不要）

## 確認方法

設定後、GitHub Actionsを再実行：
1. https://github.com/Shiki0138/sms-new/actions
2. 失敗したワークフローをクリック
3. "Re-run all jobs" をクリック

## トラブルシューティング

もし `shikis-projects-6e27447a` がORG_IDとして機能しない場合は、`team_` プレフィックスを付けてみてください：
```
team_shikis-projects-6e27447a
```

それでも動作しない場合は、Vercelサポートに問い合わせるか、新しいプロジェクトを作成してリンクすることを検討してください。