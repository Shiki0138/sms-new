# SMS (サロン管理システム) - プロジェクト完全ドキュメント

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [実装済み機能](#実装済み機能)
4. [メニュー構成](#メニュー構成)
5. [データモデル](#データモデル)
6. [API仕様](#api仕様)
7. [デザインシステム](#デザインシステム)
8. [技術スタック](#技術スタック)
9. [セキュリティ](#セキュリティ)
10. [達成事項](#達成事項)
11. [将来の実装計画](#将来の実装計画)
12. [開発ガイド](#開発ガイド)

---

## 🎯 プロジェクト概要

### 目的
SMSは、美容室・サロン向けの総合管理システムです。顧客管理、予約管理、スタッフ管理、売上管理など、サロン運営に必要な全ての機能を一元化し、業務効率化を実現します。

### コンセプト
- **シンプルで使いやすい**: 直感的なUIで誰でも簡単に操作可能
- **リアルタイム更新**: 最新の情報を常に表示
- **モバイル対応**: スマートフォンでも快適に利用可能
- **セキュア**: JWT認証による安全なデータ管理

### ターゲットユーザー
- 美容室オーナー
- サロンマネージャー
- スタイリスト
- 受付スタッフ

---

## 🏗️ システムアーキテクチャ

### 全体構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   フロントエンド  │────▶│  バックエンドAPI │────▶│   データベース   │
│  (JavaScript)   │     │   (Node.js)     │     │  (In-Memory)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Tailwind CSS            Express.js             将来: PostgreSQL
   Font Awesome              JWT                    Redis Cache
    Vanilla JS              bcrypt
```

### ディレクトリ構造
```
017_SMS/
├── api/                    # バックエンドAPI
│   ├── index.js           # メインAPIサーバー
│   └── package.json       # API依存関係
├── src/
│   ├── frontend/          # フロントエンドソース
│   │   ├── index.html     # メインHTML
│   │   ├── app.js         # 開発用JavaScript
│   │   ├── app.prod.js    # 本番用JavaScript
│   │   └── auth.html      # 認証ページ
│   └── backend/           # バックエンド開発環境
│       ├── server.js      # 開発用サーバー
│       └── package.json   # 開発用依存関係
├── public/                # Vercelデプロイ用
├── docs/                  # ドキュメント
├── scripts/               # ユーティリティスクリプト
├── index.html            # ルートHTML
├── vercel.json           # Vercel設定
└── package.json          # プロジェクト設定
```

---

## ✅ 実装済み機能

### 1. 認証システム
- **JWT認証**: セキュアなトークンベース認証
- **ログイン/ログアウト**: セッション管理
- **認証状態の永続化**: LocalStorageによる保持
- **自動ログアウト**: トークン有効期限管理

### 2. ダッシュボード
- **統計情報表示**:
  - 総顧客数
  - 本日の予約数
  - 月間売上
  - アクティブスタッフ数
- **本日の予約一覧**: リアルタイム表示
- **スタッフ稼働状況**: 勤務中/待機中の表示

### 3. 顧客管理
- **顧客一覧表示**: ページネーション対応
- **顧客検索**: 名前、電話番号での検索
- **ステータス管理**: VIP/常連/新規/休眠
- **顧客削除**: 確認ダイアログ付き
- **顧客情報**:
  - 基本情報（名前、電話、メール）
  - 来店履歴（最終来店日、来店回数）
  - メモ機能

### 4. 予約管理（UI実装済み）
- 予約一覧表示
- ステータス表示（確定/未確定）
- スタッフ別予約管理

### 5. スタッフ管理（UI実装済み）
- スタッフ一覧
- 稼働状況管理
- スキル情報
- 評価表示

---

## 📱 メニュー構成

### メインナビゲーション
1. **ダッシュボード** (`/`)
   - 統計サマリー
   - 本日の予約
   - スタッフ状況

2. **顧客管理** (`/customers`)
   - 顧客一覧
   - 顧客検索
   - 新規登録（予定）
   - 顧客詳細（予定）

3. **予約管理** (`/appointments`)
   - 予約カレンダー（予定）
   - 予約一覧
   - 新規予約（予定）

4. **スタッフ管理** (`/staff`)
   - スタッフ一覧
   - シフト管理（予定）
   - 売上管理（予定）

5. **ログアウト**
   - セッションクリア
   - ログイン画面へ

---

## 📊 データモデル

### 1. ユーザー (Users)
```javascript
{
  id: number,
  email: string,
  password: string (hashed),
  name: string,
  role: 'admin' | 'staff' | 'receptionist'
}
```

### 2. 顧客 (Customers)
```javascript
{
  id: number,
  name: string,
  phone: string,
  email: string,
  lastVisit: string (date),
  visitCount: number,
  status: 'VIP' | '常連' | '新規' | '休眠',
  notes: string,
  createdAt: string (date)
}
```

### 3. 予約 (Appointments)
```javascript
{
  id: number,
  customerId: number,
  customerName: string,
  date: string,
  time: string,
  service: string,
  staffId: number,
  staffName: string,
  status: '確定' | '未確定' | 'キャンセル',
  notes: string,
  createdAt: string (timestamp)
}
```

### 4. スタッフ (Staff)
```javascript
{
  id: number,
  name: string,
  role: 'スタイリスト' | 'アシスタント' | 'マネージャー',
  status: '勤務中' | '待機中' | '休憩中' | '退勤',
  skills: string[],
  rating: number (0-5)
}
```

---

## 🔌 API仕様

### 認証エンドポイント
- `POST /api/auth/login`
  - Request: `{ email, password }`
  - Response: `{ token, user }`

### ダッシュボード
- `GET /api/dashboard/stats` (要認証)
  - Response: 統計情報

### 顧客管理
- `GET /api/customers` (要認証)
  - Query: `search`, `status`, `page`, `limit`
  - Response: 顧客リスト
- `GET /api/customers/:id` (要認証)
- `POST /api/customers` (要認証)
- `PUT /api/customers/:id` (要認証)
- `DELETE /api/customers/:id` (要認証)

### 予約管理
- `GET /api/appointments` (要認証)
  - Query: `date`, `staffId`, `status`
- `POST /api/appointments` (要認証)

### スタッフ管理
- `GET /api/staff` (要認証)

### ヘルスチェック
- `GET /api/health`

---

## 🎨 デザインシステム

### カラーパレット
```css
/* プライマリカラー */
--primary: #3B82F6 (Blue 500)
--primary-hover: #2563EB (Blue 600)

/* ステータスカラー */
--success: #10B981 (Green 500)
--warning: #F59E0B (Yellow 500)
--error: #EF4444 (Red 500)
--info: #3B82F6 (Blue 500)

/* 顧客ステータス */
--vip: #8B5CF6 (Purple 500)
--regular: #3B82F6 (Blue 500)
--new: #10B981 (Green 500)
--inactive: #6B7280 (Gray 500)

/* 背景色 */
--bg-primary: #F9FAFB (Gray 50)
--bg-secondary: #FFFFFF
--bg-hover: #F3F4F6 (Gray 100)
```

### タイポグラフィ
- **見出し**: `text-2xl font-semibold` (24px, 600)
- **サブ見出し**: `text-lg font-semibold` (18px, 600)
- **本文**: `text-base` (16px, 400)
- **キャプション**: `text-sm text-gray-500` (14px, 400)

### コンポーネントスタイル

#### カード
```css
.card {
  @apply bg-white rounded-lg shadow p-6;
}
```

#### ボタン
```css
.btn-primary {
  @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600;
}
.btn-secondary {
  @apply border border-gray-300 px-4 py-2 rounded hover:bg-gray-100;
}
```

#### フォーム要素
```css
.input {
  @apply w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500;
}
```

### レスポンシブブレークポイント
- Mobile: 320px～
- Tablet: 768px～ (`md:`)
- Desktop: 1024px～ (`lg:`)

### アイコン
Font Awesome 6.0を使用
- 顧客: `fa-users`
- 予約: `fa-calendar-check`
- 売上: `fa-yen-sign`
- スタッフ: `fa-user-tie`
- 編集: `fa-edit`
- 削除: `fa-trash`

---

## 🛠️ 技術スタック

### フロントエンド
- **JavaScript**: Vanilla JS (ES6+)
- **CSS Framework**: Tailwind CSS 2.2.19
- **アイコン**: Font Awesome 6.0
- **ビルドツール**: なし（CDN使用）
- **状態管理**: LocalStorage

### バックエンド
- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **認証**: jsonwebtoken 9.0.2
- **暗号化**: bcryptjs 2.4.3
- **CORS**: cors 2.8.5
- **データベース**: In-Memory（開発用）

### デプロイメント
- **ホスティング**: Vercel
- **CI/CD**: Vercel自動デプロイ
- **環境変数**: Vercel環境変数

---

## 🔒 セキュリティ

### 実装済みセキュリティ対策
1. **JWT認証**
   - トークンベースの認証
   - 7日間の有効期限
   - Bearerトークン形式

2. **パスワード暗号化**
   - bcryptによるハッシュ化
   - Salt rounds: 10

3. **CORS設定**
   - 許可されたオリジンのみアクセス可能
   - 認証情報の送信を許可

4. **入力検証**
   - フロントエンドでの基本検証
   - バックエンドでの追加検証

5. **HTTPSの使用**
   - Vercelによる自動HTTPS化

### セキュリティベストプラクティス
- 環境変数による秘密情報管理
- エラーメッセージの適切な処理
- セッション管理の実装

---

## 🎯 達成事項

### 完了した実装
1. ✅ フルスタックWebアプリケーションの構築
2. ✅ JWT認証システムの実装
3. ✅ レスポンシブデザインの実現
4. ✅ 顧客管理機能の完全実装
5. ✅ ダッシュボード with リアルタイムデータ
6. ✅ APIとフロントエンドの統合
7. ✅ Vercelへのデプロイ設定
8. ✅ エラーハンドリングの実装
9. ✅ ページネーションの実装
10. ✅ 検索・フィルター機能

### パフォーマンス最適化
- CDNによる静的リソースの配信
- 軽量なVanilla JSの使用
- 効率的なAPI設計

---

## 🚀 将来の実装計画

### Phase 1: 基本機能の拡充
1. **顧客管理の強化**
   - 顧客詳細ページ
   - 顧客カルテ機能
   - 来店履歴の詳細表示
   - 顧客画像アップロード

2. **予約管理の実装**
   - カレンダービュー
   - ドラッグ&ドロップ予約
   - 予約変更・キャンセル
   - リマインダー機能

3. **スタッフ管理の実装**
   - シフト管理
   - 個人売上管理
   - スキルマトリックス
   - 評価システム

### Phase 2: 高度な機能
1. **売上分析**
   - 売上レポート
   - グラフ表示
   - 期間比較
   - 商品別分析

2. **在庫管理**
   - 商品管理
   - 在庫アラート
   - 発注管理

3. **メッセージング**
   - SMS送信
   - メール配信
   - LINE連携
   - プッシュ通知

### Phase 3: エンタープライズ機能
1. **マルチ店舗対応**
   - 店舗切り替え
   - 店舗間比較
   - 統合レポート

2. **外部連携**
   - POS連携
   - 会計ソフト連携
   - 予約サイト連携

3. **AI/ML機能**
   - 来店予測
   - 売上予測
   - 顧客分析
   - スタッフ最適配置

### 技術的改善
1. **データベース**
   - PostgreSQL導入
   - Redis Cache実装
   - データバックアップ

2. **フロントエンド**
   - React/Next.js移行
   - TypeScript導入
   - PWA対応

3. **インフラ**
   - Docker化
   - Kubernetes対応
   - マイクロサービス化

---

## 💻 開発ガイド

### ローカル開発環境のセットアップ

#### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd 017_SMS
```

#### 2. 依存関係のインストール
```bash
# バックエンド
cd src/backend
npm install

# ルートディレクトリ
cd ../..
npm install
```

#### 3. 環境変数の設定
```bash
# .env.local を作成
JWT_SECRET=your-secret-key
NODE_ENV=development
```

#### 4. 開発サーバーの起動
```bash
# バックエンド (ポート5001)
cd src/backend
node server.js

# フロントエンド (ポート3001)
cd ../frontend
node server.cjs
```

### コーディング規約

#### JavaScript
- ES6+の機能を使用
- 非同期処理にはasync/awaitを使用
- エラーハンドリングを適切に実装

#### CSS
- Tailwind CSSのユーティリティクラスを優先
- カスタムCSSは最小限に
- レスポンシブデザインを考慮

#### 命名規則
- 変数・関数: camelCase
- クラス: PascalCase
- 定数: UPPER_SNAKE_CASE
- ファイル: kebab-case

### Git ワークフロー
1. featureブランチを作成
2. 小さなコミットで進める
3. プルリクエストでレビュー
4. mainブランチにマージ

### テスト
- ユニットテスト（予定）
- 統合テスト（予定）
- E2Eテスト（予定）

---

## 📝 その他の情報

### ライセンス
- プロプライエタリ（商用利用不可）

### サポート
- メール: support@sms-system.com
- ドキュメント: /docs

### 更新履歴
- v1.0.0 (2024-01-25): 初回リリース
  - 基本的な顧客管理機能
  - ダッシュボード
  - 認証システム

### 既知の問題
- データは現在インメモリ保存
- パスワードリセット機能未実装
- 一部の機能がモックアップ

---

## 🔗 関連ドキュメント

1. [API仕様書](./API_SPECIFICATION.md)
2. [デプロイメントガイド](./VERCEL_DEPLOY_GUIDE.md)
3. [フロントエンドガイド](./SMS_FRONTEND_GUIDE.md)
4. [フルスタック統合ガイド](./FULL_STACK_COMPLETE.md)

---

このドキュメントは、SMSシステムの完全な技術仕様と実装詳細を記載しています。
新しいプロジェクトでの実装時は、このドキュメントを参考に開発を進めてください。