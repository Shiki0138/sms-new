// Bulk Messaging System Types

export type MessageTemplateCategory = 'reminder' | 'campaign' | 'announcement' | 'emergency' | 'custom';
export type CampaignType = 'one_time' | 'recurring' | 'triggered';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
export type TriggerType = 'before_appointment' | 'after_appointment' | 'no_visit' | 'birthday';
export type SegmentType = 'static' | 'dynamic';

// Message Template
export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  category: MessageTemplateCategory;
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Customer Message Preferences
export interface CustomerMessagePreference {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel_type: 'line' | 'email' | 'sms';
  is_opted_in: boolean;
  opt_in_date?: string;
  opt_out_date?: string;
  opt_out_reason?: string;
  // Message type preferences
  receive_reminders: boolean;
  receive_campaigns: boolean;
  receive_announcements: boolean;
  receive_urgent: boolean;
  // Preferred send times
  preferred_time_start: string;
  preferred_time_end: string;
  preferred_days: string[];
  created_at: string;
  updated_at: string;
}

// Campaign
export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  template_id?: string;
  subject?: string;
  content?: string;
  target_segments: string[];
  target_filters: Record<string, any>;
  send_channels: ('line' | 'email' | 'sms')[];
  scheduled_at?: string;
  sent_at?: string;
  completed_at?: string;
  // Statistics
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  click_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relations
  template?: MessageTemplate;
}

// Campaign Message
export interface CampaignMessage {
  id: string;
  tenant_id: string;
  campaign_id: string;
  customer_id: string;
  channel_type: string;
  message_id?: string;
  status: MessageStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  clicked_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  // Relations
  campaign?: Campaign;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
  };
}

// Reminder Rule
export interface ReminderRule {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_timing: number; // Minutes before/after
  template_id?: string;
  send_channels: ('line' | 'email' | 'sms')[];
  is_active: boolean;
  conditions: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  template?: MessageTemplate;
}

// Customer Segment
export interface CustomerSegment {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  segment_type: SegmentType;
  conditions: Record<string, any>;
  customer_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  customer_count?: number;
}

// Message Queue Item
export interface MessageQueueItem {
  id: string;
  tenant_id: string;
  customer_id: string;
  campaign_id?: string;
  reminder_rule_id?: string;
  channel_type: string;
  priority: number;
  scheduled_for: string;
  content: string;
  subject?: string;
  metadata: Record<string, any>;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  last_error?: string;
  created_at: string;
  processed_at?: string;
}

// Delivery Log
export interface DeliveryLog {
  id: string;
  tenant_id: string;
  message_id?: string;
  channel_type: string;
  provider?: string;
  external_id?: string;
  status: string;
  status_details: Record<string, any>;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  created_at: string;
}

// Bulk Message Request
export interface BulkMessageRequest {
  campaign_name: string;
  description?: string;
  template_id?: string;
  subject?: string;
  content: string;
  target_segments: string[];
  target_filters?: Record<string, any>;
  send_channels: ('line' | 'email' | 'sms')[];
  scheduled_at?: string;
  test_mode?: boolean;
  test_recipients?: string[];
}

// Segment Condition Types
export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface VisitFrequencyCondition {
  operator: '>=' | '<=' | '==' | '!=';
  value: number;
  period: 'day' | 'week' | 'month' | 'year';
}

export interface DateRangeCondition {
  operator: '>=' | '<=' | 'between';
  value: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
  end_value?: number; // For 'between' operator
}

// Campaign Analytics
export interface CampaignAnalytics {
  campaign_id: string;
  // Delivery metrics
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  delivery_rate: number;
  // Engagement metrics
  open_count: number;
  open_rate: number;
  click_count: number;
  click_rate: number;
  // Error metrics
  bounce_count: number;
  bounce_rate: number;
  error_count: number;
  error_rate: number;
  // Channel breakdown
  channel_stats: {
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  }[];
  // Time series data
  hourly_stats?: {
    hour: string;
    sent: number;
    opened: number;
    clicked: number;
  }[];
}

// Template Variable
export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  source: 'customer' | 'reservation' | 'salon' | 'custom';
}

// Default Template Variables
export const DEFAULT_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: 'customer_name', description: '顧客名', example: '田中様', source: 'customer' },
  { name: 'customer_phone', description: '電話番号', example: '090-1234-5678', source: 'customer' },
  { name: 'customer_email', description: 'メールアドレス', example: 'tanaka@example.com', source: 'customer' },
  { name: 'visit_count', description: '来店回数', example: '5', source: 'customer' },
  { name: 'last_visit', description: '最終来店日', example: '2024年3月15日', source: 'customer' },
  { name: 'date', description: '予約日', example: '4月1日(月)', source: 'reservation' },
  { name: 'time', description: '予約時間', example: '14:00', source: 'reservation' },
  { name: 'menu', description: 'メニュー', example: 'カット+カラー', source: 'reservation' },
  { name: 'staff_name', description: '担当スタッフ', example: '山田', source: 'reservation' },
  { name: 'salon_name', description: 'サロン名', example: 'ビューティーサロン', source: 'salon' },
  { name: 'salon_address', description: 'サロン住所', example: '東京都渋谷区...', source: 'salon' },
  { name: 'salon_phone', description: 'サロン電話番号', example: '03-1234-5678', source: 'salon' },
];

// Opt-in/out Request
export interface OptInOutRequest {
  customer_id: string;
  channel_type: 'line' | 'email' | 'sms';
  is_opted_in: boolean;
  reason?: string;
  preferences?: {
    receive_reminders?: boolean;
    receive_campaigns?: boolean;
    receive_announcements?: boolean;
    receive_urgent?: boolean;
    preferred_time_start?: string;
    preferred_time_end?: string;
    preferred_days?: string[];
  };
}

// Bulk Preference Update Request
export interface BulkPreferenceUpdateRequest {
  customer_ids: string[];
  channel_types?: ('line' | 'email' | 'sms')[];
  updates: {
    is_opted_in?: boolean;
    receive_reminders?: boolean;
    receive_campaigns?: boolean;
    receive_announcements?: boolean;
    receive_urgent?: boolean;
    preferred_time_start?: string;
    preferred_time_end?: string;
    preferred_days?: string[];
  };
}

// Message Preview
export interface MessagePreview {
  customer_id: string;
  customer_name: string;
  channel_type: string;
  subject?: string;
  content: string;
  variables_used: Record<string, string>;
}

// Scheduling Options
export interface SchedulingOptions {
  send_immediately?: boolean;
  scheduled_date?: string;
  scheduled_time?: string;
  timezone?: string;
  respect_customer_preferences?: boolean;
  optimal_send_time?: boolean;
  batch_size?: number;
  batch_delay_minutes?: number;
}