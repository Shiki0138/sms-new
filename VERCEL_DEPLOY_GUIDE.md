# Vercel デプロイガイド

## 🚀 デプロイ準備完了

SMSシステムをVercelにデプロイする準備が整いました。

## 📋 デプロイ手順

### 1. Vercel CLIのインストール（まだの場合）
```bash
npm i -g vercel
```

### 2. プロジェクトのデプロイ

```bash
# プロジェクトルートで実行
vercel

# プロンプトに従って設定
# - Set up and deploy: Y
# - Which scope: （お使いのアカウントを選択）
# - Link to existing project?: N
# - Project Name: sms-new
# - In which directory is your code located?: ./
# - Want to modify settings?: N
```

または、設定済みの場合は：

```bash
vercel --prod
```

### 3. 環境変数の設定

Vercelダッシュボード（https://vercel.com/dashboard）で以下を設定：

#### バックエンドAPI（sms-backend-api）
```
JWT_SECRET=your-secure-random-string-here
NODE_ENV=production
```

### 4. APIエンドポイントの更新

デプロイ後、フロントエンドのAPIエンドポイントを更新：

1. `src/frontend/app.prod.js`を編集
2. `this.apiUrl`を実際のAPIのURLに変更：
   ```javascript
   this.apiUrl = 'https://sms-backend-api.vercel.app/api';
   ```

3. 再デプロイ：
   ```bash
   vercel --prod
   ```

## 🔗 アクセスURL

デプロイ完了後：
- フロントエンド: https://sms-new.vercel.app
- バックエンドAPI: https://sms-backend-api.vercel.app/api

## 📝 ログイン情報

```
Email: admin@salon.com
Password: admin123
```

## 🔧 トラブルシューティング

### CORSエラーが発生する場合
1. `api/index.js`のCORS設定を確認
2. フロントエンドのURLを`origin`に追加

### APIが動作しない場合
1. Vercelの関数ログを確認
2. 環境変数が正しく設定されているか確認

### ページが表示されない場合
1. `vercel.json`の設定を確認
2. ビルドログでエラーがないか確認

## 📦 ファイル構成

```
017_SMS/
├── api/
│   ├── index.js         # バックエンドAPI
│   └── package.json     # API依存関係
├── src/
│   └── frontend/
│       ├── index.html   # フロントエンドHTML
│       ├── app.js       # 開発用JS
│       └── app.prod.js  # 本番用JS
├── index.html           # ルートHTML（本番用）
├── vercel.json          # Vercel設定
└── .env.production      # 本番環境変数
```

## 🎯 次のステップ

1. カスタムドメインの設定
2. HTTPSの確認（Vercelが自動設定）
3. 本番データベースの接続
4. バックアップの設定
5. モニタリングの設定

---

デプロイの準備が整いました！上記の手順に従ってVercelにデプロイしてください。