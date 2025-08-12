// メッセージ管理システム用の型定義

export type ChannelType = 'line' | 'instagram' | 'email';
export type MessageType = 'received' | 'sent';
export type MediaType = 'image' | 'video' | 'audio' | 'file';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type ReminderType = 
  | 'pre_visit_7days' 
  | 'pre_visit_3days' 
  | 'pre_visit_1day' 
  | 'post_visit_24hours' 
  | 'post_visit_1week' 
  | 'post_visit_1month'
  | 'no_show_prevention'
  | 'service_maintenance'
  | 'seasonal_care'
  | 'loyalty_milestone';
export type IntegrationType = 'line' | 'instagram' | 'google_calendar' | 'hot_pepper';

// メッセージチャンネル
export interface MessageChannel {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel_type: ChannelType;
  channel_id: string; // LINEユーザーID、Instagramユーザー名、メールアドレス
  channel_name?: string; // 表示名
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// メッセージ
export interface Message {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel_id: string;
  message_type: MessageType;
  content: string;
  media_url?: string;
  media_type?: MediaType;
  is_read: boolean;
  is_ai_reply: boolean;
  thread_id?: string;
  external_message_id?: string;
  sent_at: string;
  created_at: string;
  updated_at: string;
  
  // リレーション
  channel?: MessageChannel;
  customer?: {
    id: string;
    name: string;
    phone_number?: string;
  };
}

// AI返信候補
export interface AiSuggestion {
  id: string;
  content: string;
  confidence: number; // 0-1の信頼度
  tone: 'formal' | 'casual' | 'friendly'; // トーン
}

// AI返信履歴
export interface AiReply {
  id: string;
  tenant_id: string;
  message_id: string;
  original_message: string;
  ai_suggestions: AiSuggestion[];
  selected_reply?: string;
  is_sent: boolean;
  feedback_rating?: number; // 1-5の評価
  created_at: string;
  updated_at: string;
  
  // リレーション
  message?: Message;
}

// リマインダー設定
export interface ReminderSetting {
  id: string;
  tenant_id: string;
  reminder_type: ReminderType;
  is_enabled: boolean;
  message_template: string;
  send_via_channels: ChannelType[];
  created_at: string;
  updated_at: string;
}

// 送信済みリマインダー
export interface SentReminder {
  id: string;
  tenant_id: string;
  customer_id: string;
  reservation_id: string;
  reminder_type: ReminderType;
  channel_type: ChannelType;
  message_content: string;
  sent_at: string;
  delivery_status: DeliveryStatus;
  created_at: string;
  
  // リレーション
  customer?: {
    id: string;
    name: string;
  };
  reservation?: {
    id: string;
    start_time: string;
    menu_content: string;
  };
}

// 外部API統合設定
export interface ApiIntegration {
  id: string;
  tenant_id: string;
  integration_type: IntegrationType;
  api_credentials: Record<string, any>; // 暗号化された認証情報
  webhook_url?: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// メッセージセンター用の統合ビュー
export interface MessageCenterView {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  channels: MessageChannel[];
  latest_message: Message;
  unread_count: number;
  last_contact_at: string;
}

// メッセージスレッド（顧客との会話履歴）
export interface MessageThread {
  customer: {
    id: string;
    name: string;
    phone_number?: string;
    email?: string;
  };
  channels: MessageChannel[];
  messages: Message[];
  unread_count: number;
  latest_message_at: string;
}

// AI返信リクエスト
export interface AiReplyRequest {
  message_id: string;
  original_message: string;
  customer_context: {
    name: string;
    visit_history: Array<{
      date: string;
      menu: string;
    }>;
    preferences?: string;
  };
  salon_context: {
    name: string;
    services: string[];
    business_hours: Record<string, any>;
  };
}

// AI返信レスポンス
export interface AiReplyResponse {
  suggestions: AiSuggestion[];
  processing_time: number;
  model_version: string;
}

// メッセージ送信リクエスト
export interface MessageSendRequest {
  channel_id: string;
  content: string;
  media_url?: string;
  media_type?: MediaType;
  is_ai_reply?: boolean;
  thread_id?: string;
}

// リマインダー送信リクエスト
export interface ReminderSendRequest {
  customer_id: string;
  reservation_id: string;
  reminder_type: ReminderType;
  channels: ChannelType[];
  custom_message?: string;
}

// 外部API統合状態
export interface IntegrationStatus {
  integration_type: IntegrationType;
  is_connected: boolean;
  last_sync_at?: string;
  sync_status: 'success' | 'error' | 'in_progress';
  error_message?: string;
  next_sync_at?: string;
}

// Webhook イベント
export interface WebhookEvent {
  type: 'message_received' | 'message_delivered' | 'user_added' | 'user_removed';
  channel_type: ChannelType;
  payload: Record<string, any>;
  received_at: string;
}

// メッセージ統計
export interface MessageStats {
  total_messages: number;
  received_messages: number;
  sent_messages: number;
  ai_replies: number;
  unread_messages: number;
  response_rate: number; // 返信率
  average_response_time: number; // 平均返信時間（分）
  period: {
    start: string;
    end: string;
  };
}

// プラン制限
export interface MessagePlanLimits {
  max_messages_per_month: number;
  max_ai_replies_per_month: number;
  message_history_retention_months: number;
  max_integrations: number;
}

// メッセージフィルター
export interface MessageFilter {
  channel_types?: ChannelType[];
  message_types?: MessageType[];
  is_read?: boolean;
  is_ai_reply?: boolean;
  date_from?: string;
  date_to?: string;
  customer_ids?: string[];
  search_query?: string;
}

// ページネーション
export interface MessagePagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// メッセージリストレスポンス
export interface MessageListResponse {
  messages: Message[];
  pagination: MessagePagination;
  filters_applied: MessageFilter;
}

// 自動リマインダーシステム用の追加型定義

// リマインダー配信ルール
export interface ReminderDeliveryRules {
  business_hours_only: boolean;
  skip_holidays: boolean;
  preferred_time: string;
  min_advance_hours?: number;
  max_retries?: number;
  retry_interval_hours?: number;
}

// リマインダー顧客フィルター
export interface ReminderCustomerFilters {
  customer_types?: ('new' | 'regular' | 'vip')[];
  min_price?: number;
  max_price?: number;
  service_categories?: string[];
  visit_count_min?: number;
  visit_count_max?: number;
}

// 拡張リマインダー設定
export interface EnhancedReminderSetting {
  id: string;
  tenant_id: string;
  reminder_type: ReminderType;
  label: string;
  description: string;
  is_enabled: boolean;
  timing_value: number;
  timing_unit: 'hours' | 'days' | 'weeks';
  message_template: string;
  send_via_channels: ChannelType[];
  delivery_rules: ReminderDeliveryRules;
  customer_filters?: ReminderCustomerFilters;
  priority: 'high' | 'medium' | 'low';
  retry_config: {
    max_retries: number;
    retry_interval_hours: number;
  };
  created_at: string;
  updated_at: string;
}

// スケジュールされたリマインダー
export interface ScheduledReminder {
  id: string;
  tenant_id: string;
  customer_id: string;
  reservation_id: string;
  reminder_type: ReminderType;
  scheduled_at: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  metadata: {
    setting_id: string;
    channels: ChannelType[];
    template: string;
    retry_count?: number;
    manual?: boolean;
    custom_message?: string;
  };
  created_at: string;
  updated_at: string;
}

// リマインダー配信ログ
export interface ReminderDeliveryLog {
  id: string;
  tenant_id: string;
  reminder_id: string;
  channel_type: ChannelType;
  attempt_number: number;
  delivery_status: DeliveryStatus;
  response_data: Record<string, any>;
  error_details?: string;
  processing_time_ms: number;
  delivered_at: string;
}

// リマインダー分析データ
export interface ReminderAnalytics {
  overview: {
    total_scheduled: number;
    total_sent: number;
    delivery_rate: number;
    open_rate: number;
    action_rate: number;
  };
  business_impact: {
    no_shows_prevented: number;
    revenue_saved: number;
    rebookings_generated: number;
    customer_satisfaction_improvement: number;
  };
  by_type: Array<{
    type: ReminderType;
    sent: number;
    opened: number;
    actioned: number;
    effectiveness: number;
  }>;
  optimization_suggestions: string[];
  period: {
    start: string;
    end: string;
  };
}

// リマインダー効果測定
export interface ReminderEffectiveness {
  reminder_id: string;
  delivery_status: DeliveryStatus;
  opened: boolean;
  clicked: boolean;
  action_taken: 'confirmed' | 'rescheduled' | 'cancelled' | 'no_action';
  response_time_hours?: number;
  business_impact: {
    no_show_prevented: boolean;
    rebooking_achieved: boolean;
    revenue_impact: number;
  };
}

// リマインダージョブ
export interface ReminderJob {
  id: string;
  tenant_id: string;
  job_type: 'scheduler' | 'sender' | 'analyzer' | 'cleanup';
  status: 'pending' | 'running' | 'completed' | 'failed';
  schedule_expression?: string; // cron expression
  last_run_at?: string;
  next_run_at?: string;
  run_count: number;
  error_count: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// リマインダーテンプレート
export interface ReminderTemplate {
  id: string;
  tenant_id: string;
  name: string;
  reminder_type: ReminderType;
  category: 'standard' | 'seasonal' | 'promotional' | 'emergency';
  template_content: string;
  channel_type: ChannelType;
  variables: string[]; // available template variables
  conditions?: Record<string, any>; // when to use this template
  usage_count: number;
  effectiveness_rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// リマインダー手動送信リクエスト
export interface ManualReminderRequest {
  customer_id: string;
  reservation_id: string;
  reminder_type: ReminderType;
  channels: ChannelType[];
  scheduled_at?: string;
  custom_message?: string;
  priority?: 'high' | 'medium' | 'low';
}

// リマインダーダッシュボード統計
export interface ReminderDashboardStats {
  today: {
    scheduled: number;
    sent: number;
    pending: number;
    failed: number;
  };
  this_week: {
    total_sent: number;
    delivery_rate: number;
    open_rate: number;
    action_rate: number;
  };
  trends: {
    no_show_reduction: number;
    customer_satisfaction: number;
    revenue_impact: number;
  };
  upcoming: Array<{
    reminder_type: ReminderType;
    count: number;
    next_scheduled: string;
  }>;
}