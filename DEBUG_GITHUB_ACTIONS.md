# 🐛 GitHub Actions デバッグ手順

## 現在の状況
GitHub Actionsで `Project not found` エラーが継続しています。

## デバッグ情報を追加
ワークフローにデバッグステップを追加しました。次回のプッシュで以下が表示されます：
- VERCEL_ORG_ID の値
- VERCEL_PROJECT_ID の値  
- VERCEL_TOKEN が設定されているか

## 確認すべきポイント

### 1. GitHub Secretsの確認
https://github.com/Shiki0138/sms-new/settings/secrets/actions

設定されているシークレット:
- `VERCEL_TOKEN` ✓ (設定済み)
- `VERCEL_ORG_ID` ❓ (形式要確認)
- `VERCEL_PROJECT_ID` ❓ (形式要確認)

### 2. 正しいProject IDを取得

**最も確実な方法**: ローカルでリンク
```bash
./link-existing-project.sh
```

**手動確認**:
1. https://vercel.com/shikis-projects-6e27447a/sms-new にアクセス
2. ブラウザの開発者ツール (F12) を開く
3. Console タブで以下を実行:
```javascript
// ページの情報を確認
console.log(window.__NEXT_DATA__?.props?.pageProps?.project?.id);
```

### 3. 代替案: 新しいプロジェクト作成

現在のプロジェクトに接続できない場合:
```bash
# 新しい名前でデプロイ
npx vercel --name salon-lumiere-sms

# 成功したら .vercel/project.json を確認
cat .vercel/project.json
```

## 次の手順

1. **ローカルでProject IDを確認**
   ```bash
   ./link-existing-project.sh
   ```

2. **GitHubシークレットを更新**
   正確な値でVERCEL_PROJECT_ID と VERCEL_ORG_ID を設定

3. **GitHub Actionsを再実行**
   デバッグ情報でシークレットの値を確認

4. **それでも失敗する場合**
   - 新しいVercelプロジェクトを作成
   - または手動デプロイを使用

## 一時的な解決策

GitHub Actionsが動作するまでの間は、手動デプロイを使用:
```bash
# ローカルで実行
npx vercel --prod
```

これでサイトは更新され続けます。