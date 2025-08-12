# Salon Lumière ライトプラン MVP仕様書

## 🎯 MVP概要
期間：3ヶ月
対象：個人経営の美容師（1-3名）
目標：基本的な顧客管理と予約管理の実現

## 📊 Phase 1 機能詳細（Month 1）

### 1. 認証システム
#### 1.1 ユーザー登録
```
画面要素：
- サロン名（必須）
- 代表者名（必須）
- メールアドレス（必須・ユニーク）
- パスワード（必須・8文字以上）
- 電話番号（必須）
- 利用規約同意チェックボックス
```

#### 1.2 ログイン
```
機能：
- メール/パスワードログイン
- 「ログイン状態を保持」オプション（30日間）
- パスワードリセット機能
- 5回失敗で15分間ロック
```

#### 1.3 セキュリティ
```
実装内容：
- JWT認証（アクセストークン：1時間、リフレッシュトークン：30日）
- bcryptによるパスワードハッシュ化
- HTTPSの強制
- XSS/CSRF対策
```

### 2. ダッシュボード
#### 2.1 表示項目
```
統計情報：
- 本日の予約数
- 本日の売上（予定）
- 今月の予約数
- 総顧客数

予約情報：
- 本日の予約タイムライン
- 次の予約詳細
- 空き時間表示
```

#### 2.2 クイックアクション
```
ボタン配置：
- 新規予約登録
- 新規顧客登録
- 本日の売上入力
- 顧客検索
```

### 3. 顧客管理（基本）
#### 3.1 顧客登録
```
基本情報：
- 氏名（姓・名）※必須
- フリガナ（セイ・メイ）※必須
- 性別
- 生年月日
- 電話番号 ※必須
- メールアドレス
- 郵便番号
- 住所

追加情報：
- 初回来店日（自動設定）
- 担当スタッフ
- 紹介元
- メモ欄（500文字）
```

#### 3.2 顧客一覧
```
表示項目：
- 顧客名
- 電話番号
- 最終来店日
- 来店回数
- 担当者

機能：
- ページネーション（20件/ページ）
- 名前/電話番号での検索
- 五十音順ソート
```

#### 3.3 顧客詳細
```
表示内容：
- 基本情報すべて
- 来店履歴（最新10件）
- 次回予約
- メモ履歴
```

## 📅 Phase 2 機能詳細（Month 2）

### 4. 予約管理（基本）
#### 4.1 カレンダービュー
```
表示モード：
- 日表示（デフォルト）
  - 時間軸：9:00-21:00（30分単位）
  - スタッフ別カラム表示
- 週表示
  - 7日間の予約概要
  - スタッフ別表示

操作：
- 日付選択（カレンダーピッカー）
- 本日ボタン
- 前日/翌日ボタン
```

#### 4.2 予約登録
```
入力項目：
- 顧客選択（ドロップダウン検索）
- 日付（必須）
- 開始時間（必須）
- 所要時間（30分単位）
- メニュー選択（複数可）
- 担当スタッフ（必須）
- 料金（自動計算）
- メモ（200文字）

バリデーション：
- 営業時間内チェック
- ダブルブッキング防止
- 過去日付の予約不可
```

#### 4.3 予約変更・キャンセル
```
機能：
- 予約内容の編集
- キャンセル処理（論理削除）
- キャンセル理由の記録
- 変更履歴の保存
```

### 5. 売上管理（基本）
#### 5.1 売上入力
```
入力方法：
1. 予約からの自動入力
2. 手動入力

入力項目：
- 日付
- 顧客
- メニュー（複数可）
- 金額
- 支払方法（現金/カード/その他）
- 担当スタッフ
```

#### 5.2 日次集計
```
表示項目：
- 売上合計
- 現金売上
- カード売上
- 客数
- 客単価
- スタッフ別売上
```

#### 5.3 月次レポート
```
内容：
- 月間売上推移グラフ
- 前月比較
- 曜日別平均
- メニュー別売上
- CSV出力機能
```

### 6. 基本設定
#### 6.1 サロン情報
```
設定項目：
- サロン名
- 電話番号
- 住所
- 営業時間（曜日別）
- 定休日
```

#### 6.2 メニュー管理
```
登録項目：
- メニュー名（必須）
- カテゴリ（カット/カラー/パーマ/トリートメント/その他）
- 料金（必須）
- 所要時間（30分単位）
- 説明文（100文字）
※最大20件まで
```

#### 6.3 スタッフ管理
```
登録項目：
- スタッフ名（必須）
- 役職
- 勤務開始日
- 表示順
※最大3名まで
```

## 💾 Phase 3 機能詳細（Month 3）

### 7. カルテ機能
#### 7.1 施術履歴
```
記録項目：
- 施術日
- メニュー
- 使用薬剤（テキスト）
- 仕上がり写真（1枚）
- 施術メモ（500文字）
- 次回提案
```

#### 7.2 注意事項管理
```
項目：
- アレルギー情報
- 皮膚トラブル歴
- 施術時の注意点
- NGメニュー
※重要度フラグ付き
```

### 8. データ入出力
#### 8.1 エクスポート
```
対象：
- 顧客リスト（CSV）
- 売上データ（CSV）
- 予約データ（CSV）
```

#### 8.2 印刷機能
```
対象：
- 日次予約表
- 顧客カルテ
- 売上レポート
```

### 9. UI/UX改善
#### 9.1 レスポンシブ対応
```
対応デバイス：
- PC（1024px以上）
- タブレット（768px-1023px）
- スマートフォン（767px以下）
```

#### 9.2 操作性向上
```
実装内容：
- キーボードショートカット
- 自動保存機能
- 確認ダイアログ
- トースト通知
- ローディング表示
```

## 🗄️ データベース設計（基本）

### テーブル構成
```sql
-- ユーザー（サロン）
users {
  id: UUID
  salon_name: VARCHAR(100)
  email: VARCHAR(255) UNIQUE
  password_hash: VARCHAR(255)
  phone: VARCHAR(20)
  plan_type: ENUM('light','standard','premium')
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- スタッフ
staff {
  id: UUID
  user_id: UUID (FK)
  name: VARCHAR(100)
  role: VARCHAR(50)
  display_order: INT
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

-- 顧客
customers {
  id: UUID
  user_id: UUID (FK)
  last_name: VARCHAR(50)
  first_name: VARCHAR(50)
  last_name_kana: VARCHAR(50)
  first_name_kana: VARCHAR(50)
  gender: ENUM('male','female','other')
  birth_date: DATE
  phone: VARCHAR(20)
  email: VARCHAR(255)
  postal_code: VARCHAR(10)
  address: TEXT
  first_visit_date: DATE
  assigned_staff_id: UUID (FK)
  referral_source: VARCHAR(100)
  notes: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 予約
appointments {
  id: UUID
  user_id: UUID (FK)
  customer_id: UUID (FK)
  staff_id: UUID (FK)
  appointment_date: DATE
  start_time: TIME
  end_time: TIME
  status: ENUM('confirmed','cancelled','completed')
  total_amount: DECIMAL(10,2)
  notes: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- メニュー
services {
  id: UUID
  user_id: UUID (FK)
  name: VARCHAR(100)
  category: VARCHAR(50)
  price: DECIMAL(10,2)
  duration_minutes: INT
  description: TEXT
  display_order: INT
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

-- 予約メニュー（中間テーブル）
appointment_services {
  appointment_id: UUID (FK)
  service_id: UUID (FK)
  price: DECIMAL(10,2)
}

-- 売上
sales {
  id: UUID
  user_id: UUID (FK)
  customer_id: UUID (FK)
  staff_id: UUID (FK)
  sale_date: DATE
  total_amount: DECIMAL(10,2)
  payment_method: ENUM('cash','card','other')
  notes: TEXT
  created_at: TIMESTAMP
}
```

## 🚀 技術スタック

### フロントエンド
```json
{
  "framework": "Vue.js 3.3",
  "language": "TypeScript 5.0",
  "styling": "Tailwind CSS 3.3",
  "state": "Pinia",
  "router": "Vue Router 4",
  "http": "Axios",
  "ui-library": "Headless UI",
  "calendar": "FullCalendar 6",
  "charts": "Chart.js 4",
  "date": "Day.js",
  "validation": "VeeValidate 4"
}
```

### バックエンド
```json
{
  "runtime": "Node.js 18 LTS",
  "framework": "Express.js 4",
  "language": "TypeScript 5.0",
  "database": "PostgreSQL 15",
  "orm": "Prisma 5",
  "cache": "Redis 7",
  "auth": "jsonwebtoken",
  "validation": "Joi",
  "logging": "Winston",
  "testing": "Jest"
}
```

### インフラ
```yaml
hosting: Vercel
database: Supabase/Neon
storage: Cloudinary (画像)
monitoring: Vercel Analytics
error-tracking: Sentry
```

## 📋 画面一覧

1. **認証**
   - ログイン画面
   - ユーザー登録画面
   - パスワードリセット画面

2. **ダッシュボード**
   - メインダッシュボード

3. **顧客管理**
   - 顧客一覧画面
   - 顧客登録画面
   - 顧客編集画面
   - 顧客詳細画面

4. **予約管理**
   - 予約カレンダー画面
   - 予約登録モーダル
   - 予約編集モーダル
   - 予約詳細モーダル

5. **売上管理**
   - 売上入力画面
   - 日次売上画面
   - 月次レポート画面

6. **設定**
   - サロン情報設定画面
   - メニュー管理画面
   - スタッフ管理画面
   - アカウント設定画面

## 🎯 開発優先順位

### Week 1-2: 基盤構築
- 開発環境セットアップ
- データベース設計・構築
- 認証システム実装

### Week 3-4: コア機能開発
- 顧客管理CRUD
- ダッシュボード基本実装

### Week 5-6: 予約管理
- カレンダー実装
- 予約CRUD

### Week 7-8: 売上管理
- 売上入力機能
- レポート機能

### Week 9-10: カルテ・設定
- カルテ機能
- 各種設定画面

### Week 11-12: 仕上げ
- UI/UX改善
- テスト・バグ修正
- デプロイ準備

この仕様書に基づいて、MVP開発を進めることで、3ヶ月でライトプランの基本機能を実装できます。