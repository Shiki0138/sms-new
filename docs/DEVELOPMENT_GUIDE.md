# 🚀 SMS美容室管理システム - 開発環境起動ガイド

## 📋 クイックスタート

### 方法1: ワンコマンド起動（推奨）
```bash
npm run dev:start
```

### 方法2: OS別スクリプト

**Mac/Linux:**
```bash
npm run dev:mac
# または
./scripts/dev-start.sh
```

**Windows:**
```bash
npm run dev:win
# または
scripts\dev-start.bat
```

### 方法3: 手動起動
```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定（オプション）
export PORT=3001
export NODE_ENV=development

# 3. サーバーの起動
npm start

# 4. ブラウザでアクセス
open http://localhost:3001
```

## 🔑 ログイン情報

- **URL**: http://localhost:3001
- **管理者アカウント**:
  - メール: `admin@salon.com`
  - パスワード: `admin123`

## 📁 プロジェクト構造

```
017_SMS/
├── src/                    # ソースコード
│   ├── server.js          # メインサーバー
│   ├── app.js             # Expressアプリケーション
│   ├── routes/            # APIルート
│   ├── middleware/        # ミドルウェア
│   └── models/            # データモデル
├── public/                # フロントエンド
│   ├── index.html         # メインページ
│   ├── css/               # スタイルシート
│   └── js/                # JavaScriptファイル
├── sms-service/           # SMS機能モジュール
├── scripts/               # 起動スクリプト
│   ├── dev-start.sh       # Mac/Linux用
│   ├── dev-start.bat      # Windows用
│   └── quick-start.js     # クロスプラットフォーム
└── docs/                  # ドキュメント

```

## 🛠️ 開発コマンド

```bash
# 開発サーバー起動（自動リロード付き）
npm run dev

# テスト実行
npm test

# テスト（ウォッチモード）
npm run test:watch

# リント
npm run lint

# ビルド
npm run build
```

## 🔧 トラブルシューティング

### ポートが使用中の場合
```bash
# Mac/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### 依存関係のエラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### サーバーが起動しない場合
1. Node.jsバージョンを確認（v14以上推奨）
2. `.env`ファイルの設定を確認
3. ログを確認: `npm start 2>&1 | tee server.log`

## 📱 機能確認チェックリスト

開発環境起動後、以下の機能を確認してください：

- [ ] ログイン画面の表示
- [ ] デモアカウントでのログイン
- [ ] ダッシュボードの統計情報表示
- [ ] 顧客一覧の表示
- [ ] 新規顧客の登録
- [ ] 顧客情報の編集
- [ ] 予約管理画面の確認
- [ ] スタッフ管理画面の確認

## 🚀 次のステップ

1. **データベース接続**
   - PostgreSQLまたはMySQLの設定
   - マイグレーションの実行

2. **SMS機能の有効化**
   ```bash
   npm install twilio aws-sdk bull winston
   ```

3. **本番環境へのデプロイ**
   - Vercelへのデプロイ: `vercel`
   - PM2での起動: `pm2 start ecosystem.config.js`

## 💡 開発のヒント

- `nodemon`を使用して自動リロード開発
- Chrome DevToolsでAPIレスポンスを確認
- VS Codeの拡張機能「Thunder Client」でAPI テスト
- ログは`console.log`ではなく`winston`を使用

## 📞 サポート

問題が解決しない場合は、以下を確認してください：
- プロジェクトのREADME.md
- GitHub Issues
- ログファイル（`logs/`ディレクトリ）