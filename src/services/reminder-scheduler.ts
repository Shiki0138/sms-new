import { supabase } from '../lib/supabase';
import { IntegratedApiService } from './integrated-api-service';
import { format, addDays, subDays, isAfter, isBefore } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface ReminderConfig {
  id: string;
  tenant_id: string;
  reminder_type: 'pre_visit' | 'post_visit' | 'comeback';
  days_before?: number; // 来店前のリマインダー用
  days_after?: number;  // 来店後のリマインダー用
  months_threshold?: number; // カムバック用（何ヶ月以上未来店）
  message_template: string;
  is_active: boolean;
  send_channels: Array<'line' | 'instagram' | 'email'>; // 優先順位順
  target_segments?: string[]; // 対象セグメント
  send_time?: string; // 送信時刻（HH:MM）
  created_at: string;
  updated_at: string;
}

export interface ReminderLog {
  id: string;
  tenant_id: string;
  customer_id: string;
  reservation_id?: string;
  reminder_config_id: string;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  channel_used?: 'line' | 'instagram' | 'email';
  error_message?: string;
}

export class ReminderSchedulerService {
  private tenantId: string;
  private apiService: IntegratedApiService;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.apiService = new IntegratedApiService(tenantId);
  }

  /**
   * リマインダー設定を取得
   */
  async getReminderConfigs(): Promise<ReminderConfig[]> {
    const { data, error } = await supabase
      .from('reminder_configs')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('reminder_type');

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * リマインダー設定を作成/更新
   */
  async upsertReminderConfig(config: Omit<ReminderConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<ReminderConfig> {
    const configData = {
      ...config,
      tenant_id: this.tenantId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('reminder_configs')
      .upsert(configData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * デフォルトのリマインダー設定を作成
   */
  async createDefaultReminderConfigs(): Promise<ReminderConfig[]> {
    const defaultConfigs = [
      {
        reminder_type: 'pre_visit' as const,
        days_before: 7,
        message_template: `{{customer_name}}様、来週{{date}}{{time}}からのご予約のお知らせです💄
施術内容：{{menu}}
何かご不明な点がございましたらお気軽にご連絡ください🌟`,
        send_channels: ['line', 'instagram', 'email'] as const,
        send_time: '10:00',
        is_active: true,
      },
      {
        reminder_type: 'pre_visit' as const,
        days_before: 3,
        message_template: `{{customer_name}}様、{{date}}{{time}}からのご予約が近づいてまいりました✨
楽しみにお待ちしております😊
当日は5分前にお越しいただけますと幸いです🕐`,
        send_channels: ['line', 'instagram', 'email'] as const,
        send_time: '18:00',
        is_active: true,
      },
      {
        reminder_type: 'post_visit' as const,
        days_after: 1,
        message_template: `{{customer_name}}様、昨日はご来店いただきありがとうございました💕
仕上がりはいかがでしょうか？
お気に入りいただけましたら、ぜひSNSでシェアしてくださいね📸✨`,
        send_channels: ['line', 'instagram', 'email'] as const,
        send_time: '15:00',
        is_active: true,
      },
      {
        reminder_type: 'comeback' as const,
        months_threshold: 3,
        message_template: `{{customer_name}}様、お元気でお過ごしでしょうか？
前回のご来店から3ヶ月が経ちました💄
そろそろメンテナンスの時期かもしれません✨
{{campaign_info}}
ご予約お待ちしております😊`,
        send_channels: ['line', 'instagram', 'email'] as const,
        send_time: '11:00',
        is_active: false, // デフォルトは無効
      },
    ];

    const results = [];
    for (const config of defaultConfigs) {
      const result = await this.upsertReminderConfig(config);
      results.push(result);
    }

    return results;
  }

  /**
   * 予約に対するリマインダーをスケジュール
   */
  async schedulePreVisitReminders(reservationId: string): Promise<void> {
    // 予約情報を取得
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(id, name, phone_number, email)
      `)
      .eq('id', reservationId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (reservationError) throw new Error(reservationError.message);
    if (!reservation) throw new Error('予約が見つかりません');

    // リマインダー設定を取得
    const configs = await this.getReminderConfigs();
    const preVisitConfigs = configs.filter(c => c.reminder_type === 'pre_visit');

    for (const config of preVisitConfigs) {
      if (!config.days_before) continue;

      const scheduledDate = subDays(new Date(reservation.start_time), config.days_before);
      
      // 送信時刻を設定
      if (config.send_time) {
        const [hours, minutes] = config.send_time.split(':');
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      // 既にスケジュール済みかチェック
      const { data: existing } = await supabase
        .from('reminder_logs')
        .select('id')
        .eq('tenant_id', this.tenantId)
        .eq('reservation_id', reservationId)
        .eq('reminder_config_id', config.id)
        .single();

      if (!existing) {
        // リマインダーをスケジュール
        await supabase.from('reminder_logs').insert({
          tenant_id: this.tenantId,
          customer_id: reservation.customer_id,
          reservation_id: reservationId,
          reminder_config_id: config.id,
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending',
        });
      }
    }
  }

  /**
   * 施術後リマインダーをスケジュール
   */
  async schedulePostVisitReminders(reservationId: string): Promise<void> {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers(id, name, phone_number, email)
      `)
      .eq('id', reservationId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error) throw new Error(error.message);
    if (!reservation) return;

    const configs = await this.getReminderConfigs();
    const postVisitConfigs = configs.filter(c => c.reminder_type === 'post_visit');

    for (const config of postVisitConfigs) {
      if (!config.days_after) continue;

      const scheduledDate = addDays(new Date(reservation.start_time), config.days_after);
      
      if (config.send_time) {
        const [hours, minutes] = config.send_time.split(':');
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      await supabase.from('reminder_logs').insert({
        tenant_id: this.tenantId,
        customer_id: reservation.customer_id,
        reservation_id: reservationId,
        reminder_config_id: config.id,
        scheduled_at: scheduledDate.toISOString(),
        status: 'pending',
      });
    }
  }

  /**
   * 送信待ちのリマインダーを処理
   */
  async processPendingReminders(): Promise<void> {
    const now = new Date();
    
    // 送信時刻になったリマインダーを取得
    const { data: pendingReminders, error } = await supabase
      .from('reminder_logs')
      .select(`
        *,
        customer:customers(*),
        reservation:reservations(*),
        config:reminder_configs(*)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at');

    if (error) {
      console.error('Error fetching pending reminders:', error);
      return;
    }

    for (const reminder of pendingReminders || []) {
      try {
        await this.sendReminder(reminder);
      } catch (error) {
        console.error(`Error sending reminder ${reminder.id}:`, error);
        
        // エラー状態を記録
        await supabase
          .from('reminder_logs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', reminder.id);
      }
    }
  }

  /**
   * 個別のリマインダーを送信
   */
  private async sendReminder(reminder: any): Promise<void> {
    const { customer, reservation, config } = reminder;
    
    // メッセージテンプレートを展開
    const message = this.expandMessageTemplate(config.message_template, {
      customer,
      reservation,
    });

    // 顧客の利用可能なチャンネルを取得
    const { data: channels } = await supabase
      .from('customer_channels')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('is_active', true);

    // 優先順位に従ってチャンネルを選択
    let channelUsed: string | null = null;
    
    for (const channelType of config.send_channels) {
      const availableChannel = channels?.find(c => c.channel_type === channelType);
      
      if (availableChannel) {
        try {
          await this.apiService.sendMessage({
            customer_id: customer.id,
            channel_type: channelType,
            message_type: 'text',
            content: message,
            channel_specific_data: {
              channel_id: availableChannel.channel_id,
            },
          });
          
          channelUsed = channelType;
          break;
        } catch (error) {
          console.warn(`Failed to send via ${channelType}:`, error);
          continue;
        }
      }
    }

    // 送信結果を記録
    await supabase
      .from('reminder_logs')
      .update({
        status: channelUsed ? 'sent' : 'failed',
        sent_at: channelUsed ? new Date().toISOString() : undefined,
        channel_used: channelUsed,
        error_message: channelUsed ? undefined : '利用可能なチャンネルがありません',
      })
      .eq('id', reminder.id);
  }

  /**
   * メッセージテンプレートを展開
   */
  private expandMessageTemplate(template: string, data: { customer: any; reservation?: any }): string {
    const { customer, reservation } = data;
    
    let message = template
      .replace(/{{customer_name}}/g, customer.name || 'お客様')
      .replace(/{{phone}}/g, customer.phone_number || '')
      .replace(/{{email}}/g, customer.email || '');

    if (reservation) {
      const startTime = new Date(reservation.start_time);
      message = message
        .replace(/{{date}}/g, format(startTime, 'M月d日(E)', { locale: ja }))
        .replace(/{{time}}/g, format(startTime, 'HH:mm', { locale: ja }))
        .replace(/{{menu}}/g, reservation.menu_content || '')
        .replace(/{{price}}/g, reservation.price ? `¥${reservation.price.toLocaleString()}` : '');
    }

    // キャンペーン情報があれば追加（実装は省略）
    message = message.replace(/{{campaign_info}}/g, '');

    return message;
  }

  /**
   * カムバック促進リマインダーを生成
   */
  async scheduleComebackReminders(): Promise<void> {
    const configs = await this.getReminderConfigs();
    const comebackConfigs = configs.filter(c => c.reminder_type === 'comeback');

    for (const config of comebackConfigs) {
      if (!config.months_threshold) continue;

      // 指定期間以上来店していない顧客を抽出
      const thresholdDate = subDays(new Date(), config.months_threshold * 30);
      
      const { data: customers } = await supabase
        .from('customers')
        .select(`
          *,
          last_reservation:reservations(start_time)
        `)
        .eq('tenant_id', this.tenantId)
        .or(`last_visit_date.lt.${thresholdDate.toISOString().split('T')[0]},last_visit_date.is.null`);

      for (const customer of customers || []) {
        // 既にカムバックリマインダーを送信済みかチェック（直近30日）
        const recentReminderDate = subDays(new Date(), 30);
        const { data: recentReminder } = await supabase
          .from('reminder_logs')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .eq('customer_id', customer.id)
          .eq('reminder_config_id', config.id)
          .gte('scheduled_at', recentReminderDate.toISOString())
          .single();

        if (!recentReminder) {
          // カムバックリマインダーをスケジュール
          const scheduledDate = new Date();
          if (config.send_time) {
            const [hours, minutes] = config.send_time.split(':');
            scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          }

          await supabase.from('reminder_logs').insert({
            tenant_id: this.tenantId,
            customer_id: customer.id,
            reminder_config_id: config.id,
            scheduled_at: scheduledDate.toISOString(),
            status: 'pending',
          });
        }
      }
    }
  }

  /**
   * リマインダー統計を取得
   */
  async getReminderStats(): Promise<{
    total_scheduled: number;
    total_sent: number;
    success_rate: number;
    by_type: Record<string, { scheduled: number; sent: number; failed: number }>;
    by_channel: Record<string, number>;
  }> {
    const { data: logs } = await supabase
      .from('reminder_logs')
      .select(`
        *,
        config:reminder_configs(reminder_type)
      `)
      .eq('tenant_id', this.tenantId)
      .gte('created_at', subDays(new Date(), 30).toISOString());

    if (!logs) {
      return {
        total_scheduled: 0,
        total_sent: 0,
        success_rate: 0,
        by_type: {},
        by_channel: {},
      };
    }

    const totalScheduled = logs.length;
    const totalSent = logs.filter(l => l.status === 'sent').length;
    const successRate = totalScheduled > 0 ? (totalSent / totalScheduled) * 100 : 0;

    // タイプ別集計
    const byType: Record<string, { scheduled: number; sent: number; failed: number }> = {};
    const byChannel: Record<string, number> = {};

    for (const log of logs) {
      const type = log.config?.reminder_type || 'unknown';
      
      if (!byType[type]) {
        byType[type] = { scheduled: 0, sent: 0, failed: 0 };
      }
      
      byType[type].scheduled++;
      
      if (log.status === 'sent') {
        byType[type].sent++;
        
        if (log.channel_used) {
          byChannel[log.channel_used] = (byChannel[log.channel_used] || 0) + 1;
        }
      } else if (log.status === 'failed') {
        byType[type].failed++;
      }
    }

    return {
      total_scheduled: totalScheduled,
      total_sent: totalSent,
      success_rate: successRate,
      by_type: byType,
      by_channel: byChannel,
    };
  }
}