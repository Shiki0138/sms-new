# 🎯 GitHub Actions 最終解決策

## 問題の原因
`Project not found` エラーは、以下の原因が考えられます：

1. Project IDの形式が間違っている
2. Org IDが正しくない
3. トークンの権限不足

## 解決方法

### 方法1: スクリプトで自動取得（推奨）

```bash
./force-link-vercel.sh
```

プロンプトに答えて:
- Setup and deploy? → **Y**
- Which scope? → **shikis-projects-6e27447a** を選択
- Link to existing project? → **Y**
- Project name? → **sms-new**

### 方法2: Vercel APIで確認

```bash
./get-project-id-api.sh
```

Vercelトークンを入力すると、正確なProject IDとOrg IDが表示されます。

### 方法3: 手動で確認

1. **Vercelダッシュボードにログイン**
   https://vercel.com/dashboard

2. **プロジェクト sms-new をクリック**

3. **Settings → General に移動**
   https://vercel.com/shikis-projects-6e27447a/sms-new/settings

4. **ページ最下部で確認**
   - Project ID: `prj_` で始まる文字列
   - Team ID: ページ上部のチーム名の下

### 正しいIDの形式

✅ **正しい例**:
```
VERCEL_PROJECT_ID: prj_1234567890abcdefghijklmn
VERCEL_ORG_ID: team_1234567890abcdefghijklmn
```

または

```
VERCEL_PROJECT_ID: prj_1234567890abcdefghijklmn
VERCEL_ORG_ID: shikis-projects-6e27447a
```

❌ **間違った例**:
```
VERCEL_PROJECT_ID: sms-new
VERCEL_ORG_ID: shiki0138
```

## GitHub Secretsの更新

1. https://github.com/Shiki0138/sms-new/settings/secrets/actions

2. 各シークレットの鉛筆アイコンをクリックして編集

3. 正しい値を入力して「Update secret」

## 確認方法

1. GitHub Actions タブを開く
   https://github.com/Shiki0138/sms-new/actions

2. 失敗したワークフローをクリック

3. 「Re-run all jobs」をクリック

## それでも解決しない場合

### オプション1: 新しいVercelプロジェクトを作成
```bash
# 既存の設定を削除
rm -rf .vercel
rm vercel.json

# 新しくデプロイ
npx vercel --name sms-new-v2
```

### オプション2: Personal Accountを使用
Teamではなく個人アカウントでプロジェクトを作成し、そのIDを使用

### オプション3: Vercelサポートに問い合わせ
https://vercel.com/support で、Project IDが見つからない問題を報告

## デバッグ情報

もしProject IDがどうしても見つからない場合、以下の情報を教えてください：

1. Vercelダッシュボードのスクリーンショット
2. `npx vercel ls` の出力
3. Vercelプロジェクトの正確なURL

これらの情報があれば、より具体的な解決策を提供できます。