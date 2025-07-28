// 自動リマインダーサービス
import { supabase } from '../lib/supabase';
import { 
  ReminderType, 
  ReminderSetting, 
  SentReminder,
  ChannelType,
  DeliveryStatus 
} from '../types/message';
import { getLineApi } from './line-api';
import { format, addDays, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';

// リマインダーテンプレート
const REMINDER_TEMPLATES: Record<ReminderType, string> = {
  pre_visit_7days: `{customer_name}様

こんにちは！{salon_name}です。
来週{date} {time}にご予約をいただいております✨

メニュー: {menu}
所要時間: {duration}

楽しみにお待ちしております！
ご不明な点がございましたらお気軽にご連絡ください。`,

  pre_visit_3days: `{customer_name}様

{date} {time}のご予約まであと3日となりました。

【ご予約内容】
メニュー: {menu}
担当: {staff_name}

変更等ございましたらお早めにご連絡ください。
お会いできるのを楽しみにしています😊`,

  pre_visit_1day: `{customer_name}様

明日はお待ちしております！

⏰ {time}〜
📍 {salon_address}
🚗 駐車場あり

お気をつけてお越しください。
何かご不明な点がございましたらご連絡ください。`,

  post_visit_24hours: `{customer_name}様

昨日はご来店いただきありがとうございました💕

仕上がりはいかがでしょうか？
スタイリングで困ったことがあれば、お気軽にメッセージください。

またのご来店を心よりお待ちしております！`,

  post_visit_1week: `{customer_name}様

先週はありがとうございました！

その後、髪の調子はいかがですか？
ホームケアでご不明な点があればいつでもご相談ください✨

【おすすめホームケア】
{aftercare_tips}

次回のご予約もお待ちしております。`,

  post_visit_1month: `{customer_name}様

前回のご来店から1ヶ月が経ちました。

そろそろメンテナンスの時期かもしれません。
{seasonal_recommendation}

ご予約はこちらから↓
{booking_url}

素敵な髪で毎日を過ごせるようサポートさせていただきます✨`,
};

// 季節のおすすめメニュー
const SEASONAL_RECOMMENDATIONS: Record<number, string> = {
  3: '春は紫外線が強くなる季節。UVケアトリートメントがおすすめです🌸',
  4: '新生活に向けて、イメージチェンジはいかがですか？',
  5: '梅雨前の縮毛矯正で、湿気に負けない髪に！',
  6: '夏に向けて、軽やかなスタイルにチェンジ！',
  7: '海やプールの前に、カラーケアトリートメントを',
  8: '紫外線ダメージをケアする集中トリートメント',
  9: '秋カラーで季節感のあるスタイルに🍂',
  10: '乾燥が気になる季節。保湿トリートメントがおすすめ',
  11: '年末に向けて、艶やかな髪で過ごしませんか？',
  12: '新年を美しい髪で迎える準備を✨',
  1: '新年のスタートは、新しいヘアスタイルで！',
  2: '春に向けて、明るめカラーでイメージチェンジ',
};

export class ReminderService {
  // リマインダー送信対象を取得
  async getRemindersToSend(): Promise<Array<{
    reservation: any;
    reminderType: ReminderType;
    customer: any;
    channels: any[];
  }>> {
    const now = new Date();
    const reminders: any[] = [];

    // 1週間前リマインダー
    const weekLater = addDays(now, 7);
    const { data: weekBeforeReservations } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers!customer_id(*)
      `)
      .gte('start_time', weekLater.toISOString().split('T')[0])
      .lt('start_time', addDays(weekLater, 1).toISOString().split('T')[0])
      .eq('status', 'CONFIRMED');

    // 3日前リマインダー
    const threeDaysLater = addDays(now, 3);
    const { data: threeDaysBeforeReservations } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers!customer_id(*)
      `)
      .gte('start_time', threeDaysLater.toISOString().split('T')[0])
      .lt('start_time', addDays(threeDaysLater, 1).toISOString().split('T')[0])
      .eq('status', 'CONFIRMED');

    // 1日前リマインダー
    const tomorrow = addDays(now, 1);
    const { data: dayBeforeReservations } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers!customer_id(*)
      `)
      .gte('start_time', tomorrow.toISOString().split('T')[0])
      .lt('start_time', addDays(tomorrow, 1).toISOString().split('T')[0])
      .eq('status', 'CONFIRMED');

    // 来店後24時間リマインダー
    const yesterday = subDays(now, 1);
    const { data: postVisit24HoursReservations } = await supabase
      .from('reservations')
      .select(`
        *,
        customer:customers!customer_id(*)
      `)
      .gte('end_time', yesterday.toISOString().split('T')[0])
      .lt('end_time', now.toISOString().split('T')[0])
      .eq('status', 'COMPLETED');

    // 各予約に対してリマインダーを作成
    const processReservations = async (
      reservations: any[], 
      reminderType: ReminderType
    ) => {
      for (const reservation of reservations || []) {
        // すでに送信済みかチェック
        const { data: sentReminder } = await supabase
          .from('sent_reminders')
          .select('*')
          .eq('reservation_id', reservation.id)
          .eq('reminder_type', reminderType)
          .single();

        if (!sentReminder) {
          // 顧客のチャンネルを取得
          const { data: channels } = await supabase
            .from('message_channels')
            .select('*')
            .eq('customer_id', reservation.customer_id)
            .eq('is_active', true);

          if (channels && channels.length > 0) {
            reminders.push({
              reservation,
              reminderType,
              customer: reservation.customer,
              channels,
            });
          }
        }
      }
    };

    await Promise.all([
      processReservations(weekBeforeReservations, 'pre_visit_7days'),
      processReservations(threeDaysBeforeReservations, 'pre_visit_3days'),
      processReservations(dayBeforeReservations, 'pre_visit_1day'),
      processReservations(postVisit24HoursReservations, 'post_visit_24hours'),
    ]);

    return reminders;
  }

  // リマインダーを送信
  async sendReminder(
    reminder: {
      reservation: any;
      reminderType: ReminderType;
      customer: any;
      channels: any[];
    },
    settings: ReminderSetting
  ): Promise<SentReminder[]> {
    const sentReminders: SentReminder[] = [];

    // テンプレートに値を埋め込む
    const message = this.fillTemplate(
      settings.message_template || REMINDER_TEMPLATES[reminder.reminderType],
      {
        customer_name: reminder.customer.name,
        salon_name: 'ビューティーサロン', // TODO: 実際のサロン名を取得
        date: format(new Date(reminder.reservation.start_time), 'M月d日(E)', { locale: ja }),
        time: format(new Date(reminder.reservation.start_time), 'HH:mm'),
        menu: reminder.reservation.menu_content,
        duration: `${reminder.reservation.duration || 60}分`,
        staff_name: reminder.reservation.staff_name || 'スタッフ',
        salon_address: '東京都渋谷区...', // TODO: 実際の住所を取得
        aftercare_tips: this.getAftercareTips(reminder.reservation.menu_content),
        seasonal_recommendation: SEASONAL_RECOMMENDATIONS[new Date().getMonth() + 1],
        booking_url: 'https://salon.example.com/booking',
      }
    );

    // 各チャンネルに送信
    for (const channel of reminder.channels) {
      if (settings.send_via_channels.includes(channel.channel_type)) {
        try {
          let deliveryStatus: DeliveryStatus = 'pending';

          // チャンネルタイプに応じて送信
          switch (channel.channel_type) {
            case 'line':
              await this.sendLineReminder(channel, message, reminder);
              deliveryStatus = 'sent';
              break;

            case 'email':
              await this.sendEmailReminder(channel, message, reminder);
              deliveryStatus = 'sent';
              break;

            case 'instagram':
              // TODO: Instagram DM送信
              console.log('Instagram reminder not implemented yet');
              break;
          }

          // 送信履歴を保存
          const sentReminder: SentReminder = {
            id: crypto.randomUUID(),
            tenant_id: reminder.reservation.tenant_id,
            customer_id: reminder.customer.id,
            reservation_id: reminder.reservation.id,
            reminder_type: reminder.reminderType,
            channel_type: channel.channel_type,
            message_content: message,
            sent_at: new Date().toISOString(),
            delivery_status: deliveryStatus,
            created_at: new Date().toISOString(),
          };

          await supabase.from('sent_reminders').insert(sentReminder);
          sentReminders.push(sentReminder);

        } catch (error) {
          console.error(`Failed to send reminder via ${channel.channel_type}:`, error);
        }
      }
    }

    return sentReminders;
  }

  // LINE リマインダー送信
  private async sendLineReminder(
    channel: any,
    message: string,
    reminder: any
  ): Promise<void> {
    const lineApi = getLineApi();

    // リマインダータイプに応じてリッチメッセージを作成
    if (reminder.reminderType === 'pre_visit_1day') {
      // 前日リマインダーはリッチテンプレート
      const template = lineApi.createReservationConfirmTemplate({
        customerName: reminder.customer.name,
        date: format(new Date(reminder.reservation.start_time), 'M月d日', { locale: ja }),
        time: format(new Date(reminder.reservation.start_time), 'HH:mm'),
        menu: reminder.reservation.menu_content,
        duration: `${reminder.reservation.duration || 60}分`,
        price: reminder.reservation.price || 0,
      });

      await lineApi.sendRichMessage(channel.channel_id, {
        altText: message,
        template,
      });
    } else {
      // その他はテキストメッセージ
      await lineApi.sendTextMessage(channel.channel_id, message);
    }

    // メッセージ履歴に保存
    await supabase.from('messages').insert({
      tenant_id: reminder.reservation.tenant_id,
      customer_id: reminder.customer.id,
      channel_id: channel.id,
      message_type: 'sent',
      content: message,
      is_read: true,
      is_ai_reply: false,
      sent_at: new Date().toISOString(),
    });
  }

  // メールリマインダー送信
  private async sendEmailReminder(
    channel: any,
    message: string,
    reminder: any
  ): Promise<void> {
    // TODO: メール送信実装（SendGrid/AWS SES）
    console.log('Email reminder:', { to: channel.channel_id, message });
  }

  // テンプレートに値を埋め込む
  private fillTemplate(template: string, values: Record<string, string>): string {
    let filled = template;
    Object.entries(values).forEach(([key, value]) => {
      filled = filled.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return filled;
  }

  // アフターケアのヒントを取得
  private getAftercareTips(menu: string): string {
    const tips: Record<string, string> = {
      カット: 'スタイリング剤を使って、朝のセットを楽に',
      カラー: 'カラー専用シャンプーで色持ちをキープ',
      パーマ: '濡れた状態でムースをつけて形をキープ',
      トリートメント: '週1-2回のホームトリートメントで艶髪維持',
    };

    return tips[menu] || '毎日のケアで美しい髪をキープしましょう';
  }

  // リマインダー設定を取得
  async getReminderSettings(tenantId: string): Promise<ReminderSetting[]> {
    const { data, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('reminder_type');

    if (error) throw error;

    // デフォルト設定がない場合は作成
    if (!data || data.length === 0) {
      const defaultSettings = await this.createDefaultSettings(tenantId);
      return defaultSettings;
    }

    return data;
  }

  // デフォルトのリマインダー設定を作成
  private async createDefaultSettings(tenantId: string): Promise<ReminderSetting[]> {
    const defaultSettings: Omit<ReminderSetting, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        tenant_id: tenantId,
        reminder_type: 'pre_visit_7days',
        is_enabled: true,
        message_template: REMINDER_TEMPLATES.pre_visit_7days,
        send_via_channels: ['line', 'email'],
      },
      {
        tenant_id: tenantId,
        reminder_type: 'pre_visit_3days',
        is_enabled: true,
        message_template: REMINDER_TEMPLATES.pre_visit_3days,
        send_via_channels: ['line'],
      },
      {
        tenant_id: tenantId,
        reminder_type: 'pre_visit_1day',
        is_enabled: true,
        message_template: REMINDER_TEMPLATES.pre_visit_1day,
        send_via_channels: ['line', 'email'],
      },
      {
        tenant_id: tenantId,
        reminder_type: 'post_visit_24hours',
        is_enabled: true,
        message_template: REMINDER_TEMPLATES.post_visit_24hours,
        send_via_channels: ['line'],
      },
      {
        tenant_id: tenantId,
        reminder_type: 'post_visit_1week',
        is_enabled: false,
        message_template: REMINDER_TEMPLATES.post_visit_1week,
        send_via_channels: ['line'],
      },
      {
        tenant_id: tenantId,
        reminder_type: 'post_visit_1month',
        is_enabled: false,
        message_template: REMINDER_TEMPLATES.post_visit_1month,
        send_via_channels: ['line', 'email'],
      },
    ];

    const { data, error } = await supabase
      .from('reminder_settings')
      .insert(defaultSettings)
      .select();

    if (error) throw error;
    return data || [];
  }
}

// シングルトンインスタンス
let reminderService: ReminderService | null = null;

export function getReminderService(): ReminderService {
  if (!reminderService) {
    reminderService = new ReminderService();
  }
  return reminderService;
}