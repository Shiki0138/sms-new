# 美容サロン管理システム - ライトプラン設計書

## 概要

本設計書は美容サロン管理システムのライトプラン実装のための技術設計を定義します。小規模サロン向けの基本機能を提供し、将来的なスタンダード・プレミアムプランへのアップグレードパスを考慮した拡張可能なアーキテクチャを採用します。

## アーキテクチャ

### システム全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド層                           │
├─────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite                              │
│  ├── 認証 (Supabase Auth)                                   │
│  ├── 状態管理 (React Context + React Query)                 │
│  ├── UI (TailwindCSS + Headless UI)                        │
│  └── ルーティング (React Router)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   バックエンド層                             │
├─────────────────────────────────────────────────────────────┤
│  Supabase Cloud Services                                   │
│  ├── PostgreSQL Database (RLS有効)                         │
│  ├── Authentication Service                                │
│  ├── Realtime Subscriptions                               │
│  └── Edge Functions (将来拡張用)                            │
└─────────────────────────────────────────────────────────────┘
```

### 技術スタック詳細

#### フロントエンド
- **React 18.2.0** - UIライブラリ
- **TypeScript 5.2.2** - 型安全性
- **Vite 5.0.8** - 高速ビルドツール
- **TailwindCSS 3.4.0** - ユーティリティファーストCSS
- **React Router 6.21.1** - SPA ルーティング
- **React Query 5.17.9** - サーバー状態管理
- **date-fns** - 日付操作（日本語対応）
- **lucide-react** - アイコンライブラリ
- **react-hot-toast** - 通知システム

#### バックエンド
- **Supabase Cloud** - BaaS プラットフォーム
- **PostgreSQL 15** - メインデータベース
- **Row Level Security (RLS)** - テナント分離
- **Realtime** - リアルタイム同期

#### 開発・デプロイ
- **GitHub** - ソースコード管理
- **Vercel** - 自動デプロイ・ホスティング
- **ESLint + Prettier** - コード品質管理

## コンポーネント設計

### ディレクトリ構造

```
src/
├── components/              # Reactコンポーネント
│   ├── auth/               # 認証関連
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── PasswordReset.tsx
│   ├── dashboard/          # ダッシュボード
│   │   ├── TodaySchedule.tsx
│   │   ├── SalesOverview.tsx
│   │   └── QuickActions.tsx
│   ├── messages/           # メッセージ管理
│   │   ├── MessageList.tsx
│   │   ├── MessageThread.tsx
│   │   ├── MessageComposer.tsx
│   │   ├── AIReplyButton.tsx
│   │   ├── ChannelSelector.tsx
│   │   └── MessageHistory.tsx
│   ├── reminders/          # リマインダー管理
│   │   ├── ReminderSettings.tsx
│   │   ├── ReminderTemplates.tsx
│   │   └── ReminderHistory.tsx
│   ├── reservations/       # 予約管理
│   │   ├── Calendar.tsx
│   │   ├── ReservationForm.tsx
│   │   ├── ReservationList.tsx
│   │   └── StatusBadge.tsx
│   ├── customers/          # 顧客管理
│   │   ├── CustomerList.tsx
│   │   ├── CustomerForm.tsx
│   │   ├── CustomerDetail.tsx
│   │   ├── VisitHistory.tsx
│   │   └── ContactMethods.tsx
│   ├── settings/           # 設定管理
│   │   ├── BusinessHours.tsx
│   │   ├── HolidaySettings.tsx
│   │   ├── MenuManagement.tsx
│   │   ├── StoreInfo.tsx
│   │   ├── APISettings.tsx
│   │   └── ReminderConfig.tsx
│   ├── common/             # 共通コンポーネント
│   │   ├── Layout.tsx
│   │   ├── Navigation.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── PlanLimitModal.tsx
│   └── ui/                 # UIプリミティブ
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
├── contexts/               # React Context
│   ├── AuthContext.tsx
│   ├── TenantContext.tsx
│   └── PlanContext.tsx
├── hooks/                  # カスタムフック
│   ├── useAuth.ts
│   ├── useReservations.ts
│   ├── useCustomers.ts
│   └── usePlanLimits.ts
├── lib/                    # ユーティリティ
│   ├── supabase.ts
│   ├── planLimits.ts
│   └── dateUtils.ts
├── pages/                  # ページコンポーネント
│   ├── Dashboard.tsx
│   ├── Reservations.tsx
│   ├── Customers.tsx
│   └── Settings.tsx
├── types/                  # TypeScript型定義
│   ├── auth.ts
│   ├── reservation.ts
│   ├── customer.ts
│   └── settings.ts
└── utils/                  # ヘルパー関数
    ├── validation.ts
    ├── formatting.ts
    └── errorHandling.ts
```

### 主要コンポーネント設計

#### 1. 認証システム (AuthContext)

```typescript
interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  plan: PlanType;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

// プラン制限チェック機能
interface PlanLimits {
  customers: number;
  monthlyReservations: number;
  staffAccounts: number;
  dataRetentionMonths: number;
}
```

#### 2. 予約管理システム

```typescript
interface Reservation {
  id: string;
  tenantId: string;
  customerId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  menuContent: string;
  status: 'TENTATIVE' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  price: number;
  notes?: string;
}

// カレンダーコンポーネント
interface CalendarProps {
  view: 'day' | 'week' | 'month';
  onReservationClick: (reservation: Reservation) => void;
  onTimeSlotClick: (date: Date) => void;
}
```

#### 3. 顧客管理システム（外部連携対応）

```typescript
interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  lineId?: string;
  instagramId?: string;
  notes?: string;
  visitCount: number;
  lastVisitDate?: Date;
  preferredContactMethod: 'LINE' | 'INSTAGRAM' | 'EMAIL' | 'PHONE';
  createdAt: Date;
}

// 顧客検索・フィルタリング
interface CustomerFilters {
  searchTerm: string;
  sortBy: 'name' | 'lastVisit' | 'visitCount';
  sortOrder: 'asc' | 'desc';
}
```

#### 4. メッセージ管理システム

```typescript
interface Message {
  id: string;
  tenantId: string;
  customerId: string;
  channel: 'LINE' | 'INSTAGRAM' | 'EMAIL';
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  messageType: 'TEXT' | 'IMAGE' | 'RESERVATION_REQUEST';
  externalMessageId?: string;
  createdAt: Date;
}

// メッセージスレッド
interface MessageThread {
  customerId: string;
  customer: Customer;
  lastMessage: Message;
  unreadCount: number;
  preferredChannel: 'LINE' | 'INSTAGRAM' | 'EMAIL';
}

// AI返信支援
interface AIReplyRequest {
  messageHistory: Message[];
  customerContext: Customer;
  businessContext: {
    businessHours: string;
    services: string[];
    policies: string;
  };
}
```

#### 5. リマインダーシステム

```typescript
interface ReminderTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: 'WEEK_BEFORE' | 'THREE_DAYS_BEFORE' | 'THANK_YOU';
  template: string;
  isActive: boolean;
  variables: string[]; // ['{customerName}', '{reservationDate}', '{menuName}']
}

interface ReminderJob {
  id: string;
  tenantId: string;
  reservationId: string;
  customerId: string;
  type: 'WEEK_BEFORE' | 'THREE_DAYS_BEFORE' | 'THANK_YOU';
  scheduledAt: Date;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  channel: 'LINE' | 'INSTAGRAM' | 'EMAIL';
  messageContent: string;
}
```

## データモデル設計

### データベーススキーマ

#### 1. 認証・テナント管理

```sql
-- users (Supabase Auth管理)
-- Supabaseが自動管理するため、カスタムテーブルは不要

-- tenants (サロン情報)
CREATE TABLE tenants (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'light' CHECK (plan IN ('light', 'standard', 'premium')),
  phone_number TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_tenant_mapping (ユーザー・テナント関連)
CREATE TABLE user_tenant_mapping (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);
```

#### 2. 業務データ

```sql
-- customers (顧客) - 外部連携対応
CREATE TABLE customers (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  line_id TEXT,
  instagram_id TEXT,
  preferred_contact_method TEXT DEFAULT 'PHONE' CHECK (
    preferred_contact_method IN ('LINE', 'INSTAGRAM', 'EMAIL', 'PHONE')
  ),
  notes TEXT,
  visit_count INTEGER DEFAULT 0,
  last_visit_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- service_menus (サービスメニュー)
CREATE TABLE service_menus (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  duration INTEGER NOT NULL, -- 分単位
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reservations (予約)
CREATE TABLE reservations (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  staff_id TEXT, -- ライトプランでは1名のみなので外部キー制約なし
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  menu_content TEXT NOT NULL,
  status TEXT DEFAULT 'TENTATIVE' CHECK (
    status IN ('TENTATIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. 設定データ

```sql
-- business_settings (営業設定)
CREATE TABLE business_settings (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_hours JSONB NOT NULL DEFAULT '{}', -- 曜日別営業時間
  weekly_closed_days INTEGER[] DEFAULT '{}', -- 定休日 [0-6]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- plan_usage (プラン使用状況)
CREATE TABLE plan_usage (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- YYYY-MM-01形式
  customer_count INTEGER DEFAULT 0,
  reservation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, month)
);
```

#### 4. メッセージ管理・リマインダーデータ

```sql
-- messages (メッセージ)
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('LINE', 'INSTAGRAM', 'EMAIL')),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
  message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'RESERVATION_REQUEST')),
  external_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reminder_templates (リマインダーテンプレート)
CREATE TABLE reminder_templates (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('WEEK_BEFORE', 'THREE_DAYS_BEFORE', 'THANK_YOU')),
  template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '[]', -- ["{customerName}", "{reservationDate}", "{menuName}"]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- reminder_jobs (リマインダージョブ)
CREATE TABLE reminder_jobs (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('WEEK_BEFORE', 'THREE_DAYS_BEFORE', 'THANK_YOU')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  channel TEXT NOT NULL CHECK (channel IN ('LINE', 'INSTAGRAM', 'EMAIL')),
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- api_settings (外部API設定)
CREATE TABLE api_settings (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('LINE', 'INSTAGRAM', 'GOOGLE_CALENDAR')),
  credentials JSONB NOT NULL, -- 暗号化された認証情報
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, service)
);
```

### Row Level Security (RLS) ポリシー

```sql
-- 全テーブルでRLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー
CREATE POLICY "Users can only access their tenant's data" ON customers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_mapping 
      WHERE user_id = auth.uid()
    )
  );

-- 同様のポリシーを他のテーブルにも適用
```

## インターフェース設計

### API設計 (Supabase Client)

#### 1. 認証API

```typescript
// lib/supabase.ts
export const supabaseAuth = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    return data;
  },
  
  signUp: async (email: string, password: string, tenantName: string) => {
    // 1. ユーザー作成
    // 2. テナント作成
    // 3. user_tenant_mapping作成
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
  }
};
```

#### 2. 予約管理API

```typescript
// hooks/useReservations.ts
export const useReservations = () => {
  const queryClient = useQueryClient();
  
  const reservations = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          customer:customers(name, phone_number)
        `)
        .order('start_time');
      
      if (error) throw error;
      return data;
    }
  });
  
  const createReservation = useMutation({
    mutationFn: async (reservation: CreateReservationInput) => {
      // プラン制限チェック
      await checkMonthlyReservationLimit();
      
      const { data, error } = await supabase
        .from('reservations')
        .insert(reservation)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    }
  });
  
  return { reservations, createReservation };
};
```

#### 3. メッセージ管理API

```typescript
// hooks/useMessages.ts
export const useMessages = () => {
  const queryClient = useQueryClient();
  
  const messageThreads = useQuery({
    queryKey: ['message-threads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          customer:customers(name, preferred_contact_method, line_id, instagram_id, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // メッセージをスレッド形式にグループ化
      return groupMessagesByCustomer(data);
    }
  });
  
  const sendMessage = useMutation({
    mutationFn: async ({ customerId, content, channel }: SendMessageInput) => {
      // 1. データベースにメッセージ保存
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          customer_id: customerId,
          content,
          channel,
          direction: 'OUTBOUND'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // 2. 外部APIで実際にメッセージ送信
      await sendExternalMessage(channel, customerId, content);
      
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    }
  });
  
  return { messageThreads, sendMessage };
};

// lib/externalAPI.ts
export const sendExternalMessage = async (
  channel: 'LINE' | 'INSTAGRAM' | 'EMAIL',
  customerId: string,
  content: string
) => {
  switch (channel) {
    case 'LINE':
      return await sendLineMessage(customerId, content);
    case 'INSTAGRAM':
      return await sendInstagramMessage(customerId, content);
    case 'EMAIL':
      return await sendEmailMessage(customerId, content);
  }
};
```

#### 4. AI返信支援API

```typescript
// hooks/useAIReply.ts
export const useAIReply = () => {
  const generateReply = useMutation({
    mutationFn: async ({ messageHistory, customerContext }: AIReplyRequest) => {
      const response = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageHistory,
          customerContext,
          businessContext: await getBusinessContext()
        })
      });
      
      if (!response.ok) throw new Error('AI返信生成に失敗しました');
      
      const { reply } = await response.json();
      return reply;
    }
  });
  
  return { generateReply };
};
```

#### 5. リマインダーシステムAPI

```typescript
// hooks/useReminders.ts
export const useReminders = () => {
  const scheduleReminder = useMutation({
    mutationFn: async (reservation: Reservation) => {
      const customer = await getCustomer(reservation.customerId);
      const templates = await getReminderTemplates();
      
      // 1週間前、3日前、来店後のリマインダーをスケジュール
      const jobs = [
        {
          type: 'WEEK_BEFORE',
          scheduledAt: subDays(reservation.startTime, 7),
          channel: customer.preferredContactMethod,
          messageContent: fillTemplate(templates.weekBefore, reservation, customer)
        },
        {
          type: 'THREE_DAYS_BEFORE',
          scheduledAt: subDays(reservation.startTime, 3),
          channel: customer.preferredContactMethod,
          messageContent: fillTemplate(templates.threeDaysBefore, reservation, customer)
        },
        {
          type: 'THANK_YOU',
          scheduledAt: addHours(reservation.endTime, 2),
          channel: customer.preferredContactMethod,
          messageContent: fillTemplate(templates.thankYou, reservation, customer)
        }
      ];
      
      const { data, error } = await supabase
        .from('reminder_jobs')
        .insert(jobs.map(job => ({
          ...job,
          reservation_id: reservation.id,
          customer_id: reservation.customerId
        })));
        
      if (error) throw error;
      return data;
    }
  });
  
  return { scheduleReminder };
};
```

### 美容師向けプレミアムデザイン設計

#### 1. デザインシステム（Atlassian Design System参考）

```typescript
// design-tokens.ts - 美容業界向けデザイントークン
export const designTokens = {
  colors: {
    // プライマリーカラー - 上品なローズゴールド系
    primary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      500: '#ec4899',  // メインブランドカラー
      600: '#db2777',
      900: '#831843'
    },
    // セカンダリーカラー - 洗練されたグレー
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      500: '#737373',
      800: '#262626',
      900: '#171717'
    },
    // アクセントカラー - 美容業界らしいパステル
    accent: {
      lavender: '#e6e6fa',
      champagne: '#f7e7ce',
      pearl: '#f8f6f0'
    }
  },
  typography: {
    // 美しいタイポグラフィ階層
    fontFamily: {
      sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
      display: ['Playfair Display', 'serif'] // エレガントなヘッダー用
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    }
  },
  spacing: {
    // タッチフレンドリーなスペーシング
    touchTarget: '44px', // 最小タップエリア
    cardPadding: '24px',
    sectionGap: '32px'
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    full: '9999px'
  },
  shadows: {
    // 上品で柔らかい影
    soft: '0 2px 8px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
    strong: '0 8px 32px rgba(0, 0, 0, 0.12)'
  }
};
```

#### 2. コンポーネントデザイン（Atlassian風）

```typescript
// components/ui/Button.tsx - プレミアムボタンデザイン
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'floating';
  size: 'sm' | 'md' | 'lg' | 'touch'; // touchは44px以上保証
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ variant, size, children, ...props }) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95 transform
  `;
  
  const variants = {
    primary: `
      bg-gradient-to-r from-primary-500 to-primary-600
      text-white shadow-soft hover:shadow-medium
      hover:from-primary-600 hover:to-primary-700
    `,
    secondary: `
      bg-white border border-neutral-200
      text-neutral-800 shadow-soft hover:shadow-medium
      hover:bg-neutral-50
    `,
    floating: `
      bg-primary-500 text-white rounded-full shadow-strong
      hover:shadow-xl hover:bg-primary-600
      fixed bottom-6 right-6 z-50
    `
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[32px]',
    md: 'px-4 py-2.5 text-base min-h-[40px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
    touch: 'px-6 py-3 text-base min-h-[44px] min-w-[44px]' // タッチ最適化
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

#### 3. レスポンシブデザイン戦略

```typescript
// tailwind.config.js - 美容師向け最適化
module.exports = {
  theme: {
    screens: {
      'xs': '475px',   // 小型スマートフォン
      'sm': '640px',   // スマートフォン (縦)
      'md': '768px',   // タブレット (縦)
      'lg': '1024px',  // タブレット (横) / 小型PC
      'xl': '1280px',  // デスクトップ
      '2xl': '1536px'  // 大型デスクトップ
    },
    extend: {
      // タッチフレンドリーなスペーシング
      spacing: {
        'touch': '44px',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)'
      },
      // 美容業界向けカラーパレット
      colors: designTokens.colors,
      // エレガントなフォント
      fontFamily: designTokens.typography.fontFamily,
      // 美しいアニメーション
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite'
      }
    }
  }
}
```

#### 4. スマホ操作性重視のコンポーネント設計

```typescript
// components/ui/Card.tsx - 美容師向けエレガントカード
const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-soft border border-neutral-100
        hover:shadow-medium transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// components/ui/FloatingActionButton.tsx - スマホ最適化FAB
const FloatingActionButton: React.FC<FABProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        fixed bottom-6 right-6 z-50
        w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600
        text-white rounded-full shadow-strong
        flex items-center justify-center
        hover:shadow-xl hover:scale-105
        active:scale-95 transition-all duration-200
        md:w-auto md:px-6 md:rounded-lg
      "
    >
      <span className="md:hidden">{icon}</span>
      <span className="hidden md:flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
};

// components/common/MobileNavigation.tsx - スマホ専用ナビゲーション
const MobileNavigation: React.FC = () => {
  const navItems = [
    { icon: <Home />, label: 'ホーム', path: '/dashboard' },
    { icon: <Calendar />, label: '予約', path: '/reservations' },
    { icon: <Users />, label: '顧客', path: '/customers' },
    { icon: <MessageCircle />, label: 'メッセージ', path: '/messages' },
    { icon: <Settings />, label: '設定', path: '/settings' }
  ];

  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-40
      bg-white border-t border-neutral-200
      safe-bottom pb-safe-bottom
      md:hidden
    ">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="
              flex flex-col items-center justify-center
              min-w-[44px] min-h-[44px] px-2 py-1
              text-neutral-600 hover:text-primary-500
              transition-colors duration-200
            "
          >
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
```

#### 5. タッチジェスチャー対応

```typescript
// hooks/useSwipeGesture.ts - スワイプジェスチャー対応
export const useSwipeGesture = (onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
};

// components/reservations/SwipeableCalendar.tsx - スワイプ対応カレンダー
const SwipeableCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture(
    () => setCurrentDate(addDays(currentDate, 1)), // 左スワイプで次の日
    () => setCurrentDate(subDays(currentDate, 1))  // 右スワイプで前の日
  );

  return (
    <div
      className="touch-pan-x"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <CalendarView date={currentDate} />
    </div>
  );
};
```

#### 6. 美容師向けマイクロインタラクション

```typescript
// components/ui/AnimatedButton.tsx - 心地よいアニメーション
const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="
        bg-gradient-to-r from-primary-500 to-primary-600
        text-white font-medium py-3 px-6 rounded-lg
        shadow-soft hover:shadow-medium
        transition-shadow duration-300
      "
      {...props}
    >
      {children}
    </motion.button>
  );
};

// components/ui/LoadingSpinner.tsx - エレガントなローディング
const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary-100 rounded-full"></div>
        <div className="
          absolute top-0 left-0 w-12 h-12
          border-4 border-transparent border-t-primary-500
          rounded-full animate-spin
        "></div>
      </div>
    </div>
  );
};

// components/ui/Toast.tsx - 美しい通知デザイン
const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  const variants = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`
        fixed top-4 right-4 z-50
        p-4 rounded-lg border shadow-medium
        max-w-sm w-full
        ${variants[type]}
      `}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-current hover:opacity-70"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};
```

#### 7. レスポンシブコンポーネント実装例

```typescript
// components/reservations/ResponsiveCalendar.tsx
const ResponsiveCalendar: React.FC<CalendarProps> = ({ view }) => {
  const [isMobile] = useMediaQuery('(max-width: 768px)');
  const [isTablet] = useMediaQuery('(min-width: 769px) and (max-width: 1023px)');

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* スマホ: カード形式の予約リスト */}
        <div className="grid gap-3">
          {reservations.map((reservation) => (
            <motion.div
              key={reservation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                bg-white rounded-lg p-4 shadow-soft
                border-l-4 border-primary-500
                active:bg-neutral-50 transition-colors
              "
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-neutral-900">
                    {reservation.customer.name}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    {reservation.menuContent}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">
                    {format(reservation.startTime, 'HH:mm')} - 
                    {format(reservation.endTime, 'HH:mm')}
                  </p>
                </div>
                <StatusBadge status={reservation.status} />
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* フローティングアクションボタン */}
        <FloatingActionButton
          icon={<Plus />}
          label="新規予約"
          onClick={() => setShowNewReservation(true)}
        />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {/* タブレット: 2カラムレイアウト */}
        <Card className="p-4">
          <WeekView reservations={reservations} />
        </Card>
        <Card className="p-4">
          <ReservationDetails />
        </Card>
      </div>
    );
  }

  // デスクトップ: フル機能カレンダー
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-3">
        <FullCalendarView reservations={reservations} />
      </div>
      <div className="space-y-4">
        <QuickActions />
        <UpcomingReservations />
      </div>
    </div>
  );
};
```

## エラーハンドリング設計

### 1. エラー分類と対応

```typescript
// utils/errorHandling.ts
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PLAN_LIMIT_ERROR = 'PLAN_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

export const handleError = (error: unknown): UserFriendlyError => {
  if (error instanceof Error) {
    // Supabaseエラーの分類
    if (error.message.includes('row-level security')) {
      return {
        type: ErrorType.AUTHENTICATION_ERROR,
        message: 'アクセス権限がありません。再度ログインしてください。',
        action: 'REDIRECT_LOGIN'
      };
    }
    
    if (error.message.includes('plan_limit')) {
      return {
        type: ErrorType.PLAN_LIMIT_ERROR,
        message: 'プランの利用制限に達しました。アップグレードをご検討ください。',
        action: 'SHOW_UPGRADE_MODAL'
      };
    }
  }
  
  return {
    type: ErrorType.NETWORK_ERROR,
    message: '一時的なエラーが発生しました。しばらく後に再度お試しください。',
    action: 'RETRY'
  };
};
```

### 2. グローバルエラーハンドリング

```typescript
// components/common/ErrorBoundary.tsx
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // エラーログ記録
        console.error('Application Error:', error, errorInfo);
        
        // 将来的にはSentryなどの監視サービスに送信
        // Sentry.captureException(error);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};
```

## テスト戦略

### 1. テスト構成

```typescript
// tests/
├── unit/                   # ユニットテスト
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/            # 統合テスト
│   ├── auth.test.ts
│   ├── reservations.test.ts
│   └── customers.test.ts
└── e2e/                    # E2Eテスト (将来実装)
    └── user-flows.spec.ts
```

### 2. 重要機能のテスト例

```typescript
// tests/unit/hooks/useReservations.test.ts
describe('useReservations', () => {
  it('should create reservation within plan limits', async () => {
    // プラン制限内での予約作成テスト
  });
  
  it('should reject reservation when plan limit exceeded', async () => {
    // プラン制限超過時のエラーハンドリングテスト
  });
  
  it('should update reservation status correctly', async () => {
    // 予約ステータス更新テスト
  });
});
```

## セキュリティ設計

### 1. 認証・認可

- **Supabase Auth**: JWT ベースの認証
- **Row Level Security**: テナント分離
- **HTTPS強制**: 全通信の暗号化

### 2. データ保護

```typescript
// lib/planLimits.ts
export const checkPlanLimits = async (tenantId: string, action: string) => {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single();
    
  const limits = PLAN_LIMITS[tenant.plan];
  
  // 現在の使用状況をチェック
  const usage = await getCurrentUsage(tenantId);
  
  if (usage[action] >= limits[action]) {
    throw new Error(`plan_limit_${action}`);
  }
};
```

## パフォーマンス最適化

### 1. フロントエンド最適化

```typescript
// React.memo による再レンダリング防止
export const ReservationCard = React.memo<ReservationCardProps>(({ reservation }) => {
  return <div>{/* 予約カード内容 */}</div>;
});

// useMemo による計算結果キャッシュ
const filteredReservations = useMemo(() => {
  return reservations.filter(r => r.status === selectedStatus);
}, [reservations, selectedStatus]);
```

### 2. データベース最適化

```sql
-- インデックス作成
CREATE INDEX idx_reservations_tenant_date ON reservations(tenant_id, start_time);
CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX idx_reservations_status ON reservations(tenant_id, status);
```

この設計書では、ライトプランの要件を満たす技術的な実装方針を詳細に定義しました。特に機能間連動、プラン制限、レスポンシブ対応、エラーハンドリングに重点を置いた設計となっています。