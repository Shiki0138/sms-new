# 📱 SMS ブラスト機能 - ローカル確認ガイド

## 🚀 サーバー起動確認

✅ サーバーが http://localhost:3002 で正常に起動しています

## 📋 確認手順

### 1. システム基本機能の確認
```bash
# ヘルスチェック
curl http://localhost:3002/health

# ランディングページにアクセス
open http://localhost:3002/landing.html
```

### 2. SMS ブラスト機能の確認

#### A. サービス状態の確認
```bash
curl http://localhost:3002/api/sms/status
```

#### B. ログイン (必須)
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@salon-lumiere.com", "password": "password123"}'
```

#### C. テンプレート作成
```bash
# JWTトークンを取得後
curl -X POST http://localhost:3002/api/sms/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "予約確認メッセージ", 
    "content": "{{firstName}}様、{{salonName}}のご予約を確認しました。",
    "category": "appointment"
  }'
```

#### D. キャンペーン作成
```bash
curl -X POST http://localhost:3002/api/sms/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "夏のキャンペーン",
    "description": "特別割引のお知らせ",
    "templateId": "TEMPLATE_ID_FROM_ABOVE",
    "scheduledAt": "2024-08-17T14:00:00+09:00"
  }'
```

#### E. 一括SMS送信テスト
```bash
curl -X POST http://localhost:3002/api/sms/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "テストメッセージです",
    "recipients": [
      {"phone": "090-1234-5678", "firstName": "田中", "lastName": "太郎"},
      {"phone": "080-9876-5432", "firstName": "佐藤", "lastName": "花子"}
    ]
  }'
```

## 🎯 ブラウザでの確認

### 1. ログイン
http://localhost:3002/login-new.html でログイン
- Email: test@salon-lumiere.com
- Password: password123

### 2. SMS機能の確認
ログイン後、以下のAPIエンドポイントにブラウザでアクセス:

- **サービス状態**: http://localhost:3002/api/sms/status
- **キャンペーン一覧**: http://localhost:3002/api/sms/campaigns  
- **テンプレート一覧**: http://localhost:3002/api/sms/templates

## 📊 期待される結果

### SMS Status API レスポンス:
```json
{
  "status": "running",
  "version": "2.0.0",
  "features": {
    "campaigns": true,
    "templates": true,
    "scheduling": true,
    "analytics": true,
    "phoneValidation": true
  },
  "providers": {
    "twilio": {
      "configured": false,
      "status": "unavailable",
      "message": "Twilio credentials not configured"
    }
  },
  "rateLimit": {
    "smsPerSecond": 1,
    "burstLimit": 10
  }
}
```

## ⚠️ 注意事項

1. **Twilio設定**: 実際のSMS送信にはTwilio認証情報が必要
2. **テスト環境**: 現在はテスト環境のため、実際のSMSは送信されません
3. **メモリ保存**: データはメモリに保存されるため、サーバー再起動時にリセット

## 🔧 トラブルシューティング

### サーバーが起動しない場合:
```bash
# 依存関係の再インストール
npm install

# ポート3002が使用中の場合
lsof -ti:3002 | xargs kill -9
npm start
```

### API呼び出しエラーの場合:
- JWTトークンの有効期限を確認
- ログイン状態を確認
- リクエストヘッダーのContent-Typeを確認

## ✅ 成功確認項目

- [ ] サーバーが http://localhost:3002 で起動
- [ ] ログインページにアクセス可能
- [ ] テストアカウントでログイン成功
- [ ] SMS Status APIでサービス状態確認
- [ ] テンプレート作成・一覧取得
- [ ] キャンペーン作成・管理
- [ ] 一括SMS機能のテスト

全ての項目が確認できれば、SMSブラスト機能が正常に動作しています！