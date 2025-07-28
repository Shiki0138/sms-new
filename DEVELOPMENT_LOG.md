# 🏗️ 開発記録 - 美容サロン管理システム（ライトプラン）

## 📊 プロジェクト概要

**プロジェクト名**: 美容サロン管理システム（ライトプラン対応版）  
**開発期間**: 2025年7月  
**技術スタック**: React 19 + TypeScript + Tailwind CSS + Supabase + Vercel  
**対象ユーザー**: 小規模美容サロン経営者（ライトプランユーザー）

## 🎯 開発目標

ライトプランユーザー向けに、コスト効率の良い美容サロン管理システムを構築。適切な機能制限を設けながら、実用的なサロン運営支援機能を提供する。

## 📋 実装機能一覧

### 1. 🔐 認証・テナント管理
- **Supabase認証**: メール認証、パスワードリセット
- **テナント分離**: 複数サロンのデータを完全分離
- **プラン管理**: ライトプラン制限の適用

### 2. 👥 顧客管理
- **顧客登録**: 基本情報、連絡先、LINE/Instagram連携
- **制限事項**: 最大100名まで登録可能
- **検索・フィルタ**: 名前、電話番号での検索
- **来店履歴**: 予約・施術履歴の表示

### 3. 📅 予約管理
- **カレンダー表示**: 日/週/月表示切り替え
- **予約登録**: 顧客選択、日時設定、メニュー選択
- **制限事項**: 月間50件まで予約可能
- **休日設定**: カレンダーへの休日反映

### 4. 💬 メッセージ機能
- **LINE/Instagram/メール**: 統合メッセージ管理
- **AI返信生成**: Gemini AIによる自動返信文作成
- **制限事項**: 月間200回までAI返信利用可能
- **会話履歴**: 顧客別メッセージスレッド管理

### 5. 📢 マーケティング機能（新機能）

#### 🔄 リマインダーシステム
- **予約前リマインダー**: 1週間前・3日前の自動送信
- **施術後フォロー**: 施術翌日のお礼メッセージ
- **カムバック促進**: 3ヶ月以上未来店顧客への促進メッセージ
- **チャンネル優先順位**: LINE → Instagram → メール

#### 📤 一斉配信機能
- **セグメント配信**: 顧客属性に基づく配信対象選定
- **テンプレート**: 急な休業、キャンペーン、カムバック促進
- **配信履歴**: 送信結果と開封率の追跡
- **制限事項**: 月間200通まで配信可能

#### 🎯 顧客セグメント
- **全顧客**: 全ての登録顧客
- **新規顧客**: 初回来店から30日以内
- **常連顧客**: 月1回以上来店
- **VIP顧客**: 累計10万円以上利用
- **休眠顧客**: 3ヶ月以上未来店
- **チャンネル別**: LINE友だち、Instagramフォロワー、メール購読者

### 6. ⚙️ 設定管理
- **営業時間設定**: 曜日別営業時間
- **休日設定**: カスタム休日登録
- **API連携**: LINE/Instagram/メール設定
- **プラン使用状況**: リアルタイム使用量表示

### 7. 📊 分析・レポート
- **使用量ダッシュボード**: プラン制限に対する使用状況
- **配信効果分析**: メッセージ配信の成功率・開封率
- **顧客分析**: セグメント別顧客数推移

## 🏗️ 技術的実装詳細

### アーキテクチャ
```
React 19 Frontend (Vite)
├── Components Layer
│   ├── UI Components (Button, Card, Input)
│   ├── Feature Components (Messages, Reservations, Marketing)
│   └── Layout Components (Navigation, AppLayout)
├── Hooks Layer
│   ├── Data Hooks (useCustomers, useReservations)
│   ├── API Hooks (useMessages, useAiReply)
│   └── Utility Hooks (useAuth, usePlanLimits)
├── Services Layer
│   ├── API Services (LINE, Instagram, Email)
│   ├── Business Logic (BulkMessaging, ReminderScheduler)
│   └── AI Services (Gemini, AIReplyService)
└── Supabase Backend
    ├── Database (PostgreSQL)
    ├── Authentication
    ├── Real-time subscriptions
    └── Row Level Security (RLS)
```

### データベース設計
```sql
-- メインテーブル
tenants (サロン情報)
customers (顧客管理)
reservations (予約管理)
staff (スタッフ管理)
messages (メッセージ履歴)

-- マーケティング機能
bulk_messages (一斉配信)
bulk_message_logs (配信履歴)
reminder_configs (リマインダー設定)
reminder_logs (リマインダー履歴)
customer_channels (連絡先チャンネル)

-- 設定・制限
plan_limits (プラン制限)
plan_usage_logs (使用量記録)
business_hours (営業時間)
holidays (休日設定)
```

### プラン制限実装
```typescript
// 顧客登録制限
const customerCount = await getCustomerCount(tenantId);
if (customerCount >= 100) {
  throw new Error('ライトプランでは最大100名まで顧客登録が可能です');
}

// 月間予約制限
const monthlyReservations = await getMonthlyReservationCount(tenantId);
if (monthlyReservations >= 50) {
  throw new Error('今月の予約数が上限（50件）に達しています');
}

// AI返信制限
const monthlyAiUsage = await getMonthlyAiUsage(tenantId);
if (monthlyAiUsage >= 200) {
  throw new Error('今月のAI返信回数が上限（200回）に達しています');
}
```

## 🚀 デプロイ戦略

### 本番環境構成
- **フロントエンド**: Vercel（静的サイトホスティング）
- **バックエンド**: Supabase（Database + Auth + Edge Functions）
- **外部API**: LINE Messaging API、Instagram Basic Display API、SendGrid
- **AI**: Google Gemini API

### CI/CD パイプライン
```bash
# GitHub Actions (予定)
git push → GitHub → Vercel Auto Deploy
       ↘ Database Migration (Supabase)
       ↘ Environment Variables Sync
```

## 📈 成果と学び

### 技術的成果
1. **モジュラー設計**: 機能別サービス分離による保守性向上
2. **プラン制限システム**: 効率的な使用量追跡と制限適用
3. **マルチチャンネル統合**: LINE/Instagram/メールの統一管理
4. **AI統合**: Gemini APIによる自然なメッセージ生成

### ユーザビリティ成果
1. **直感的UI**: 美容サロン業界に特化したデザイン
2. **モバイル対応**: レスポンシブデザインによる外出先利用
3. **自動化**: リマインダーによる業務効率化
4. **分析機能**: データ駆動の経営判断支援

### ライトプラン戦略
1. **適切な制限**: 小規模サロンの実需に合わせた上限設定
2. **段階的拡張**: プラン制限内で十分な機能提供
3. **アップグレード訴求**: 制限到達時の自然な上位プラン案内

## 🔄 今後の展開予定

### Phase 2 機能
- **在庫管理**: 美容商品・消耗品の在庫追跡
- **スタッフシフト**: 複数スタッフのシフト管理
- **売上分析**: より詳細な売上レポート機能

### Phase 3 機能
- **オンライン予約**: 顧客向けWeb予約システム
- **決済連携**: クレジットカード・電子マネー決済
- **外部連携**: 会計ソフト・POS レジ連携

## 💡 開発時の課題と解決策

### 1. プラン制限の実装
**課題**: リアルタイムな使用量追跡と制限適用  
**解決策**: Supabase関数とReact hooksの組み合わせでリアルタイム更新

### 2. マルチチャンネル統合
**課題**: LINE/Instagram/メールAPIの仕様統一  
**解決策**: IntegratedApiServiceクラスによる抽象化

### 3. AI返信の自然性
**課題**: 美容サロンらしい親しみやすい返信生成  
**解決策**: 業界特化プロンプトとコンテキスト情報の活用

### 4. レスポンシブ対応
**課題**: デスクトップとモバイルでの最適化  
**解決策**: Tailwind CSSのBreakpointを活用したアダプティブデザイン

## 🎉 まとめ

本プロジェクトでは、小規模美容サロン向けの実用的な管理システムを構築しました。ライトプランの制限内で、顧客管理・予約管理・メッセージ機能・マーケティング機能という核心的な機能を提供し、サロンの日常業務をデジタル化しました。

特にマーケティング機能（リマインダー・一斉配信・顧客セグメント）の実装により、売上向上に直結する機能を提供できた点が大きな成果です。

今後は実際のサロンでの運用を通じてフィードバックを収集し、更なる機能改善を進めていく予定です。

---

**開発者**: Claude (Anthropic)  
**最終更新**: 2025年7月28日  
**バージョン**: v1.0.0