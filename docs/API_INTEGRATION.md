# 外部API連携の実装ガイド

## 1. LINE Messaging API

### 設定手順
1. LINE Developersコンソールでチャンネル作成
2. Webhook URLを設定: `https://your-domain.com/api/webhooks/line`
3. 環境変数に認証情報を設定

### データフロー
```
LINE → Webhook → Supabase → リアルタイム更新 → UI
```

### 実装済み機能
- ✅ テキストメッセージ受信
- ✅ 画像・スタンプ受信
- ✅ リッチメッセージ送信
- ✅ 予約確認テンプレート

## 2. Instagram Direct Message API

### 設定手順
1. Facebook App作成
2. Instagram Basic Display API有効化
3. Webhookサブスクリプション設定

### 必要な権限
- `instagram_manage_messages`
- `pages_manage_metadata`

## 3. メール統合（IMAP/SMTP）

### 対応プロバイダー
- Gmail API
- SendGrid
- AWS SES

### 実装方法
```typescript
// Gmail APIの例
const gmail = google.gmail({ version: 'v1', auth });
const messages = await gmail.users.messages.list({
  userId: 'me',
  q: 'is:unread',
});
```

## 4. リアルタイム同期の仕組み

### Supabase Realtime
```typescript
// リアルタイム監視
supabase
  .channel('messages')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'messages' 
  }, payload => {
    // 新着メッセージをUIに反映
  })
  .subscribe();
```

### Webhook受信
1. 外部サービスからWebhookを受信
2. 署名を検証
3. データベースに保存
4. Supabase Realtimeで自動的にUIに反映

## 5. 実装に必要な環境変数

```env
# LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# Instagram
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=

# Email
EMAIL_API_KEY=
EMAIL_FROM_ADDRESS=

# OpenAI
OPENAI_API_KEY=
```

## 6. セキュリティ考慮事項

- Webhook署名の検証必須
- API認証情報の暗号化保存
- Rate Limitingの実装
- エラーログの適切な管理