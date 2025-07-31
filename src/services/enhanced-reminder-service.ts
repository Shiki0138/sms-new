import { supabase } from '../lib/supabase';
import { 
  ReminderType, 
  ReminderSetting, 
  SentReminder,
  ChannelType,
  DeliveryStatus 
} from '../types/message';
import { getLineApi } from './line-api';
import { IntegratedApiService } from './integrated-api-service';
import { format, addDays, subDays, differenceInDays, differenceInHours } from 'date-fns';
import { ja } from 'date-fns/locale';

// Enhanced reminder types with business goals
export type EnhancedReminderType = ReminderType | 
  'no_show_prevention' | 
  'pre_visit_preparation' |
  'service_maintenance' |
  'seasonal_care' |
  'loyalty_milestone' |
  'staff_change_notice';

// Smart reminder configuration
export interface SmartReminderConfig {
  type: EnhancedReminderType;
  label: string;
  description: string;
  businessGoal: string;
  expectedImpact: {
    no_show_reduction: number; // Percentage
    rebooking_rate: number; // Percentage
    customer_satisfaction: number; // Score out of 5
  };
  timing: {
    trigger: 'before_appointment' | 'after_appointment' | 'service_based' | 'milestone_based';
    value: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
  conditions?: {
    customer_type?: ('new' | 'regular' | 'vip')[];
    service_types?: string[];
    price_range?: { min?: number; max?: number };
    weather?: ('rainy' | 'sunny' | 'any')[];
    day_of_week?: number[]; // 0-6
  };
  personalization: {
    tone: 'formal' | 'casual' | 'friendly';
    include_elements: Array<
      'weather_tip' | 
      'parking_info' | 
      'preparation_checklist' | 
      'stylist_message' | 
      'service_benefits' |
      'care_instructions' |
      'product_recommendations'
    >;
  };
  follow_up?: {
    if_no_response: {
      hours: number;
      action: 'send_follow_up' | 'call_customer' | 'notify_staff';
    };
  };
}

// Enhanced reminder templates with dynamic content
export const SMART_REMINDER_TEMPLATES: Record<EnhancedReminderType, {
  template: string;
  variants: Array<{
    condition: string;
    template: string;
  }>;
}> = {
  // No-show prevention (critical for business)
  no_show_prevention: {
    template: `{customer_name}様

明日{time}のご予約確認です📅

ご予定はお変わりありませんか？

📍 {salon_name}
⏰ {date} {time}
💇 {menu} ({duration})
👤 担当: {staff_name}

⚠️ キャンセル・変更は本日中にお願いします

万が一お越しいただけない場合は、
お早めにご連絡ください。

ご連絡: {salon_phone}
変更はこちら: {change_url}

明日お会いできるのを楽しみにしています！`,
    variants: [
      {
        condition: 'rainy_weather',
        template: `{customer_name}様

明日{time}のご予約確認です📅

☔ 明日は雨予報です
お気をつけてお越しください。

📍 {salon_name}
⏰ {date} {time}
💇 {menu} ({duration})
👤 担当: {staff_name}

🚗 駐車場完備
☂️ 傘立てあり

キャンセル・変更は本日中に：
{change_url}

雨の日も素敵なヘアスタイルで✨`,
      },
      {
        condition: 'first_visit',
        template: `{customer_name}様

はじめてのご来店、ありがとうございます！
明日{time}にお待ちしております。

📍 場所: {salon_name}
{detailed_directions}

⏰ {date} {time}
💇 {menu} ({duration})
👤 担当: {staff_name}

【初回限定特典】
・ドリンクサービス
・次回使える10%OFFクーポン

ご不明な点はお気軽に：
{salon_phone}

楽しみにお待ちしています😊`,
      },
    ],
  },

  // Pre-visit preparation
  pre_visit_preparation: {
    template: `{customer_name}様

{days_until}後のご予約に向けて
準備のご案内です💁‍♀️

【{menu}の前に】
{preparation_tips}

【当日お持ちいただくもの】
{required_items}

【おすすめ】
{pre_service_recommendations}

ご質問があればお気軽にどうぞ！
より良い仕上がりのために✨`,
    variants: [
      {
        condition: 'color_service',
        template: `{customer_name}様

{days_until}後のカラーリングに向けて📅

【カラー前の準備】
✅ 前日はトリートメントを控えめに
✅ 当日朝はスタイリング剤なしで
✅ アレルギーが心配な方はご相談を

【イメージ写真があれば】
お持ちください！理想の色に近づけます

【所要時間】
約{duration}を予定
雑誌・Wi-Fi完備でゆったり

ご不明な点はお気軽に💕`,
      },
      {
        condition: 'perm_service',
        template: `{customer_name}様

{days_until}後のパーマに向けて📅

【パーマ前のお願い】
✅ 前日は髪をしっかり乾かして就寝
✅ 当日はノースタイリングで
✅ 最近のカラー履歴をお聞かせください

【仕上がりイメージ】
なりたいスタイルの写真があれば◎

パーマ後のケア方法もご案内します！
素敵なカールを楽しみに✨`,
      },
    ],
  },

  // Service maintenance reminders
  service_maintenance: {
    template: `{customer_name}様

前回の{last_service}から{days_since}が経ちました。

そろそろメンテナンスの時期です💡

【おすすめの理由】
{maintenance_reasons}

【今なら】
{current_offers}

【{customer_name}様の髪の状態予測】
{hair_condition_prediction}

ご予約はこちら: {booking_url}
お気軽にご相談ください😊`,
    variants: [
      {
        condition: 'color_roots',
        template: `{customer_name}様

カラーリングから約{weeks_since}週間。
根元が気になる時期かもしれません。

【リタッチのベストタイミング】
・白髪染め: 3-4週間
・ファッションカラー: 4-6週間

【{customer_name}様の場合】
前回: {last_color_date}
おすすめ: {recommended_date}頃

【お得情報】
平日限定リタッチ割引実施中！

ご予約: {booking_url}
キレイをキープしましょう✨`,
      },
      {
        condition: 'treatment_cycle',
        template: `{customer_name}様

サロントリートメントから{months_since}ヶ月。
髪の調子はいかがですか？

【こんなサインありませんか？】
□ パサつきが気になる
□ まとまりにくい
□ ツヤが減った

1つでも当てはまったら
トリートメントタイムです💆‍♀️

【季節のおすすめ】
{seasonal_treatment}

ご予約: {booking_url}`,
      },
    ],
  },

  // Original reminder types (enhanced)
  pre_visit_7days: {
    template: `{customer_name}様

来週のご予約確認です📅
楽しみにお待ちしております！

📍 {salon_name}
📅 {date} ({day_of_week})
⏰ {time}〜
💇 {menu}
👤 {staff_name}

【今週のお天気】
{weather_forecast}

【駐車場のご案内】
{parking_info}

変更はお早めに: {change_url}`,
    variants: [],
  },

  pre_visit_3days: {
    template: `{customer_name}様

{date}のご予約まであと3日✨

【ご予約内容】
⏰ {time}〜{end_time}
💇 {menu}
💰 {estimated_price}
👤 {staff_name}

【当日のお願い】
{service_specific_notes}

楽しみにお待ちしています😊`,
    variants: [],
  },

  pre_visit_1day: {
    template: `{customer_name}様

明日はお待ちしております！

⏰ {time}〜
📍 {salon_name}
{access_info}

【明日の天気】
{weather_info}

【フリードリンク】
コーヒー・紅茶・ハーブティーetc
ごゆっくりどうぞ☕

何かございましたら
{salon_phone}`,
    variants: [],
  },

  post_visit_24hours: {
    template: `{customer_name}様

昨日はありがとうございました💕

仕上がりはいかがですか？
{staff_name}より

【ホームケアのポイント】
{homecare_tips}

【次回のご案内】
{next_service_suggestion}

また{customer_name}様にお会いできるのを
楽しみにしています✨`,
    variants: [],
  },

  post_visit_1week: {
    template: `{customer_name}様

先週の{service}から1週間。
髪の調子はいかがですか？😊

【1週間ケアチェック】
□ スタイリングしやすい
□ 手触りが良い
□ 色持ちが良い

【プロのアドバイス】
{professional_advice}

ご不明な点はLINEでお気軽に！`,
    variants: [],
  },

  post_visit_1month: {
    template: `{customer_name}様

前回から1ヶ月が経ちました。

【{season}のおすすめ】
{seasonal_menu}

【{customer_name}様だけの特典】
{personalized_offer}

ご予約: {booking_url}
いつでもお待ちしています😊`,
    variants: [],
  },

  // New smart reminder types
  seasonal_care: {
    template: `{customer_name}様

{season}の髪のお手入れ、大丈夫ですか？

【{season}の髪の悩み】
{seasonal_problems}

【解決メニュー】
{solution_menu}
期間限定 {special_price}

【お客様の声】
「{customer_review}」

ご予約: {booking_url}`,
    variants: [],
  },

  loyalty_milestone: {
    template: `{customer_name}様

祝🎉 ご来店{visit_count}回目！

いつもありがとうございます。
感謝の気持ちを込めて

【特別特典】
{milestone_reward}

【{customer_name}様の記録】
初回: {first_visit_date}
お気に入りメニュー: {favorite_menu}
素敵な変化: {transformation_note}

これからもよろしくお願いします💕`,
    variants: [],
  },

  staff_change_notice: {
    template: `{customer_name}様

大切なお知らせです。

担当の{previous_staff}が{reason}のため、
次回より{new_staff}が担当させていただきます。

【{new_staff}について】
{staff_introduction}

{previous_staff}からの引き継ぎもばっちりです！
安心してお任せください。

ご不安な点があればお気軽に
{salon_phone}`,
    variants: [],
  },
};

// Smart reminder scheduler with business intelligence
export class EnhancedReminderSchedulerService {
  private tenantId: string;
  private apiService: IntegratedApiService;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.apiService = new IntegratedApiService(tenantId);
  }

  /**
   * Get smart reminder configurations
   */
  getSmartReminderConfigs(): SmartReminderConfig[] {
    return [
      // Critical no-show prevention
      {
        type: 'no_show_prevention',
        label: 'No-Show防止リマインダー',
        description: '24時間前の確認で無断キャンセルを大幅削減',
        businessGoal: '無断キャンセルを80%削減',
        expectedImpact: {
          no_show_reduction: 80,
          rebooking_rate: 65,
          customer_satisfaction: 4.5,
        },
        timing: {
          trigger: 'before_appointment',
          value: 24,
          unit: 'hours',
        },
        conditions: {
          customer_type: ['new', 'regular'],
          price_range: { min: 5000 }, // High-value appointments
        },
        personalization: {
          tone: 'friendly',
          include_elements: ['weather_tip', 'parking_info', 'stylist_message'],
        },
        follow_up: {
          if_no_response: {
            hours: 12,
            action: 'send_follow_up',
          },
        },
      },

      // Preparation reminders
      {
        type: 'pre_visit_preparation',
        label: '施術準備リマインダー',
        description: 'サービス別の事前準備で満足度向上',
        businessGoal: '施術効果を最大化し、満足度を向上',
        expectedImpact: {
          no_show_reduction: 20,
          rebooking_rate: 75,
          customer_satisfaction: 4.8,
        },
        timing: {
          trigger: 'before_appointment',
          value: 3,
          unit: 'days',
        },
        conditions: {
          service_types: ['color', 'perm', 'treatment'],
        },
        personalization: {
          tone: 'casual',
          include_elements: ['preparation_checklist', 'service_benefits'],
        },
      },

      // Service maintenance
      {
        type: 'service_maintenance',
        label: 'メンテナンスリマインダー',
        description: '最適なタイミングでの再来店促進',
        businessGoal: '来店サイクルを最適化し、LTVを向上',
        expectedImpact: {
          no_show_reduction: 0,
          rebooking_rate: 45,
          customer_satisfaction: 4.3,
        },
        timing: {
          trigger: 'service_based',
          value: 0, // Varies by service
          unit: 'weeks',
        },
        personalization: {
          tone: 'friendly',
          include_elements: ['care_instructions', 'product_recommendations'],
        },
      },

      // Seasonal care
      {
        type: 'seasonal_care',
        label: '季節のケアリマインダー',
        description: '季節の変わり目の来店促進',
        businessGoal: '季節需要の創出と来店頻度向上',
        expectedImpact: {
          no_show_reduction: 0,
          rebooking_rate: 35,
          customer_satisfaction: 4.2,
        },
        timing: {
          trigger: 'milestone_based',
          value: 3,
          unit: 'months',
        },
        personalization: {
          tone: 'casual',
          include_elements: ['service_benefits', 'product_recommendations'],
        },
      },
    ];
  }

  /**
   * Calculate optimal reminder timing based on customer behavior
   */
  async calculateOptimalReminderTiming(
    customerId: string,
    reminderType: EnhancedReminderType
  ): Promise<{
    optimal_time: Date;
    reasoning: string;
    expected_response_rate: number;
  }> {
    // Get customer's historical response data
    const { data: responseHistory } = await supabase
      .from('reminder_responses')
      .select('*')
      .eq('customer_id', customerId)
      .order('sent_at', { ascending: false })
      .limit(10);

    // Analyze best response times
    const responseRates: Record<number, number> = {};
    responseHistory?.forEach(response => {
      const hour = new Date(response.sent_at).getHours();
      if (response.responded) {
        responseRates[hour] = (responseRates[hour] || 0) + 1;
      }
    });

    // Find best hour
    const bestHour = Object.entries(responseRates)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 10; // Default to 10 AM

    // Calculate timing based on reminder type
    const appointment = await this.getNextAppointment(customerId);
    if (!appointment) {
      return {
        optimal_time: new Date(),
        reasoning: 'No upcoming appointment',
        expected_response_rate: 0,
      };
    }

    const appointmentDate = new Date(appointment.start_time);
    let optimalTime: Date;
    let reasoning: string;

    switch (reminderType) {
      case 'no_show_prevention':
        optimalTime = subDays(appointmentDate, 1);
        optimalTime.setHours(parseInt(bestHour));
        reasoning = `24 hours before appointment at customer's most responsive hour (${bestHour}:00)`;
        break;

      case 'pre_visit_preparation':
        optimalTime = subDays(appointmentDate, 3);
        optimalTime.setHours(19); // Evening for planning
        reasoning = 'Evening time for preparation planning, 3 days before appointment';
        break;

      default:
        optimalTime = new Date();
        reasoning = 'Default timing';
    }

    return {
      optimal_time: optimalTime,
      reasoning,
      expected_response_rate: responseHistory?.length > 0 ? 0.65 : 0.45,
    };
  }

  /**
   * Generate personalized reminder content
   */
  async generatePersonalizedReminder(
    reminder: {
      customer: any;
      reservation: any;
      reminderType: EnhancedReminderType;
    }
  ): Promise<{
    content: string;
    channel_specific: {
      line?: { template: any; quickReplies?: any[] };
      email?: { subject: string; htmlContent: string };
      instagram?: { content: string; mediaUrl?: string };
    };
  }> {
    // Get template
    const templateConfig = SMART_REMINDER_TEMPLATES[reminder.reminderType];
    let selectedTemplate = templateConfig.template;

    // Check for variant conditions
    if (templateConfig.variants.length > 0) {
      for (const variant of templateConfig.variants) {
        if (await this.checkVariantCondition(variant.condition, reminder)) {
          selectedTemplate = variant.template;
          break;
        }
      }
    }

    // Get dynamic data
    const dynamicData = await this.gatherDynamicData(reminder);
    
    // Fill template
    const content = this.fillTemplate(selectedTemplate, dynamicData);

    // Generate channel-specific content
    const channelSpecific = await this.generateChannelSpecificContent(
      content,
      reminder,
      dynamicData
    );

    return {
      content,
      channel_specific: channelSpecific,
    };
  }

  /**
   * Track reminder effectiveness
   */
  async trackReminderEffectiveness(
    reminderId: string
  ): Promise<{
    delivery_status: DeliveryStatus;
    opened: boolean;
    clicked: boolean;
    action_taken: 'confirmed' | 'rescheduled' | 'cancelled' | 'no_action';
    business_impact: {
      no_show_prevented: boolean;
      rebooking_achieved: boolean;
      revenue_impact: number;
    };
  }> {
    const { data: reminder } = await supabase
      .from('sent_reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    const { data: tracking } = await supabase
      .from('reminder_tracking')
      .select('*')
      .eq('reminder_id', reminderId)
      .single();

    // Check business impact
    const { data: reservation } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reminder?.reservation_id)
      .single();

    const noShowPrevented = reservation?.status === 'COMPLETED' && tracking?.action_taken === 'confirmed';
    const rebookingAchieved = tracking?.rebooking_id !== null;
    const revenueImpact = noShowPrevented ? (reservation?.price || 0) : 0;

    return {
      delivery_status: reminder?.delivery_status || 'pending',
      opened: tracking?.opened_at !== null,
      clicked: tracking?.clicked_at !== null,
      action_taken: tracking?.action_taken || 'no_action',
      business_impact: {
        no_show_prevented: noShowPrevented,
        rebooking_achieved: rebookingAchieved,
        revenue_impact: revenueImpact,
      },
    };
  }

  /**
   * Get reminder analytics and insights
   */
  async getReminderAnalytics(
    period: { start: Date; end: Date }
  ): Promise<{
    overview: {
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
      type: EnhancedReminderType;
      sent: number;
      effectiveness: number;
      roi: number;
    }>;
    optimization_suggestions: string[];
  }> {
    // Fetch reminder data for period
    const { data: reminders } = await supabase
      .from('sent_reminders')
      .select(`
        *,
        tracking:reminder_tracking(*)
      `)
      .gte('sent_at', period.start.toISOString())
      .lte('sent_at', period.end.toISOString());

    // Calculate metrics
    const totalSent = reminders?.length || 0;
    const delivered = reminders?.filter(r => r.delivery_status === 'delivered').length || 0;
    const opened = reminders?.filter(r => r.tracking?.opened_at).length || 0;
    const actioned = reminders?.filter(r => r.tracking?.action_taken !== 'no_action').length || 0;

    // Business impact calculations
    const noShowsPrevented = reminders?.filter(r => 
      r.tracking?.action_taken === 'confirmed' && 
      r.reminder_type === 'no_show_prevention'
    ).length || 0;

    const revenueSaved = await this.calculateRevenueSaved(reminders || []);
    const rebookings = reminders?.filter(r => r.tracking?.rebooking_id).length || 0;

    // By type analysis
    const byTypeAnalysis = await this.analyzeByReminderType(reminders || []);

    // Generate optimization suggestions
    const suggestions = this.generateOptimizationSuggestions(
      { totalSent, delivered, opened, actioned },
      byTypeAnalysis
    );

    return {
      overview: {
        total_sent: totalSent,
        delivery_rate: totalSent > 0 ? delivered / totalSent : 0,
        open_rate: delivered > 0 ? opened / delivered : 0,
        action_rate: opened > 0 ? actioned / opened : 0,
      },
      business_impact: {
        no_shows_prevented: noShowsPrevented,
        revenue_saved: revenueSaved,
        rebookings_generated: rebookings,
        customer_satisfaction_improvement: 0.3, // Estimated
      },
      by_type: byTypeAnalysis,
      optimization_suggestions: suggestions,
    };
  }

  /**
   * Smart reminder automation rules
   */
  async applySmartAutomationRules(
    customer: any,
    reservation: any
  ): Promise<Array<{
    reminderType: EnhancedReminderType;
    scheduledFor: Date;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>> {
    const rules: Array<any> = [];

    // Rule 1: High-value appointment protection
    if (reservation.price > 10000) {
      rules.push({
        reminderType: 'no_show_prevention',
        scheduledFor: subDays(new Date(reservation.start_time), 1),
        priority: 'high',
        reason: 'High-value appointment requires confirmation',
      });
    }

    // Rule 2: New customer guidance
    if (customer.visit_count === 0) {
      rules.push({
        reminderType: 'pre_visit_preparation',
        scheduledFor: subDays(new Date(reservation.start_time), 3),
        priority: 'high',
        reason: 'First-time visitor needs detailed information',
      });
    }

    // Rule 3: Service-specific preparation
    if (['color', 'perm', 'straightening'].includes(reservation.menu_content)) {
      rules.push({
        reminderType: 'pre_visit_preparation',
        scheduledFor: subDays(new Date(reservation.start_time), 2),
        priority: 'medium',
        reason: `${reservation.menu_content} requires special preparation`,
      });
    }

    // Rule 4: Weather-based reminders
    const weather = await this.getWeatherForecast(reservation.start_time);
    if (weather?.condition === 'rainy') {
      rules.push({
        reminderType: 'pre_visit_1day',
        scheduledFor: subDays(new Date(reservation.start_time), 1),
        priority: 'medium',
        reason: 'Rain forecast - include weather tips',
      });
    }

    // Rule 5: Loyalty milestone celebration
    if (customer.visit_count > 0 && customer.visit_count % 10 === 9) {
      rules.push({
        reminderType: 'loyalty_milestone',
        scheduledFor: addDays(new Date(reservation.start_time), 1),
        priority: 'low',
        reason: 'Upcoming milestone visit celebration',
      });
    }

    return rules;
  }

  // Private helper methods

  private async getNextAppointment(customerId: string): Promise<any> {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('customer_id', customerId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1);

    return data?.[0];
  }

  private async checkVariantCondition(
    condition: string,
    reminder: any
  ): Promise<boolean> {
    switch (condition) {
      case 'rainy_weather':
        const weather = await this.getWeatherForecast(reminder.reservation.start_time);
        return weather?.condition === 'rainy';

      case 'first_visit':
        return reminder.customer.visit_count === 0;

      case 'color_service':
        return reminder.reservation.menu_content.includes('カラー');

      case 'perm_service':
        return reminder.reservation.menu_content.includes('パーマ');

      case 'color_roots':
        return reminder.reservation.menu_content.includes('リタッチ');

      case 'treatment_cycle':
        return reminder.reservation.menu_content.includes('トリートメント');

      default:
        return false;
    }
  }

  private async gatherDynamicData(reminder: any): Promise<Record<string, string>> {
    const reservation = reminder.reservation;
    const customer = reminder.customer;
    const appointmentDate = new Date(reservation.start_time);

    // Basic data
    const data: Record<string, string> = {
      customer_name: customer.name,
      salon_name: 'ビューティーサロン', // TODO: Get from tenant
      date: format(appointmentDate, 'M月d日', { locale: ja }),
      day_of_week: format(appointmentDate, 'EEEE', { locale: ja }),
      time: format(appointmentDate, 'HH:mm'),
      end_time: format(addDays(appointmentDate, reservation.duration / 1440), 'HH:mm'),
      menu: reservation.menu_content,
      duration: `${reservation.duration}分`,
      staff_name: reservation.staff_name || 'スタッフ',
      estimated_price: `¥${(reservation.price || 0).toLocaleString()}`,
      salon_phone: '03-1234-5678', // TODO: Get from tenant
      booking_url: 'https://example.com/booking',
      change_url: 'https://example.com/change',
    };

    // Weather data
    const weather = await this.getWeatherForecast(reservation.start_time);
    if (weather) {
      data.weather_info = weather.description;
      data.weather_forecast = weather.weekly;
    }

    // Service-specific data
    if (reservation.menu_content.includes('カラー')) {
      data.preparation_tips = '前日はトリートメントを控えめに、当日はノースタイリングでお越しください';
      data.required_items = 'カラーイメージの写真（あれば）';
      data.pre_service_recommendations = 'カラー後のホームケア商品をご紹介します';
    }

    // Calculate days
    data.days_until = differenceInDays(appointmentDate, new Date()).toString();
    data.days_since = differenceInDays(new Date(), appointmentDate).toString();

    // Seasonal data
    const month = appointmentDate.getMonth() + 1;
    data.season = month >= 3 && month <= 5 ? '春' :
                  month >= 6 && month <= 8 ? '夏' :
                  month >= 9 && month <= 11 ? '秋' : '冬';

    return data;
  }

  private fillTemplate(template: string, data: Record<string, string>): string {
    let filled = template;
    Object.entries(data).forEach(([key, value]) => {
      filled = filled.replace(new RegExp(`{${key}}`, 'g'), value || '');
    });
    return filled;
  }

  private async generateChannelSpecificContent(
    content: string,
    reminder: any,
    dynamicData: Record<string, string>
  ): Promise<any> {
    const lineApi = getLineApi();
    
    return {
      line: {
        template: lineApi.createFlexMessage({
          altText: content.split('\n')[0],
          contents: {
            type: 'bubble',
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: this.getReminderTitle(reminder.reminderType),
                  weight: 'bold',
                  size: 'lg',
                  color: '#1DB446',
                },
              ],
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: content,
                  wrap: true,
                  size: 'sm',
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '予約を確認',
                    uri: dynamicData.booking_url,
                  },
                  style: 'primary',
                  color: '#1DB446',
                },
              ],
            },
          },
        }),
        quickReplies: this.getQuickReplies(reminder.reminderType),
      },
      email: {
        subject: this.getReminderTitle(reminder.reminderType),
        htmlContent: this.generateEmailHtml(content, reminder, dynamicData),
      },
      instagram: {
        content: content.slice(0, 500), // Instagram DM limit
      },
    };
  }

  private getReminderTitle(type: EnhancedReminderType): string {
    const titles: Record<EnhancedReminderType, string> = {
      no_show_prevention: '【重要】明日のご予約確認',
      pre_visit_preparation: 'ご予約に向けての準備のご案内',
      service_maintenance: 'メンテナンスのご案内',
      pre_visit_7days: '来週のご予約のお知らせ',
      pre_visit_3days: '3日後のご予約確認',
      pre_visit_1day: '明日のご予約確認',
      post_visit_24hours: 'ご来店ありがとうございました',
      post_visit_1week: '1週間ケアチェック',
      post_visit_1month: '1ヶ月後のご案内',
      seasonal_care: '季節のヘアケアのご案内',
      loyalty_milestone: '特別なお知らせ',
      staff_change_notice: '担当変更のお知らせ',
    };
    return titles[type] || 'お知らせ';
  }

  private getQuickReplies(type: EnhancedReminderType): any[] {
    if (type === 'no_show_prevention') {
      return [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '予定通り伺います',
            text: '予定通り伺います',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '変更したい',
            text: '予約を変更したいです',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'キャンセル',
            text: 'キャンセルしたいです',
          },
        },
      ];
    }
    return [];
  }

  private generateEmailHtml(
    content: string,
    reminder: any,
    dynamicData: Record<string, string>
  ): string {
    // Generate beautiful HTML email template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #1DB446; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.getReminderTitle(reminder.reminderType)}</h1>
          </div>
          <div class="content">
            ${content.replace(/\n/g, '<br>')}
            <p style="margin-top: 30px; text-align: center;">
              <a href="${dynamicData.booking_url}" class="button">予約を確認</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async getWeatherForecast(date: string): Promise<any> {
    // Mock weather data - in production, use weather API
    return {
      condition: Math.random() > 0.7 ? 'rainy' : 'sunny',
      description: '晴れ時々曇り、最高気温25度',
      weekly: '今週は晴れの日が多く、お出かけ日和です',
    };
  }

  private async calculateRevenueSaved(reminders: any[]): Promise<number> {
    let total = 0;
    
    for (const reminder of reminders) {
      if (reminder.tracking?.action_taken === 'confirmed' && 
          reminder.reminder_type === 'no_show_prevention') {
        // Get reservation value
        const { data: reservation } = await supabase
          .from('reservations')
          .select('price')
          .eq('id', reminder.reservation_id)
          .single();
        
        total += reservation?.price || 0;
      }
    }
    
    return total;
  }

  private async analyzeByReminderType(reminders: any[]): Promise<any[]> {
    const configs = this.getSmartReminderConfigs();
    const analysis: any[] = [];

    for (const config of configs) {
      const typeReminders = reminders.filter(r => r.reminder_type === config.type);
      const sent = typeReminders.length;
      const actioned = typeReminders.filter(r => r.tracking?.action_taken !== 'no_action').length;
      
      // Calculate ROI
      const costPerReminder = 5; // Yen
      const revenue = config.type === 'no_show_prevention' ? 
        await this.calculateRevenueSaved(typeReminders) : 0;
      const roi = sent > 0 ? ((revenue - (sent * costPerReminder)) / (sent * costPerReminder)) * 100 : 0;

      analysis.push({
        type: config.type,
        sent,
        effectiveness: sent > 0 ? actioned / sent : 0,
        roi,
      });
    }

    return analysis;
  }

  private generateOptimizationSuggestions(
    metrics: any,
    byTypeAnalysis: any[]
  ): string[] {
    const suggestions: string[] = [];

    // Open rate optimization
    if (metrics.opened / metrics.delivered < 0.4) {
      suggestions.push('開封率が低いです。件名をより魅力的にし、送信時間を最適化しましょう。');
    }

    // Action rate optimization
    if (metrics.actioned / metrics.opened < 0.3) {
      suggestions.push('アクション率を改善するため、CTAボタンをより明確にしましょう。');
    }

    // Type-specific suggestions
    const bestPerforming = byTypeAnalysis.sort((a, b) => b.effectiveness - a.effectiveness)[0];
    if (bestPerforming) {
      suggestions.push(`${bestPerforming.type}が最も効果的です。このタイプの頻度を増やすことを検討しましょう。`);
    }

    // ROI suggestions
    const highROI = byTypeAnalysis.filter(a => a.roi > 200);
    if (highROI.length > 0) {
      suggestions.push(`ROIが高いリマインダータイプ（${highROI.map(h => h.type).join(', ')}）に注力しましょう。`);
    }

    return suggestions;
  }
}