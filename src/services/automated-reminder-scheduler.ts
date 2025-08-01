/**
 * 自動リマインダースケジューラーサービス
 * 予約の1週間前、3日前、来店後翌日の自動リマインド機能を実装
 */

import { supabase } from '../lib/supabase';
import { getLineApi } from './line-api';
import { format, addDays, subDays, isWithinInterval, setHours, setMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface ReminderConfig {
  id: string;
  tenant_id: string;
  reminder_type: string;
  label: string;
  description: string;
  is_enabled: boolean;
  timing_value: number;
  timing_unit: 'hours' | 'days' | 'weeks';
  message_template: string;
  send_via_channels: string[];
  delivery_rules: {
    business_hours_only: boolean;
    skip_holidays: boolean;
    preferred_time: string;
    min_advance_hours?: number;
    max_retries?: number;
  };
  customer_filters?: {
    customer_types?: string[];
    min_price?: number;
    max_price?: number;
    service_categories?: string[];
  };
  priority: 'high' | 'medium' | 'low';
}

export interface ScheduledReminder {
  id: string;
  tenant_id: string;
  customer_id: string;
  reservation_id: string;
  reminder_type: string;
  scheduled_at: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  metadata: {
    setting_id: string;
    channels: string[];
    template: string;
    retry_count?: number;
  };
}

export interface ReminderAnalytics {
  total_scheduled: number;
  total_sent: number;
  delivery_rate: number;
  open_rate: number;
  action_rate: number;
  no_show_prevention_rate: number;
  revenue_impact: number;
  by_type: Array<{
    type: string;
    sent: number;
    opened: number;
    actioned: number;
    effectiveness: number;
  }>;
}

export class AutomatedReminderScheduler {
  private tenantId: string;
  private isRunning: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * リマインダープロセッサーを開始
   */
  async startScheduler(intervalMinutes: number = 5): Promise<void> {
    if (this.isRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting automated reminder scheduler for tenant ${this.tenantId}`);

    // 即座に1回実行
    await this.processScheduledReminders();

    // 定期実行を開始
    this.processInterval = setInterval(async () => {
      try {
        await this.processScheduledReminders();
      } catch (error) {
        console.error('Error in reminder scheduler:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * リマインダープロセッサーを停止
   */
  stopScheduler(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.isRunning = false;
    console.log('Automated reminder scheduler stopped');
  }

  /**
   * スケジュールされたリマインダーを処理
   */
  async processScheduledReminders(): Promise<void> {
    const now = new Date();
    
    try {
      // 送信予定時刻が過ぎているリマインダーを取得
      const { data: scheduledReminders, error } = await supabase
        .from('reminder_schedules')
        .select(`
          *,
          customer:customers(*),
          reservation:reservations(*)
        `)
        .eq('tenant_id', this.tenantId)
        .eq('status', 'scheduled')
        .lte('scheduled_at', now.toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch scheduled reminders:', error);
        return;
      }

      if (!scheduledReminders || scheduledReminders.length === 0) {
        return;
      }

      console.log(`Processing ${scheduledReminders.length} scheduled reminders`);

      // 各リマインダーを処理
      for (const scheduledReminder of scheduledReminders) {
        await this.processIndividualReminder(scheduledReminder);
      }

    } catch (error) {
      console.error('Error processing scheduled reminders:', error);
    }
  }

  /**
   * 個別のリマインダーを処理
   */
  private async processIndividualReminder(scheduledReminder: any): Promise<void> {
    try {
      // ステータスを処理中に更新
      await supabase
        .from('reminder_schedules')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduledReminder.id);

      // 重複チェック（既に同じタイプのリマインダーが送信済みかチェック）
      const { data: existingReminder } = await supabase
        .from('sent_reminders')
        .select('id')
        .eq('reservation_id', scheduledReminder.reservation_id)
        .eq('reminder_type', scheduledReminder.reminder_type)
        .eq('delivery_status', 'sent')
        .single();

      if (existingReminder) {
        console.log(`Reminder already sent for reservation ${scheduledReminder.reservation_id}, type ${scheduledReminder.reminder_type}`);
        
        await supabase
          .from('reminder_schedules')
          .update({ status: 'cancelled' })
          .eq('id', scheduledReminder.id);
        
        return;
      }

      // 営業時間チェック
      const deliveryTime = await this.calculateOptimalDeliveryTime(
        scheduledReminder.scheduled_at,
        scheduledReminder.metadata.setting_id
      );

      if (new Date() < deliveryTime) {
        // まだ送信時刻でない場合は、スケジュールを更新
        await supabase
          .from('reminder_schedules')
          .update({ 
            scheduled_at: deliveryTime.toISOString(),
            status: 'scheduled' 
          })
          .eq('id', scheduledReminder.id);
        
        return;
      }

      // リマインダー設定を取得
      const { data: setting } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('id', scheduledReminder.metadata.setting_id)
        .single();

      if (!setting || !setting.is_enabled) {
        console.log(`Reminder setting disabled or not found: ${scheduledReminder.metadata.setting_id}`);
        
        await supabase
          .from('reminder_schedules')
          .update({ status: 'cancelled' })
          .eq('id', scheduledReminder.id);
        
        return;
      }

      // 顧客フィルターチェック
      if (!this.passesCustomerFilters(scheduledReminder.customer, scheduledReminder.reservation, setting)) {
        console.log(`Customer does not match filters for reminder ${scheduledReminder.id}`);
        
        await supabase
          .from('reminder_schedules')
          .update({ status: 'cancelled' })
          .eq('id', scheduledReminder.id);
        
        return;
      }

      // リマインダーを送信
      await this.sendReminder(scheduledReminder, setting);

      // スケジュールステータスを完了に更新
      await supabase
        .from('reminder_schedules')
        .update({ status: 'sent' })
        .eq('id', scheduledReminder.id);

    } catch (error) {
      console.error(`Failed to process reminder ${scheduledReminder.id}:`, error);
      
      // エラーの場合はステータスを失敗に更新
      await supabase
        .from('reminder_schedules')
        .update({ 
          status: 'failed',
          metadata: {
            ...scheduledReminder.metadata,
            error: error.message,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', scheduledReminder.id);
    }
  }

  /**
   * 最適な配信時間を計算
   */
  private async calculateOptimalDeliveryTime(scheduledAt: string, settingId: string): Promise<Date> {
    let deliveryTime = new Date(scheduledAt);
    
    // リマインダー設定を取得
    const { data: setting } = await supabase
      .from('reminder_settings')
      .select('delivery_rules')
      .eq('id', settingId)
      .single();

    if (!setting || !setting.delivery_rules) {
      return deliveryTime;
    }

    const rules = setting.delivery_rules;

    // 営業時間内配信の場合
    if (rules.business_hours_only) {
      const businessHours = await this.getBusinessHours(deliveryTime);
      
      if (businessHours) {
        // 営業開始時間より前の場合は営業開始時間に設定
        const openTime = setHours(setMinutes(deliveryTime, 0), businessHours.open_hour);
        if (deliveryTime < openTime) {
          deliveryTime = openTime;
        }
        
        // 営業終了時間より後の場合は翌営業日に設定
        const closeTime = setHours(setMinutes(deliveryTime, 0), businessHours.close_hour);
        if (deliveryTime > closeTime) {
          deliveryTime = addDays(openTime, 1);
        }
      }

      // 優先時間が設定されている場合
      if (rules.preferred_time) {
        const [hour, minute] = rules.preferred_time.split(':').map(Number);
        deliveryTime = setHours(setMinutes(deliveryTime, minute), hour);
      }
    }

    // 休業日スキップ
    if (rules.skip_holidays) {
      const isHoliday = await this.isHoliday(deliveryTime);
      
      if (isHoliday) {
        // 次の営業日を探す
        let nextDay = addDays(deliveryTime, 1);
        let attempts = 0;
        
        while (await this.isHoliday(nextDay) && attempts < 7) {
          nextDay = addDays(nextDay, 1);
          attempts++;
        }
        
        deliveryTime = nextDay;
        
        // 営業開始時間に設定
        if (rules.preferred_time) {
          const [hour, minute] = rules.preferred_time.split(':').map(Number);
          deliveryTime = setHours(setMinutes(deliveryTime, minute), hour);
        }
      }
    }

    return deliveryTime;
  }

  /**
   * 営業時間を取得
   */
  private async getBusinessHours(date: Date): Promise<{ open_hour: number; close_hour: number } | null> {
    const dayOfWeek = date.getDay();
    
    const { data } = await supabase
      .from('business_hours')
      .select('open_time, close_time')
      .eq('tenant_id', this.tenantId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_open', true)
      .single();

    if (!data) return null;

    return {
      open_hour: parseInt(data.open_time.split(':')[0]),
      close_hour: parseInt(data.close_time.split(':')[0])
    };
  }

  /**
   * 休業日かどうかをチェック
   */
  private async isHoliday(date: Date): Promise<boolean> {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 定期休日をチェック
    const { data: regularHoliday } = await supabase
      .from('holiday_settings')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .eq('holiday_type', 'regular')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single();

    if (regularHoliday) return true;

    // 臨時休日をチェック
    const { data: temporaryHoliday } = await supabase
      .from('holiday_settings')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .eq('holiday_type', 'temporary')
      .eq('date', dateStr)
      .eq('is_active', true)
      .single();

    return !!temporaryHoliday;
  }

  /**
   * 顧客フィルターをチェック
   */
  private passesCustomerFilters(customer: any, reservation: any, setting: ReminderConfig): boolean {
    if (!setting.customer_filters) return true;

    const filters = setting.customer_filters;

    // 最小価格チェック
    if (filters.min_price && reservation.price < filters.min_price) {
      return false;
    }

    // 最大価格チェック
    if (filters.max_price && reservation.price > filters.max_price) {
      return false;
    }

    // 顧客タイプチェック（初回、リピーター、VIPなど）
    if (filters.customer_types && filters.customer_types.length > 0) {
      const customerType = this.getCustomerType(customer);
      if (!filters.customer_types.includes(customerType)) {
        return false;
      }
    }

    // サービスカテゴリチェック
    if (filters.service_categories && filters.service_categories.length > 0) {
      const serviceCategory = this.getServiceCategory(reservation.menu_content);
      if (!filters.service_categories.includes(serviceCategory)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 顧客タイプを判定
   */
  private getCustomerType(customer: any): string {
    if (customer.visit_count === 0) return 'new';
    if (customer.visit_count >= 10) return 'vip';
    return 'regular';
  }

  /**
   * サービスカテゴリを判定
   */
  private getServiceCategory(menuContent: string): string {
    if (menuContent.includes('カット')) return 'cut';
    if (menuContent.includes('カラー')) return 'color';
    if (menuContent.includes('パーマ')) return 'perm';
    if (menuContent.includes('トリートメント')) return 'treatment';
    return 'other';
  }

  /**
   * リマインダーを送信
   */
  private async sendReminder(scheduledReminder: any, setting: ReminderConfig): Promise<void> {
    const customer = scheduledReminder.customer;
    const reservation = scheduledReminder.reservation;
    
    // メッセージテンプレートに値を埋め込み
    const messageContent = this.fillMessageTemplate(setting.message_template, {
      customer_name: customer.name,
      salon_name: 'ビューティーサロン', // TODO: テナント情報から取得
      date: format(new Date(reservation.start_time), 'M月d日(E)', { locale: ja }),
      time: format(new Date(reservation.start_time), 'HH:mm'),
      end_time: format(new Date(reservation.end_time), 'HH:mm'),
      menu: reservation.menu_content,
      duration: `${Math.round((new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()) / (1000 * 60))}分`,
      staff_name: reservation.staff_name || 'スタッフ',
      price: reservation.price ? `¥${reservation.price.toLocaleString()}` : '',
      salon_phone: '03-1234-5678', // TODO: テナント情報から取得
      salon_address: '東京都渋谷区...', // TODO: テナント情報から取得
    });

    // 各チャンネルに送信
    const channels = setting.send_via_channels;
    const sentReminders: any[] = [];

    for (const channelType of channels) {
      try {
        const sentReminder = await this.sendToChannel(
          channelType,
          customer,
          reservation,
          messageContent,
          scheduledReminder.reminder_type
        );
        
        sentReminders.push(sentReminder);

        // 送信履歴を記録
        const { data: reminderRecord } = await supabase
          .from('sent_reminders')
          .insert({
            tenant_id: this.tenantId,
            customer_id: customer.id,
            reservation_id: reservation.id,
            reminder_type: scheduledReminder.reminder_type,
            channel_type: channelType,
            message_content: messageContent,
            scheduled_at: scheduledReminder.scheduled_at,
            sent_at: new Date().toISOString(),
            delivery_status: 'sent',
            delivery_details: sentReminder.delivery_details || {}
          })
          .select()
          .single();

        // 配信ログを記録
        await supabase
          .from('reminder_delivery_logs')
          .insert({
            tenant_id: this.tenantId,
            reminder_id: reminderRecord.id,
            channel_type: channelType,
            attempt_number: 1,
            delivery_status: 'delivered',
            response_data: sentReminder.response_data || {},
            processing_time_ms: sentReminder.processing_time || 0
          });

      } catch (error) {
        console.error(`Failed to send reminder via ${channelType}:`, error);
        
        // エラーログを記録
        await supabase
          .from('sent_reminders')
          .insert({
            tenant_id: this.tenantId,
            customer_id: customer.id,
            reservation_id: reservation.id,
            reminder_type: scheduledReminder.reminder_type,
            channel_type: channelType,
            message_content: messageContent,
            scheduled_at: scheduledReminder.scheduled_at,
            delivery_status: 'failed',
            error_message: error.message
          });
      }
    }

    console.log(`Sent reminder ${scheduledReminder.reminder_type} for reservation ${reservation.id} to ${sentReminders.length} channels`);
  }

  /**
   * 指定チャンネルにメッセージを送信
   */
  private async sendToChannel(
    channelType: string,
    customer: any,
    reservation: any,
    messageContent: string,
    reminderType: string
  ): Promise<any> {
    const startTime = Date.now();

    switch (channelType) {
      case 'line':
        return await this.sendLineMessage(customer, reservation, messageContent, reminderType, startTime);
      
      case 'email':
        return await this.sendEmailMessage(customer, reservation, messageContent, reminderType, startTime);
      
      case 'instagram':
        // TODO: Instagram DM送信実装
        throw new Error('Instagram delivery not implemented yet');
      
      default:
        throw new Error(`Unsupported channel type: ${channelType}`);
    }
  }

  /**
   * LINEメッセージを送信
   */
  private async sendLineMessage(
    customer: any,
    reservation: any,
    messageContent: string,
    reminderType: string,
    startTime: number
  ): Promise<any> {
    if (!customer.line_user_id) {
      throw new Error('Customer does not have LINE user ID');
    }

    const lineApi = getLineApi();
    
    // リマインダータイプに応じてリッチメッセージを作成
    if (reminderType === 'pre_visit_1day' || reminderType === 'pre_visit_3days') {
      // 確認ボタン付きリッチメッセージ
      const template = {
        type: 'buttons',
        text: messageContent,
        actions: [
          {
            type: 'message',
            label: '予定通り伺います',
            text: '予定通り伺います'
          },
          {
            type: 'message',
            label: '変更したい',
            text: '予約を変更したいです'
          },
          {
            type: 'message',
            label: 'キャンセル',
            text: 'キャンセルしたいです'
          }
        ]
      };

      await lineApi.sendRichMessage(customer.line_user_id, {
        altText: messageContent.split('\n')[0],
        template
      });
    } else {
      // 通常のテキストメッセージ
      await lineApi.sendTextMessage(customer.line_user_id, messageContent);
    }

    // メッセージ履歴に保存
    await supabase.from('messages').insert({
      tenant_id: this.tenantId,
      customer_id: customer.id,
      channel_type: 'line',
      direction: 'sent',
      content: messageContent,
      metadata: {
        reminder_type: reminderType,
        reservation_id: reservation.id
      }
    });

    return {
      processing_time: Date.now() - startTime,
      delivery_details: { line_user_id: customer.line_user_id },
      response_data: { success: true }
    };
  }

  /**
   * メールメッセージを送信
   */
  private async sendEmailMessage(
    customer: any,
    reservation: any,
    messageContent: string,
    reminderType: string,
    startTime: number
  ): Promise<any> {
    if (!customer.email) {
      throw new Error('Customer does not have email address');
    }

    // TODO: メール送信サービスの実装
    // SendGrid、AWS SES、または他のメール送信サービスを使用
    console.log('Email sending not implemented yet:', {
      to: customer.email,
      subject: this.getEmailSubject(reminderType),
      content: messageContent
    });

    return {
      processing_time: Date.now() - startTime,
      delivery_details: { email: customer.email },
      response_data: { success: true, mock: true }
    };
  }

  /**
   * メールの件名を生成
   */
  private getEmailSubject(reminderType: string): string {
    const subjects: Record<string, string> = {
      'pre_visit_7days': '【ご予約確認】来週のご予約について',
      'pre_visit_3days': '【重要】3日後のご予約確認',
      'pre_visit_1day': '【明日のご予約】お待ちしております',
      'post_visit_24hours': 'ご来店ありがとうございました',
      'post_visit_1week': '1週間ケアチェック',
      'post_visit_1month': 'メンテナンスのご案内'
    };

    return subjects[reminderType] || 'サロンからのお知らせ';
  }

  /**
   * メッセージテンプレートに値を埋め込み
   */
  private fillMessageTemplate(template: string, values: Record<string, string>): string {
    let result = template;
    
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value || '');
    });

    return result;
  }

  /**
   * リマインダー設定を取得
   */
  async getReminderSettings(): Promise<ReminderConfig[]> {
    const { data, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('reminder_type');

    if (error) throw error;
    return data || [];
  }

  /**
   * リマインダー設定を更新
   */
  async updateReminderSetting(settingId: string, updates: Partial<ReminderConfig>): Promise<void> {
    const { error } = await supabase
      .from('reminder_settings')
      .update(updates)
      .eq('id', settingId)
      .eq('tenant_id', this.tenantId);

    if (error) throw error;
  }

  /**
   * リマインダー分析データを取得
   */
  async getReminderAnalytics(startDate: Date, endDate: Date): Promise<ReminderAnalytics> {
    // 送信済みリマインダーの統計を取得
    const { data: sentReminders } = await supabase
      .from('sent_reminders')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString());

    const totalSent = sentReminders?.length || 0;
    const delivered = sentReminders?.filter(r => r.delivery_status === 'delivered').length || 0;
    const opened = sentReminders?.filter(r => r.opened_at).length || 0;
    const actioned = sentReminders?.filter(r => r.action_taken && r.action_taken !== 'no_action').length || 0;

    // タイプ別統計
    const byTypeStats: Record<string, any> = {};
    sentReminders?.forEach(reminder => {
      if (!byTypeStats[reminder.reminder_type]) {
        byTypeStats[reminder.reminder_type] = {
          type: reminder.reminder_type,
          sent: 0,
          opened: 0,
          actioned: 0,
          effectiveness: 0
        };
      }

      byTypeStats[reminder.reminder_type].sent++;
      if (reminder.opened_at) byTypeStats[reminder.reminder_type].opened++;
      if (reminder.action_taken && reminder.action_taken !== 'no_action') {
        byTypeStats[reminder.reminder_type].actioned++;
      }
    });

    // 効果率を計算
    Object.values(byTypeStats).forEach((stat: any) => {
      stat.effectiveness = stat.sent > 0 ? stat.actioned / stat.sent : 0;
    });

    return {
      total_scheduled: totalSent,
      total_sent: totalSent,
      delivery_rate: totalSent > 0 ? delivered / totalSent : 0,
      open_rate: delivered > 0 ? opened / delivered : 0,
      action_rate: opened > 0 ? actioned / opened : 0,
      no_show_prevention_rate: 0.8, // TODO: 実際の無断キャンセル削減率を計算
      revenue_impact: 0, // TODO: 実際の収益影響を計算
      by_type: Object.values(byTypeStats)
    };
  }

  /**
   * 手動でリマインダーをスケジュール
   */
  async scheduleManualReminder(
    customerId: string,
    reservationId: string,
    reminderType: string,
    scheduledAt: Date,
    customMessage?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('reminder_schedules')
      .insert({
        tenant_id: this.tenantId,
        customer_id: customerId,
        reservation_id: reservationId,
        reminder_type: reminderType,
        scheduled_at: scheduledAt.toISOString(),
        priority: 'high',
        metadata: {
          manual: true,
          custom_message: customMessage
        }
      });

    if (error) throw error;
  }

  /**
   * リマインダーをキャンセル
   */
  async cancelReminder(reservationId: string, reminderType?: string): Promise<void> {
    let query = supabase
      .from('reminder_schedules')
      .update({ status: 'cancelled' })
      .eq('tenant_id', this.tenantId)
      .eq('reservation_id', reservationId)
      .in('status', ['scheduled', 'processing']);

    if (reminderType) {
      query = query.eq('reminder_type', reminderType);
    }

    const { error } = await query;
    if (error) throw error;
  }
}

// シングルトンインスタンス管理
const schedulerInstances: Map<string, AutomatedReminderScheduler> = new Map();

export function getAutomatedReminderScheduler(tenantId: string): AutomatedReminderScheduler {
  if (!schedulerInstances.has(tenantId)) {
    schedulerInstances.set(tenantId, new AutomatedReminderScheduler(tenantId));
  }
  return schedulerInstances.get(tenantId)!;
}