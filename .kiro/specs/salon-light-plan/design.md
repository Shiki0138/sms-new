# 美容サロン管理システム ライトプラン - 技術設計

## アーキテクチャ概要

### 技術スタック

- **フロントエンド**
  - React 18 + TypeScript
  - Vite（ビルドツール）
  - TailwindCSS（スタイリング）
  - Headless UI（UIコンポーネント）
  - React Router v6（ルーティング）
  - React Query（データフェッチング）
  - React Hook Form（フォーム管理）
  - date-fns（日付処理）

- **バックエンド / インフラ**
  - Supabase（BaaS）
    - 認証（Supabase Auth）
    - データベース（PostgreSQL）
    - ストレージ（ロゴ画像用）
    - リアルタイムサブスクリプション

- **デプロイ / ホスティング**
  - Vercel（自動デプロイ）
  - GitHub（ソースコード管理）

## データベース設計

### テーブル構造

#### users（Supabase Auth管理）

```sql
-- Supabase Authが自動管理
id: uuid (PK)
email: string
created_at: timestamp
```

#### profiles（ユーザープロファイル）

```sql
id: uuid (PK, FK -> auth.users.id)
salon_name: varchar(100) NOT NULL
address: text
phone: varchar(20)
logo_url: text
created_at: timestamp DEFAULT now()
updated_at: timestamp DEFAULT now()
```

#### customers（顧客）

```sql
id: uuid (PK)
user_id: uuid (FK -> profiles.id) NOT NULL
name: varchar(100) NOT NULL
phone: varchar(20) NOT NULL
email: varchar(255)
birthday: date
memo: text (max 200 chars)
last_visit_date: date
created_at: timestamp DEFAULT now()
updated_at: timestamp DEFAULT now()

INDEX idx_customers_user_id (user_id)
INDEX idx_customers_name (name)
```

#### menus（メニュー）

```sql
id: uuid (PK)
user_id: uuid (FK -> profiles.id) NOT NULL
name: varchar(100) NOT NULL
price: integer NOT NULL
duration_minutes: integer NOT NULL
display_order: integer DEFAULT 0
is_active: boolean DEFAULT true
created_at: timestamp DEFAULT now()
updated_at: timestamp DEFAULT now()

INDEX idx_menus_user_id (user_id)
```

#### reservations（予約）

```sql
id: uuid (PK)
user_id: uuid (FK -> profiles.id) NOT NULL
customer_id: uuid (FK -> customers.id) NOT NULL
menu_id: uuid (FK -> menus.id) NOT NULL
start_time: timestamp NOT NULL
end_time: timestamp NOT NULL
status: varchar(20) DEFAULT 'confirmed' -- confirmed, completed, cancelled
memo: text (max 100 chars)
cancel_reason: text
created_at: timestamp DEFAULT now()
updated_at: timestamp DEFAULT now()

INDEX idx_reservations_user_id (user_id)
INDEX idx_reservations_start_time (start_time)
INDEX idx_reservations_customer_id (customer_id)
```

#### business_hours（営業時間）

```sql
id: uuid (PK)
user_id: uuid (FK -> profiles.id) NOT NULL
day_of_week: integer NOT NULL (0-6, 0=Sunday)
is_closed: boolean DEFAULT false
open_time: time
close_time: time
created_at: timestamp DEFAULT now()
updated_at: timestamp DEFAULT now()

UNIQUE KEY uk_business_hours_user_day (user_id, day_of_week)
```

### Row Level Security (RLS)

すべてのテーブルでRLSを有効化し、ユーザーは自分のデータのみアクセス可能。

```sql
-- 例：customersテーブルのRLS
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## API設計

### Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

### 主要なAPI関数

#### 認証

```typescript
// サインアップ
await supabase.auth.signUp({ email, password });

// サインイン
await supabase.auth.signInWithPassword({ email, password });

// サインアウト
await supabase.auth.signOut();

// パスワードリセット
await supabase.auth.resetPasswordForEmail(email);
```

#### 顧客管理

```typescript
// 顧客一覧取得
const { data } = await supabase
  .from('customers')
  .select('*')
  .order('name')
  .limit(100);

// 顧客検索
const { data } = await supabase
  .from('customers')
  .select('*')
  .ilike('name', `%${searchTerm}%`);

// 顧客登録
const { data } = await supabase
  .from('customers')
  .insert({ name, phone, email, birthday, memo });

// 顧客更新
const { data } = await supabase
  .from('customers')
  .update({ name, phone, email, birthday, memo })
  .eq('id', customerId);
```

#### 予約管理

```typescript
// 予約一覧取得（期間指定）
const { data } = await supabase
  .from('reservations')
  .select(
    `
    *,
    customer:customers(name, phone),
    menu:menus(name, price, duration_minutes)
  `
  )
  .gte('start_time', startDate)
  .lte('start_time', endDate)
  .order('start_time');

// 予約登録
const { data } = await supabase.from('reservations').insert({
  customer_id,
  menu_id,
  start_time,
  end_time,
  memo,
});

// 予約ステータス更新
const { data } = await supabase
  .from('reservations')
  .update({ status })
  .eq('id', reservationId);
```

## フロントエンド設計

### ディレクトリ構造

```
src/
├── components/          # 再利用可能なコンポーネント
│   ├── auth/           # 認証関連
│   ├── common/         # 共通UI
│   ├── customers/      # 顧客管理
│   ├── dashboard/      # ダッシュボード
│   ├── reservations/   # 予約管理
│   ├── settings/       # 設定
│   └── ui/            # 基本UIコンポーネント
├── contexts/           # Reactコンテキスト
├── hooks/              # カスタムフック
├── lib/                # 外部ライブラリ設定
├── pages/              # ページコンポーネント
├── types/              # TypeScript型定義
└── utils/              # ユーティリティ関数
```

### 状態管理

- **認証状態**: React Context + Supabase Auth
- **サーバーデータ**: React Query（キャッシュ管理）
- **フォーム状態**: React Hook Form
- **UIステート**: ローカルstate

### ルーティング構造

```typescript
/                      # ログインページ（未認証時）/ ダッシュボード（認証済み時）
/auth/login           # ログイン
/auth/signup          # サインアップ
/auth/reset-password  # パスワードリセット
/dashboard            # ダッシュボード
/customers            # 顧客一覧
/customers/new        # 新規顧客登録
/customers/:id        # 顧客詳細・編集
/reservations         # 予約カレンダー
/reservations/new     # 新規予約
/reservations/:id     # 予約詳細・編集
/settings             # 設定
/settings/salon       # サロン情報
/settings/hours       # 営業時間
/settings/menus       # メニュー管理
```

### コンポーネント設計原則

1. **単一責任の原則**: 1コンポーネント1機能
2. **Props Interface**: 全てのPropsに型定義
3. **エラーハンドリング**: ErrorBoundaryとtry-catch
4. **ローディング状態**: Suspenseとスケルトンスクリーン
5. **アクセシビリティ**: ARIA属性とキーボード操作対応

### レスポンシブデザイン

- モバイルファースト設計
- ブレークポイント:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

## セキュリティ設計

### 認証・認可

- Supabase Authによる認証
- JWTトークンベース
- Row Level Security (RLS) によるデータアクセス制御

### データ保護

- HTTPS通信の強制
- 環境変数による秘密情報管理
- XSS対策（React標準）
- CSRF対策（Supabaseが自動処理）

### プラン制限の実装

```typescript
// utils/planLimits.ts
export const PLAN_LIMITS = {
  MAX_CUSTOMERS: 100,
  MAX_MONTHLY_RESERVATIONS: 50,
  DATA_RETENTION_MONTHS: 6,
};

// 制限チェック関数
export async function checkCustomerLimit(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return count < PLAN_LIMITS.MAX_CUSTOMERS;
}
```

## パフォーマンス最適化

### フロントエンド

- コード分割（React.lazy）
- 画像最適化（WebP形式、遅延読み込み）
- React Queryによるキャッシュ戦略
- Virtual Scrolling（大量データ表示時）

### バックエンド

- インデックスの適切な設定
- N+1問題の回避（JOINの活用）
- ページネーション実装
- 不要なデータの除外（select句の最適化）

## エラーハンドリング

### グローバルエラーハンドリング

```typescript
// エラーバウンダリー
class ErrorBoundary extends React.Component {
  // エラー画面の表示
}

// APIエラーハンドリング
const handleApiError = (error: PostgrestError) => {
  // ユーザーフレンドリーなエラーメッセージ表示
};
```

### ユーザー向けエラーメッセージ

- 技術的な詳細を隠蔽
- 次のアクションを明確に提示
- 日本語での分かりやすい説明

## テスト戦略

### ユニットテスト

- Vitest使用
- ユーティリティ関数のテスト
- カスタムフックのテスト

### 統合テスト

- React Testing Library
- コンポーネントの振る舞いテスト
- ユーザーインタラクションのテスト

### E2Eテスト（オプション）

- Playwright使用
- 主要なユーザーフローのテスト

## デプロイ・運用

### CI/CD

- GitHub Actions
- 自動テスト実行
- Vercelへの自動デプロイ

### 監視・ログ

- Vercel Analytics
- Supabase Dashboard
- エラー通知（メール）

### バックアップ

- Supabaseの自動バックアップ機能
- 日次バックアップ
- Point-in-time Recovery（有料プラン時）
