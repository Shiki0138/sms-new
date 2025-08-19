# 🚨 デプロイメント復旧プラン

## 現在の状況
GitHub ActionsでVercelデプロイが以下のエラーで失敗しています：
- `Project not found` エラー
- `No Project Settings found locally` エラー

## 🛠️ 即座に試せる解決策

### オプション1: 自動修復スクリプト（推奨）
```bash
./fix-vercel-deployment.sh
```
このスクリプトは：
- 既存の設定をクリア
- 新しいプロジェクトとしてデプロイ
- 正しいProject IDを取得
- GitHubシークレット用の値を表示

### オプション2: 手動でのシンプルデプロイ
```bash
# 設定をクリア
rm -rf .vercel

# 新しい名前でデプロイ
npx vercel --prod --yes --name salon-lumiere-$(date +%s)
```

### オプション3: GitHub Actionsの手動実行
1. https://github.com/Shiki0138/sms-new/actions
2. "Simple Deploy to Vercel" ワークフローを選択
3. "Run workflow" をクリック

## 🔄 追加したワークフロー

### 1. `simple-deploy.yml`
- シンプルな直接デプロイ
- Project ID不要
- 自動的に名前を試行

### 2. `fallback-deploy.yml`
- 手動実行専用
- 完全に新しいプロジェクト作成
- 最終手段として使用

### 3. 修正した `deploy.yml`
- エラー時の代替手順追加
- デバッグ情報表示
- 複数のデプロイ方法を試行

## 📋 成功後の手順

デプロイが成功したら：

1. **新しいProject IDをGitHubに設定**
   - https://github.com/Shiki0138/sms-new/settings/secrets/actions
   - `VERCEL_PROJECT_ID` と `VERCEL_ORG_ID` を更新

2. **ドメインの確認**
   - 新しいプロジェクトのURLを確認
   - 必要に応じてカスタムドメインを設定

3. **古いプロジェクトのクリーンアップ**
   - Vercelダッシュボードで不要なプロジェクトを削除

## 🎯 最も確実な方法

**今すぐ実行**:
```bash
./fix-vercel-deployment.sh
```

このスクリプトが最も確実で、成功率が高い方法です。実行後、表示される指示に従ってGitHubシークレットを更新してください。

## 🆘 緊急時の手動デプロイ

GitHub Actionsが完全に動作しない場合：
```bash
# 最新のコードを手動でデプロイ
npx vercel --prod
```

これで少なくともサイトは最新の状態に更新されます。