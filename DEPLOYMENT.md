# デプロイメント手順

## ローカルホスト接続問題の対処法

現在、ローカルホストでの開発サーバー接続に問題が発生しています。以下の方法で対処できます：

### 方法1: Vercelにデプロイして確認

1. **Vercel CLIのインストール**（まだの場合）:

```bash
npm i -g vercel
```

2. **Vercelにデプロイ**:

```bash
vercel
```

3. プロンプトに従って設定:
   - GitHubアカウントでログイン
   - プロジェクト名を確認
   - 環境変数を設定（.env.localの内容）

### 方法2: ngrokを使用してトンネリング

1. **ngrokのインストール**:

```bash
brew install ngrok
```

2. **別のターミナルで開発サーバーを起動**:

```bash
npm run dev -- --port 3000
```

3. **ngrokでトンネルを作成**:

```bash
ngrok http 3000
```

### 方法3: 別のポートで試す

```bash
npm run dev -- --port 8080
```

その後、http://localhost:8080 にアクセス

### 方法4: ビルドしてプレビュー

```bash
npm run build
npm run preview
```

### トラブルシューティング

1. **ファイアウォールの確認**:
   - macOSのシステム設定 > セキュリティとプライバシー > ファイアウォール
   - 受信接続を許可

2. **Chromeの設定確認**:
   - chrome://flags でローカルホスト関連の設定をリセット

3. **hostsファイルの確認**:

```bash
cat /etc/hosts
```

`127.0.0.1 localhost` が存在することを確認

4. **別のブラウザで試す**:
   - Safari
   - Firefox
   - Edge

## 環境変数の設定（Vercel）

Vercelダッシュボードで以下の環境変数を設定：

- `VITE_SUPABASE_URL`: Supabaseプロジェクトのurl
- `VITE_SUPABASE_ANON_KEY`: Supabaseのanon key
- `VITE_APP_NAME`: 美容サロン管理システム
- `VITE_APP_VERSION`: 1.0.0
