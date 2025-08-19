# 🔧 GitHub Actions エラー修正ガイド

## エラーの原因
`Project not found` エラーは、GitHubシークレットのIDが正しくないためです。

## 修正手順

### 1. Vercel CLIでプロジェクトIDを取得

ターミナルで以下を実行：

```bash
./get-vercel-ids.sh
```

以下のプロンプトが表示されたら：
- `Set up and deploy "~/Desktop/system/017_SMS"?` → **N** (No)
- `Link to existing project?` → **Y** (Yes)  
- `What's the name of your existing project?` → **sms-new**

### 2. 正しいIDの形式

正しいIDは以下の形式です：
- **Project ID**: `prj_` で始まる24文字の文字列
- **Org ID**: `team_` で始まる24文字の文字列

### 3. GitHubシークレットを更新

1. https://github.com/Shiki0138/sms-new/settings/secrets/actions にアクセス
2. 各シークレットの右側の鉛筆アイコンをクリックして編集
3. 正しい値に更新：
   - `VERCEL_PROJECT_ID`: prj_で始まるID
   - `VERCEL_ORG_ID`: team_で始まるID
   - `VERCEL_TOKEN`: そのまま（変更不要）

### 4. 代替方法：Vercel APIで確認

Vercelトークンをお持ちの場合、以下のコマンドで確認できます：

```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  https://api.vercel.com/v9/projects/sms-new
```

レスポンスから：
- `id`: VERCEL_PROJECT_ID として使用
- `accountId`: VERCEL_ORG_ID として使用

## よくある間違い

❌ **間違った例**:
```
VERCEL_PROJECT_ID: "sms-new"
VERCEL_ORG_ID: "shiki0138"
```

✅ **正しい例**:
```
VERCEL_PROJECT_ID: "prj_1234567890abcdefghijklmn"
VERCEL_ORG_ID: "team_1234567890abcdefghijklmn"
```

## 確認方法

修正後、GitHub Actionsを再実行：
1. https://github.com/Shiki0138/sms-new/actions
2. 失敗したワークフローをクリック
3. 「Re-run failed jobs」をクリック

成功すれば、自動デプロイが有効になります！