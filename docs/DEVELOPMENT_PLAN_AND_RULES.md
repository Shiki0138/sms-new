# SMS美容室管理システム - 開発計画・ルール文書

## 📋 開発ルール（厳守事項）

### 🚫 **禁止事項**
1. **不要ファイル作成禁止**
   - 重複ファイル（*2.html、*-backup等）を作成しない
   - テスト用ファイルは/tests/フォルダにのみ作成
   - 開発中の一時ファイルはプロジェクトに残さない

2. **データ・設定の重複禁止**
   - 同じ設定を複数箇所に書かない
   - 設定は環境変数または設定ファイルに一元化
   - ハードコードされた値を禁止

### ✅ **必須事項**
3. **定期的なプッシュ**
   - 機能完成時は必ずコミット・プッシュ
   - 1日の作業終了時にプッシュ
   - 大きな変更前にバックアップコミット

4. **利用者中心開発**
   - 美容室スタッフの実際の業務フローを考慮
   - 直感的で迷わない操作性を最優先
   - エラー時の分かりやすいメッセージ

5. **モバイルファースト**
   - スマートフォンでの操作性を最優先
   - レスポンシブデザイン必須
   - タッチ操作に適したボタンサイズ

## 🏗️ **システム全体アーキテクチャ**

### **現在のアーキテクチャ（Phase 1）**
```
┌─────────────────────────────────────────┐
│            店舗管理システム                │
├─────────────────────────────────────────┤
│ Frontend: Vanilla JS + CSS             │
│ Backend: Node.js + Express            │
│ Database: Firebase Firestore          │
│ Deploy: Vercel                         │
│ Auth: JWT + Firebase Auth             │
└─────────────────────────────────────────┘
```

### **目標アーキテクチャ（Phase 3）**
```
┌─────────────────────────────────────────────────────────────┐
│                統合美容室プラットフォーム                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  管理者システム        顧客Webアプリ         ECサイト          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ 現在のSMS   │    │ セルフ予約   │    │ 商品販売    │    │
│  │ システム    │    │ 履歴確認    │    │ ポイント    │    │
│  │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │    │
│  │ │顧客管理 │ │    │ │予約管理 │ │    │ │商品管理 │ │    │
│  │ │予約管理 │ │◄──►│ │通知受信 │ │◄──►│ │注文管理 │ │    │
│  │ │売上管理 │ │    │ │ポイント │ │    │ │在庫管理 │ │    │
│  │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    統合API Gateway                      │ │
│  │  ・認証統合  ・データ同期  ・決済処理  ・通知配信        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📈 **段階的開発計画**

### **Phase 1: 基盤強化（4-6週間）**

#### **Week 1-2: 緊急セキュリティ修正**
- [ ] JWT認証システム実装
- [ ] パスワードハッシュ化
- [ ] 環境変数による機密情報管理
- [ ] セキュリティヘッダー設定

#### **Week 3-4: データベース統合**
- [ ] Firebase Firestore接続
- [ ] データモデル設計・実装
- [ ] 既存データ移行
- [ ] バックアップシステム構築

#### **Week 5-6: API安定化**
- [ ] SMS/Email API実装
- [ ] エラーハンドリング標準化
- [ ] レート制限実装
- [ ] ログ記録システム

### **Phase 2: 顧客向け機能（3-4ヶ月）**

#### **Month 1: 顧客ポータル基盤**
```javascript
// 技術スタック
const techStack = {
  frontend: 'Next.js 14 + TypeScript',
  styling: 'Tailwind CSS',
  api: 'tRPC',
  auth: 'NextAuth.js',
  database: 'Supabase PostgreSQL',
  realtime: 'Supabase Realtime'
};
```

#### **Month 2: 予約システム開発**
- [ ] リアルタイム空き状況表示
- [ ] 予約作成・変更・キャンセル
- [ ] 自動確認メール/SMS送信
- [ ] 予約競合防止システム

#### **Month 3: モバイルアプリ対応**
- [ ] PWA実装
- [ ] プッシュ通知機能
- [ ] オフライン機能
- [ ] アプリストア公開準備

### **Phase 3: ECサイト統合（6-9ヶ月）**

#### **Month 1-2: ECプラットフォーム選定・統合**
```javascript
// EC統合アーキテクチャ
const ecommerceIntegration = {
  platform: 'Medusa.js', // オープンソース、カスタマイズ可
  payment: 'Stripe', // 決済処理
  inventory: 'Supabase', // 在庫管理
  shipping: 'Yamato API', // 配送連携
  points: 'Custom System' // ポイントシステム
};
```

#### **Month 3-4: 商品管理システム**
- [ ] 美容商品カタログ作成
- [ ] 在庫管理システム
- [ ] 注文処理ワークフロー
- [ ] 配送・追跡システム

#### **Month 5-6: 顧客統合・分析**
- [ ] 予約・購入データ統合
- [ ] ポイント・ロイヤリティシステム
- [ ] 顧客行動分析
- [ ] 個人化推奨システム

## 🎯 **開発優先順位**

### **緊急（今週実装）**
1. **セキュリティ強化** - JWT_SECRET、認証システム
2. **Firebase接続** - データ永続化
3. **基本API修正** - エラーハンドリング

### **高優先度（1ヶ月以内）**
1. **SMS/Email API統合**
2. **予約管理の安定化**
3. **モバイル最適化**

### **中優先度（3ヶ月以内）**
1. **顧客向け予約システム**
2. **自動化機能実装**
3. **分析・レポート機能**

### **長期（6ヶ月以上）**
1. **ECサイト統合**
2. **マルチテナント対応**
3. **AIによる予約最適化**

## 💰 **予算・工数見積もり**

| フェーズ | 期間 | 工数 | 予算 |
|---------|------|------|------|
| Phase 1 基盤強化 | 6週間 | 240h | ¥2.4M |
| Phase 2 顧客機能 | 4ヶ月 | 640h | ¥6.4M |
| Phase 3 EC統合 | 6ヶ月 | 960h | ¥9.6M |
| **合計** | **12ヶ月** | **1,840h** | **¥18.4M** |

## 🔧 **技術選定根拠**

### **フロントエンド技術**
```javascript
// Current: Vanilla JavaScript
// 利点: 軽量、シンプル
// 課題: 大規模化に不向き、保守性

// Future: Next.js + TypeScript
// 利点: 型安全、SEO、SSR、大規模対応
// 移行理由: 長期保守性、開発効率、チーム開発対応
```

### **バックエンド技術**
```javascript
// Current: Express.js
// 継続理由: 安定性、豊富なエコシステム

// Enhancement: 
const enhancements = {
  validation: 'joi', // 入力検証
  documentation: 'swagger', // API文書化
  testing: 'jest', // テスト自動化
  monitoring: 'winston', // ログ管理
  cache: 'redis', // パフォーマンス向上
};
```

### **データベース戦略**
```javascript
// Primary: Firebase Firestore
// 理由: NoSQL、スケーラブル、リアルタイム

// Secondary: Supabase PostgreSQL (顧客向け機能用)
// 理由: SQL、複雑クエリ、ACID特性

// Cache: Redis
// 理由: 高速アクセス、セッション管理
```

## 🛡️ **セキュリティ要件**

### **認証・認可**
```javascript
// 管理者認証
const adminAuth = {
  method: 'JWT + 2FA',
  expiry: '8 hours',
  refresh: 'automatic',
  roles: ['super_admin', 'manager', 'staff']
};

// 顧客認証  
const customerAuth = {
  method: 'JWT + OTP',
  expiry: '30 days',
  verification: 'phone/email',
  privacy: 'GDPR compliant'
};
```

### **データ保護**
```javascript
const dataProtection = {
  encryption: 'AES-256',
  transit: 'HTTPS only',
  backup: 'encrypted daily',
  retention: 'configurable',
  anonymization: 'GDPR ready'
};
```

## 📱 **モバイル最適化戦略**

### **レスポンシブデザイン原則**
```css
/* モバイルファースト設計 */
.container {
  /* モバイル（優先） */
  padding: 0.5rem;
  
  /* タブレット */
  @media (min-width: 768px) {
    padding: 1rem;
  }
  
  /* デスクトップ */
  @media (min-width: 1024px) {
    padding: 2rem;
  }
}

/* タッチ操作対応 */
.button {
  min-height: 44px; /* iOS Human Interface Guidelines */
  min-width: 44px;
  touch-action: manipulation;
}
```

### **PWA要件**
```javascript
// Progressive Web App設定
const pwaConfig = {
  manifest: {
    name: "Salon Lumière 管理システム",
    short_name: "SalonSMS",
    theme_color: "#d4a574",
    background_color: "#f8e5e1",
    display: "standalone",
    orientation: "portrait"
  },
  
  serviceWorker: {
    caching: 'offline-first',
    updates: 'automatic',
    notifications: 'enabled'
  }
};
```

## 🔄 **開発ワークフロー**

### **Git管理ルール**
```bash
# ブランチ戦略
main                    # 本番環境（保護）
├── develop            # 開発統合
├── feature/[機能名]   # 機能開発
├── hotfix/[修正名]    # 緊急修正
└── release/[版本]     # リリース準備

# コミットメッセージ規約
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### **品質管理**
```javascript
// 必須チェック項目
const qualityChecks = {
  before_commit: [
    'ESLint検証通過',
    'TypeScript型チェック',
    'ユニットテスト実行',
    'セキュリティ監査'
  ],
  
  before_deploy: [
    '結合テスト完了',
    'パフォーマンステスト',
    'セキュリティ監査',
    'モバイルテスト'
  ]
};
```

## 📊 **成功指標（KPI）**

### **開発効率指標**
- コード品質スコア: 90%以上
- テストカバレッジ: 80%以上
- バグ修正時間: 平均24時間以内
- 新機能デプロイ頻度: 週2回以上

### **ビジネス指標**
- ページロード時間: 3秒以下
- システム稼働率: 99.9%以上
- ユーザー満足度: 4.5/5.0以上
- 業務効率改善: 30%向上

## 🚀 **実装開始戦略**

### **今すぐ実行（緊急）**
1. 環境変数設定
2. Firebase実データベース接続
3. 基本認証システム実装

### **1週間以内**
1. セキュリティ修正完了
2. SMS/Email API統合
3. エラーハンドリング改善

### **1ヶ月以内**
1. 顧客向け予約システム基盤
2. モバイル最適化完了
3. 基本的な自動化機能

---

**このルールに従い、美容室業界をリードする統合管理プラットフォームを構築します。**