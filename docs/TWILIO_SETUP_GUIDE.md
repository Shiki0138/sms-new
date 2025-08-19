# Twilio SMS設定ガイド

## 1. Twilioアカウントの作成

### アカウント登録
1. https://www.twilio.com/try-twilio にアクセス
2. アカウントを作成（無料トライアルあり）
3. 電話番号認証を完了

### 初期設定
1. **Console Dashboard** にログイン
2. **Account Info** から以下を取得：
   - Account SID
   - Auth Token

## 2. 電話番号の取得

### 日本の電話番号を購入
1. Console → Phone Numbers → Buy a Number
2. Country: Japan (+81) を選択
3. Capabilities:
   - ✅ SMS
   - ✅ Voice (オプション)
4. 番号を選択して購入（月額約$1.00）

### 番号の設定
1. 購入した番号をクリック
2. Messaging Configuration:
   - **A message comes in**: Webhook URLを設定（後で設定）

## 3. 環境変数の設定

`.env` ファイルに以下を追加：

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+8150xxxxxxxx
```

## 4. 送信制限とベストプラクティス

### 日本のSMS規制
- **事前承認が必要**: マーケティングメッセージには顧客の明示的な同意が必要
- **送信時間制限**: 午前8時〜午後9時を推奨
- **文字数制限**: 全角70文字、半角160文字

### レート制限
- 無料アカウント: 1秒あたり1メッセージ
- 有料アカウント: 1秒あたり10メッセージ

### コンプライアンス
1. **オプトアウト機能**: 「配信停止」メッセージに対応
2. **送信者情報**: メッセージに送信者（サロン名）を明記
3. **プライバシー保護**: 個人情報を含まない

## 5. テスト送信

### テストコード
```javascript
const testSMS = async () => {
  try {
    const result = await twilioService.sendSMS({
      to: '+8190xxxxxxxx', // テスト用電話番号
      message: 'Salon Lumièreからのテストメッセージです。'
    });
    console.log('SMS sent:', result);
  } catch (error) {
    console.error('SMS error:', error);
  }
};
```

## 6. 本番運用チェックリスト

### 必須設定
- [ ] Twilioアカウントをアップグレード（クレジットカード登録）
- [ ] 日本の電話番号を購入
- [ ] 環境変数を本番環境に設定
- [ ] エラーハンドリングを実装
- [ ] ログ記録を設定

### セキュリティ
- [ ] Auth Tokenを環境変数で管理
- [ ] HTTPSエンドポイントのみ使用
- [ ] IPホワイトリスト設定（オプション）

### モニタリング
- [ ] Twilio Console でエラーログを確認
- [ ] 送信成功率をモニタリング
- [ ] 月間使用量を追跡

## 7. 料金目安

### 日本国内SMS
- 送信: 約¥8/メッセージ
- 電話番号: 約¥150/月

### 予算計画
- 1000メッセージ/月: 約¥8,000
- 5000メッセージ/月: 約¥40,000

## 8. トラブルシューティング

### よくあるエラー
1. **Invalid Phone Number**: 国際形式（+81）を使用
2. **Account not verified**: アカウントアップグレードが必要
3. **Rate limit exceeded**: 送信間隔を調整

### サポート
- Twilio Documentation: https://www.twilio.com/docs/sms
- 日本語サポート: support@twilio.com