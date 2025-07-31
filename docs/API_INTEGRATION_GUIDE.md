# API Integration Guide - 美容室管理システム

## 概要

このドキュメントでは、美容室管理システムの外部API統合について詳しく説明します。

## 対応サービス

### 1. LINE Messaging API

#### 必要な設定
- **Channel Access Token**: LINE Developersコンソールから取得
- **Channel Secret**: LINE Developersコンソールから取得
- **Webhook URL**: `https://yourdomain.com/api/webhooks/line`

#### 主な機能
- ✅ テキストメッセージの送受信
- ✅ リッチメッセージ（ボタン、カルーセル）
- ✅ ユーザープロフィール取得
- ✅ 予約確認メッセージ
- ✅ リマインダー自動送信
- ✅ リッチメニュー設定

#### セットアップ手順
1. LINE Developersコンソールでチャンネルを作成
2. Messaging APIを有効化
3. Webhook URLを設定（HTTPSが必須）
4. 管理画面でChannel Access TokenとChannel Secretを入力
5. 接続テストを実行

#### エラー対処法
- **401 Unauthorized**: アクセストークンを確認
- **400 Bad Request**: メッセージ形式を確認
- **429 Too Many Requests**: レート制限に注意（1分間に1000リクエストまで）

### 2. Instagram Basic Display API & Messaging

#### 必要な設定
- **App ID**: Facebook Developersから取得
- **App Secret**: Facebook Developersから取得
- **Access Token**: OAuth認証で取得（60日間有効）

#### 主な機能
- ✅ DM送受信（ビジネスアカウント必須）
- ✅ プロフィール情報取得
- ✅ メディア投稿の取得
- ✅ ハッシュタグ分析
- ⚠️ アクセストークンの自動更新

#### セットアップ手順
1. Facebook Developersでアプリを作成
2. Instagram Basic Display APIを追加
3. ビジネスアカウントと連携
4. OAuth認証でアクセストークンを取得
5. 管理画面で認証情報を設定

#### 注意事項
- アクセストークンは60日で期限切れ
- ビジネスアカウントが必須
- DM機能は追加審査が必要な場合あり

### 3. Email (SMTP/IMAP)

#### 必要な設定
- **SMTPホスト**: メールプロバイダーのSMTPサーバー
- **SMTPポート**: 587（TLS）または465（SSL）
- **メールアドレス**: 送信元アドレス
- **パスワード**: アプリパスワード（Gmailの場合）

#### 主な機能
- ✅ HTMLメール送信
- ✅ 添付ファイル対応
- ✅ 一括送信（制限あり）
- ✅ 予約確認メール
- ✅ リマインダーメール
- ✅ 自動返信

#### Gmail設定例
```
SMTPホスト: smtp.gmail.com
SMTPポート: 587
セキュリティ: TLS
認証: アプリパスワード
```

#### メール送信制限
- ライトプラン: 1日50通まで
- 一括送信: 1回10件まで

### 4. Gemini AI

#### 必要な設定
- **API Key**: Google AI Studioから取得

#### 主な機能
- ✅ 自動返信文生成
- ✅ 予約メッセージ解析
- ✅ 感情分析
- ✅ 多言語対応（日本語最適化）
- ✅ カスタムプロンプト

#### 使用例
```javascript
// 自動返信生成
const reply = await geminiService.generateSalonReply({
  messageContent: "来週の予約は可能ですか？",
  customerName: "田中様",
  responseType: 'booking_response',
  tone: 'friendly'
});
```

#### レート制限
- 無料プラン: 1分間に60リクエストまで

## エラーハンドリング

### 自動リカバリー機能

1. **認証エラー**: 統合を自動的に無効化し、再設定を促す
2. **レート制限**: 指数バックオフでリトライ
3. **ネットワークエラー**: サーキットブレーカーパターンで保護
4. **トークン期限切れ**: Instagram は自動更新を試行

### エラーコード一覧

| コード | 説明 | 対処法 |
|--------|------|--------|
| AUTH_ERROR | 認証失敗 | APIキーを確認 |
| RATE_LIMIT | レート制限 | 時間を置いて再試行 |
| NETWORK_ERROR | 接続エラー | ネットワークを確認 |
| TOKEN_EXPIRED | トークン期限切れ | トークンを更新 |

## ベストプラクティス

### 1. セキュリティ
- APIキーは環境変数で管理
- Webhook URLはHTTPSを使用
- 署名検証を必ず実装

### 2. パフォーマンス
- バッチ処理で効率化
- キャッシュを活用
- 不要なAPI呼び出しを避ける

### 3. ユーザー体験
- エラー時は分かりやすいメッセージ
- フォールバック処理を実装
- 非同期処理でUIをブロックしない

## トラブルシューティング

### LINE API
**問題**: メッセージが送信されない
- Webhook URLがHTTPSか確認
- チャンネルアクセストークンの有効性を確認
- ユーザーがブロックしていないか確認

### Instagram API
**問題**: DMが取得できない
- ビジネスアカウントか確認
- 必要な権限が付与されているか確認
- アクセストークンの有効期限を確認

### Email
**問題**: メールが届かない
- SPF/DKIM設定を確認
- スパムフォルダを確認
- 送信制限に達していないか確認

### Gemini AI
**問題**: 返信が生成されない
- APIキーの有効性を確認
- レート制限を確認
- プロンプトの形式を確認

## 開発環境での設定

### ngrokを使用したWebhook開発
```bash
# ローカルサーバーを公開
ngrok http 3000

# 生成されたHTTPS URLをWebhook URLとして使用
https://xxxxx.ngrok.io/api/webhooks/line
```

### 環境変数の設定
```env
# .env.local
REACT_APP_LINE_CHANNEL_ACCESS_TOKEN=your_token
REACT_APP_LINE_CHANNEL_SECRET=your_secret
REACT_APP_INSTAGRAM_APP_ID=your_app_id
REACT_APP_INSTAGRAM_APP_SECRET=your_app_secret
REACT_APP_GEMINI_API_KEY=your_api_key
```

## APIテストツール

管理画面の「設定 > API統合テスト」から以下の機能を利用できます：

1. **接続テスト**: 各APIの接続状態を確認
2. **バリデーション**: 設定の妥当性をチェック
3. **ヘルスチェック**: エラー率と健全性を監視
4. **デバッグ情報**: 詳細なエラーログ

## サポート

問題が解決しない場合は、以下の情報と共にサポートにお問い合わせください：

1. エラーメッセージの全文
2. 発生日時
3. 実行した操作
4. API統合テストの結果

---

最終更新: 2024年1月