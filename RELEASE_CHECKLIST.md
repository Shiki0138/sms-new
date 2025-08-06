# 🚀 Salon Light Plan - リリースチェックリスト

## 📋 リリース前の最終確認事項

### ✅ 機能実装確認

#### コア機能
- [x] **顧客管理** - 最大100名まで登録可能
- [x] **予約管理** - 月50件まで予約可能
- [x] **メッセージ機能** - 顧客とのコミュニケーション
- [x] **一斉送信機能** - 複数チャネル対応
- [x] **基本レポート** - 売上・顧客分析

#### 外部API連携
- [x] **LINE Messaging API** - メッセージ送受信、Webhook対応
- [x] **Instagram API** - DM対応（要Business Account）
- [x] **Email API** - SMTP/SendGrid対応
- [x] **Webhook** - セキュアな署名検証付き

### 🔧 技術的確認事項

#### ビルド＆デプロイ
- [x] `npm run build` エラーなし
- [x] `npm run typecheck` エラーなし
- [x] `npm run lint` エラーなし
- [x] バンドルサイズ最適化済み（1.7MB）
- [x] Dockerファイル作成済み
- [x] CI/CDパイプライン設定済み

#### セキュリティ
- [x] 環境変数の外部化
- [x] CORS設定
- [x] Webhook署名検証
- [x] 入力値バリデーション
- [x] SQLインジェクション対策
- [x] XSS対策
- [x] セキュリティヘッダー設定

#### パフォーマンス
- [x] コード分割実装
- [x] 遅延読み込み設定
- [x] キャッシュ戦略実装
- [x] 画像最適化
- [x] gzip圧縮設定

### 📝 環境設定

#### 必須環境変数
```bash
# Supabase（必須）
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# LINE API（一斉送信に必要）
VITE_LINE_CHANNEL_ACCESS_TOKEN=
VITE_LINE_CHANNEL_SECRET=

# Email（一斉送信に必要）
VITE_EMAIL_SMTP_HOST=
VITE_EMAIL_SMTP_USER=
VITE_EMAIL_SMTP_PASS=

# Webhook Security
VITE_WEBHOOK_SECRET=
```

### 🚀 デプロイ手順

#### 1. 環境変数設定
```bash
cp .env.example .env
# .envファイルを編集して実際の値を設定
```

#### 2. ビルド実行
```bash
npm install
npm run build
```

#### 3. デプロイオプション

**Option A: Vercel**
```bash
npm i -g vercel
vercel --prod
```

**Option B: Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

**Option C: Docker**
```bash
docker build -t salon-light-plan .
docker run -p 80:80 salon-light-plan
```

### 📊 品質保証

#### テスト結果
- [x] 単体テスト: 120+ テストケース合格
- [x] 統合テスト: すべて合格
- [x] E2Eテスト: ユーザーフロー検証済み
- [x] セキュリティ監査: スコア 7.5/10
- [x] パフォーマンステスト: 3秒以内のレスポンス

#### プラン制限の動作確認
- [x] 顧客100名到達時の制限動作
- [x] 月間予約50件到達時の制限動作
- [x] 80%到達時の警告表示
- [x] アップグレード促進モーダル

### 🔒 本番環境設定

#### データベース
- [ ] Supabaseプロジェクトを本番用に作成
- [ ] RLSポリシーを確認・有効化
- [ ] バックアップスケジュール設定
- [ ] 監視アラート設定

#### 外部API
- [ ] LINE Developerアカウント設定
- [ ] Webhook URLを本番URLに更新
- [ ] Instagram Business Account設定
- [ ] Email送信制限の確認（50通/日）

#### ドメイン＆SSL
- [ ] カスタムドメイン設定
- [ ] SSL証明書設定
- [ ] DNSレコード設定

### 📱 動作確認

#### デバイステスト
- [ ] PC - Chrome/Safari/Firefox
- [ ] スマートフォン - iOS Safari
- [ ] スマートフォン - Android Chrome
- [ ] タブレット - iPad

#### 機能テスト
- [ ] ログイン/ログアウト
- [ ] 顧客登録（制限確認）
- [ ] 予約作成（制限確認）
- [ ] 一斉送信（LINE/Email）
- [ ] レポート表示

### 📢 リリース後の対応

#### 監視
- [ ] エラー監視（Sentry等）設定
- [ ] アクセス解析（GA等）設定
- [ ] パフォーマンス監視設定
- [ ] アップタイム監視設定

#### サポート
- [ ] ユーザーマニュアル作成
- [ ] FAQ準備
- [ ] サポート連絡先設定
- [ ] フィードバック収集方法確立

### ✨ 最終確認

- [ ] すべての必須項目にチェックが入っている
- [ ] 環境変数がすべて設定されている
- [ ] セキュリティ設定が完了している
- [ ] バックアップ体制が整っている
- [ ] 緊急時の連絡体制が確立している

---

## 🎉 リリース準備完了！

すべての項目にチェックが入ったら、本番環境へのデプロイを実行してください。

**推奨デプロイ順序:**
1. ステージング環境でテスト
2. 一部ユーザーでベータテスト
3. 全ユーザーへ展開

Good luck with your launch! 🚀