# 🚀 開発環境セットアップガイド

## 📋 前提条件
- Node.js (v14以上)
- npm または yarn
- Git

## 🔧 初期セットアップ

### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd 017_SMS
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集
nano .env
```

必要な環境変数:
```env
# サーバー設定
PORT=3002
NODE_ENV=development

# JWT設定
JWT_SECRET=your-secret-key-here

# Supabase設定（オプション）
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Twilio設定（SMSを実際に送信する場合）
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

## 🏃‍♀️ 開発サーバーの起動

### 基本的な起動方法

#### 1. シンプル版（推奨）
```bash
npm run dev
# または
npm start
```
- ポート: 3002
- ホットリロード対応（nodemon使用）
- メモリベースのストレージ

#### 2. フル機能版
```bash
npm run dev:full
# または
npm run start:full
```
- 全機能が有効
- より多くのメモリを使用

#### 3. Supabase統合版
```bash
npm run dev:supabase
# または
npm run start:supabase
```
- Supabaseデータベース使用
- 永続的なデータ保存

## 🛠️ 利用可能なスクリプト

```bash
# 開発サーバー（ホットリロード付き）
npm run dev              # シンプル版
npm run dev:full         # フル機能版
npm run dev:supabase     # Supabase版

# 本番サーバー
npm start               # シンプル版
npm run start:full      # フル機能版
npm run start:supabase  # Supabase版

# テスト
npm test                # 全テスト実行
npm run test:watch      # ウォッチモード
npm run test:unit       # 単体テストのみ
npm run test:integration # 統合テストのみ

# コード品質
npm run lint            # ESLintチェック

# データベース
npm run init-db         # データベース初期化
npm run migrate:supabase # Supabaseへ移行
```

## 🌐 アクセスURL

開発サーバー起動後:

- **ランディングページ**: http://localhost:3002/landing.html
- **ログイン**: http://localhost:3002/login-new.html
- **ダッシュボード**: http://localhost:3002/dashboard.html
- **API ドキュメント**: http://localhost:3002/api-docs

### SMS機能エンドポイント
- **ステータス**: http://localhost:3002/api/sms/status
- **キャンペーン**: http://localhost:3002/api/sms/campaigns
- **テンプレート**: http://localhost:3002/api/sms/templates
- **一括送信**: http://localhost:3002/api/sms/bulk

## 🧪 テストアカウント

```
Email: test@salon-lumiere.com
Password: password123
```

## 📱 SMS機能の開発

### テストSMS送信
```bash
# テストスクリプトを実行
node scripts/test-sms.js

# シンプルテスト
node scripts/simple-test.js
```

### SMS機能の確認
1. ログイン
2. SMS > キャンペーン管理へアクセス
3. テンプレート作成
4. キャンペーン作成
5. テスト送信

## 🐛 デバッグ

### ログの確認
```bash
# サーバーログ
tail -f server.log

# エラーログ
tail -f logs/error.log

# SMS送信ログ
tail -f logs/sms-*.log
```

### よくある問題

#### ポート3002が使用中
```bash
# 使用中のプロセスを確認
lsof -ti:3002

# プロセスを終了
lsof -ti:3002 | xargs kill -9

# サーバー再起動
npm run dev
```

#### 依存関係エラー
```bash
# node_modulesを削除
rm -rf node_modules package-lock.json

# 再インストール
npm install

# サーバー起動
npm run dev
```

## 🔄 ホットリロード

nodemonが自動的に以下のファイル変更を検知:
- *.js
- *.json
- *.html
- *.css

設定ファイル: `nodemon.json`（存在する場合）

## 📊 開発ツール

### API テスト（Postman/Insomnia）
1. コレクションをインポート: `/docs/api-collection.json`
2. 環境変数を設定
3. ログイン → トークン取得
4. 各エンドポイントをテスト

### データベース確認
- メモリDB: ログで確認
- Supabase: Supabaseダッシュボードで確認

## 🚀 次のステップ

1. **機能開発**
   - `/src`ディレクトリで開発
   - ホットリロードで即座に反映

2. **テスト作成**
   - `/tests`ディレクトリにテスト追加
   - `npm run test:watch`で自動実行

3. **ドキュメント更新**
   - `/docs`ディレクトリに追加
   - README.mdを更新

## 🤝 貢献方法

1. フィーチャーブランチを作成
2. コードを実装
3. テストを追加
4. `npm run lint`でコードチェック
5. プルリクエストを作成

---

開発環境のセットアップは以上です。問題があれば Issues で報告してください。