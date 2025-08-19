# Vercel Project ID と Org ID の正しい取得方法

## 方法1: Vercel CLIを使用（推奨）

1. ターミナルで以下を実行：
```bash
npx vercel whoami
```

2. 次に、プロジェクトディレクトリで：
```bash
npx vercel
```
- 既存のプロジェクトにリンクするか聞かれたら「Yes」
- `sms-new` プロジェクトを選択

3. `.vercel/project.json` が作成されたら：
```bash
cat .vercel/project.json
```

## 方法2: Vercelダッシュボードから取得

1. https://vercel.com/dashboard にログイン

2. プロジェクト `sms-new` をクリック

3. URLを確認：
   - URL例: `https://vercel.com/[username]/sms-new`
   - または: `https://vercel.com/[team-name]/sms-new`

4. Project Settings → General で確認：
   - **Project ID**: プロジェクト設定ページの下部に表示
   - **Team ID / Org ID**: 
     - 個人アカウントの場合: アカウント設定で確認
     - チームの場合: チーム設定で確認

## 方法3: Vercel APIを使用

1. https://vercel.com/account/tokens でトークンを確認

2. 以下のコマンドを実行（トークンを置き換えて）：
```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  https://api.vercel.com/v9/projects?search=sms-new
```

レスポンスから `id` (Project ID) と `ownerId` (Org ID) を取得

## よくある間違い

❌ **間違い**: プロジェクト名を使用
- `VERCEL_PROJECT_ID: "sms-new"` ← これは間違い

✅ **正解**: 実際のIDを使用
- `VERCEL_PROJECT_ID: "prj_xxxxxxxxxxxxxxxxxxxx"`
- `VERCEL_ORG_ID: "team_xxxxxxxxxxxxxxxxxxxx"`

## 確認方法

正しいIDの形式：
- **Project ID**: `prj_` で始まる文字列
- **Org ID**: `team_` で始まる文字列（チームの場合）
- **User ID**: `user_` で始まる文字列（個人の場合）

## トラブルシューティング

1. **403 Forbidden エラー**
   - トークンの権限を確認
   - プロジェクトへのアクセス権限を確認

2. **Project not found エラー**
   - IDが正しいか再確認
   - プロジェクトが存在するか確認
   - チーム/個人アカウントの設定が正しいか確認

3. **Invalid token エラー**
   - トークンが有効期限内か確認
   - トークンが正しくコピーされているか確認