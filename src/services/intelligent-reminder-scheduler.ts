import { supabase } from '../lib/supabase';
import { ReminderService } from './reminder-service';
import { addDays, subDays, format, differenceInDays, getHours, getDay, isWeekend } from 'date-fns';
import { ja } from 'date-fns/locale';

// Enhanced reminder types with intelligent timing
export interface IntelligentReminder {
  id: string;
  tenant_id: string;
  customer_id: string;
  reservation_id?: string;
  reminder_type: SmartReminderType;
  trigger_condition: ReminderTriggerCondition;
  personalization_data: PersonalizationData;
  optimal_send_time: string;
  channel_priority: ChannelPriority[];
  content_template_id: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  effectiveness_score?: number;
  created_at: string;
  scheduled_at: string;
  sent_at?: string;
}

export type SmartReminderType = 
  | 'pre_visit_confirmation'
  | 'service_maintenance_due'
  | 'weather_based_promotion'
  | 'no_show_recovery'
  | 'post_visit_satisfaction'
  | 'upsell_opportunity'
  | 'retention_risk_alert'
  | 'seasonal_service_reminder'
  | 'birthday_special'
  | 'anniversary_celebration'
  | 'referral_request'
  | 'loyalty_milestone';

export interface ReminderTriggerCondition {
  trigger_type: 'time_based' | 'behavior_based' | 'weather_based' | 'milestone_based';
  conditions: {
    days_before_visit?: number;
    days_after_visit?: number;
    service_frequency_threshold?: number;
    weather_condition?: string;
    customer_segment?: string;
    ltv_threshold?: number;
    visit_count_milestone?: number;
    inactivity_days?: number;
  };
}

export interface PersonalizationData {
  customer_name: string;
  preferred_name?: string;
  last_service: string;
  last_visit_date: string;
  favorite_services: string[];
  staff_preferences: string[];
  service_frequency: number;
  total_visits: number;
  total_spent: number;
  seasonal_preferences: Record<string, string[]>;
  communication_style: 'formal' | 'casual' | 'friendly';
}

export interface ChannelPriority {
  channel: 'line' | 'instagram' | 'email' | 'sms';
  priority: number;
  effectiveness_score: number;
  customer_preference: boolean;
}

export interface WeatherBasedPromotion {
  weather_condition: 'rainy' | 'sunny' | 'humid' | 'dry' | 'hot' | 'cold';
  recommended_services: string[];
  promotion_message: string;
  target_segments: string[];
  urgency_level: 'low' | 'medium' | 'high';
  valid_for_hours: number;
}

// Advanced reminder templates with business intelligence
export interface SmartReminderTemplate {
  id: string;
  reminder_type: SmartReminderType;
  name: string;
  business_goal: string;
  target_segments: string[];
  trigger_conditions: ReminderTriggerCondition;
  
  content_variations: {
    formal: string;
    casual: string;
    friendly: string;
  };
  
  personalization_tokens: string[];
  call_to_action: {
    primary: string;
    secondary?: string;
  };
  
  timing_optimization: {
    preferred_days: number[]; // 0-6 (Sunday-Saturday)
    preferred_hours: number[]; // 0-23
    avoid_days?: number[];
    avoid_hours?: number[];
  };
  
  effectiveness_metrics: {
    expected_open_rate: number;
    expected_response_rate: number;
    expected_booking_rate: number;
    historical_performance: number;
  };
  
  follow_up_strategy?: {
    if_no_response: {
      days_wait: number;
      template_id: string;
    };
    if_negative_response: {
      days_wait: number;
      template_id: string;
    };
  };
}

export class IntelligentReminderScheduler {
  private tenantId: string;
  private reminderService: ReminderService;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.reminderService = new ReminderService();
  }

  /**
   * Get intelligent reminder templates with business logic
   */
  getSmartReminderTemplates(): SmartReminderTemplate[] {
    return [
      // Service maintenance reminders
      {
        id: 'color_maintenance_intelligent',
        reminder_type: 'service_maintenance_due',
        name: 'インテリジェント カラーメンテナンス',
        business_goal: 'カラーサービスの継続利用促進とタイミング最適化',
        target_segments: ['color_customers', 'regular_customers'],
        trigger_conditions: {
          trigger_type: 'time_based',
          conditions: {
            days_after_visit: 35, // 5 weeks after color service
            service_frequency_threshold: 3,
          },
        },
        content_variations: {
          formal: `{{customer_name}}様

いつもご利用いただきありがとうございます。

前回のカラーから{{weeks_since_color}}週間が経ちました。
{{customer_name}}様の美しい髪色をキープするため、そろそろメンテナンスの時期です。

【{{customer_name}}様専用のご提案】
・根元リタッチ：{{estimated_price}}円
・全体カラー：{{full_color_price}}円  
・+トリートメント：{{treatment_discount}}円OFF

担当の{{staff_name}}が、{{customer_name}}様の髪質に最適な配合でお作りいたします。

ご予約はこちら：{{booking_url}}
※{{expiry_date}}までの特別価格です`,

          casual: `{{customer_name}}さん♪

前回のカラーから{{weeks_since_color}}週間！
根元が気になってきませんか？

{{customer_name}}さんの髪色、すごく似合ってたので
ぜひキープしましょう✨

🎨 メンテナンス特典
・リタッチ {{estimated_price}}円
・全体カラー {{full_color_price}}円
・トリートメント付きで{{treatment_discount}}円お得！

{{staff_name}}がお待ちしてます😊
予約はこちら→ {{booking_url}}`,

          friendly: `{{customer_name}}様✨

お元気ですか？{{staff_name}}です！

前回の素敵なカラー、{{weeks_since_color}}週間経ちましたね。
いつも美しくいらっしゃる{{customer_name}}様だからこそ、
根元のケアも大切にしていただきたいと思います💕

【特別価格でご案内】
・リタッチメンテナンス：{{estimated_price}}円
・カラー全体：{{full_color_price}}円
・栄養たっぷりトリートメント付き

{{customer_name}}様の美しさをサポートさせてください！

ご予約お待ちしています：{{booking_url}}`,
        },
        personalization_tokens: [
          'customer_name', 'weeks_since_color', 'estimated_price', 
          'full_color_price', 'treatment_discount', 'staff_name', 
          'booking_url', 'expiry_date'
        ],
        call_to_action: {
          primary: 'カラーメンテナンスを予約',
          secondary: '相談だけでも受け付けます',
        },
        timing_optimization: {
          preferred_days: [1, 2, 3, 4], // Tuesday-Friday
          preferred_hours: [10, 11, 14, 15, 19, 20],
          avoid_days: [0, 6], // Sunday, Saturday (busy days)
          avoid_hours: [8, 9, 12, 13, 21, 22, 23], // Early morning, lunch, late night
        },
        effectiveness_metrics: {
          expected_open_rate: 0.75,
          expected_response_rate: 0.45,
          expected_booking_rate: 0.35,
          historical_performance: 0.68,
        },
        follow_up_strategy: {
          if_no_response: {
            days_wait: 7,
            template_id: 'color_maintenance_reminder',
          },
          if_negative_response: {
            days_wait: 21,
            template_id: 'color_maintenance_gentle',
          },
        },
      },

      // Weather-based promotions
      {
        id: 'rainy_day_promotion',
        reminder_type: 'weather_based_promotion',
        name: '雨の日限定プロモーション',
        business_goal: '雨天時の来店促進と縮毛矯正サービス訴求',
        target_segments: ['humidity_sensitive', 'long_hair_customers', 'regular_customers'],
        trigger_conditions: {
          trigger_type: 'weather_based',
          conditions: {
            weather_condition: 'rainy',
          },
        },
        content_variations: {
          formal: `{{customer_name}}様

本日は雨模様ですが、いかがお過ごしでしょうか。

湿気で髪がまとまりにくい季節になりましたね。
{{customer_name}}様のために、雨の日限定の特別プランをご用意いたしました。

【雨の日特典】
・縮毛矯正 20%OFF
・湿気対策トリートメント 30%OFF
・ヘアセット込みサービス

雨に負けない美しいヘアスタイルで、毎日を快適にお過ごしください。

本日限り：{{phone_number}}
オンライン予約：{{booking_url}}`,

          casual: `{{customer_name}}さん☔

今日は雨ですね〜
髪のうねり、大丈夫ですか？

雨の日だからこその特別メニュー用意しました！

🌧️ 雨の日限定
・縮毛矯正 20%OFF！
・湿気ブロックトリートメント 30%OFF！
・セット込みだから帰りも安心

湿気なんて怖くない髪にしちゃいましょう♪

今すぐ予約→ {{booking_url}}
電話でも→ {{phone_number}}`,

          friendly: `{{customer_name}}様🌙

雨の日はちょっと憂鬱...でも大丈夫です！
美容室でリフレッシュしませんか？

実は雨の日こそ、髪のお手入れには最適なんです✨
今日だけの特別価格でご案内させていただきますね。

💫 本日限定特典
・縮毛矯正で朝のスタイリングが楽に（20%OFF）
・湿気対策の集中ケア（30%OFF）
・雨でも崩れないセット付き

{{customer_name}}様の笑顔で、雨の日も明るくなります😊

お気軽にお電話ください：{{phone_number}}`,
        },
        personalization_tokens: ['customer_name', 'phone_number', 'booking_url'],
        call_to_action: {
          primary: '雨の日特典を利用する',
          secondary: '詳細を問い合わせる',
        },
        timing_optimization: {
          preferred_days: [1, 2, 3, 4, 5], // Weekdays
          preferred_hours: [9, 10, 11, 14, 15, 16],
          avoid_hours: [12, 13, 18, 19], // Lunch and busy evening hours
        },
        effectiveness_metrics: {
          expected_open_rate: 0.62,
          expected_response_rate: 0.38,
          expected_booking_rate: 0.28,
          historical_performance: 0.55,
        },
      },

      // No-show recovery
      {
        id: 'no_show_recovery_intelligent',
        reminder_type: 'no_show_recovery',
        name: 'インテリジェント ノーショー回復',
        business_goal: 'ノーショー後の関係修復と次回予約獲得',
        target_segments: ['no_show_customers'],
        trigger_conditions: {
          trigger_type: 'behavior_based',
          conditions: {
            days_after_visit: 1, // Day after no-show
          },
        },
        content_variations: {
          formal: `{{customer_name}}様

昨日はご予約いただいておりましたが、お忙しい中何かご都合が悪くなられたのでしょうか。

ご連絡をお待ちしておりましたが、{{customer_name}}様の安全とご健康が第一です。
何かご事情がおありでしたら、お気遣いなくお聞かせください。

お忙しい{{customer_name}}様のために、次回は以下の配慮をさせていただきます：

・前日確認のお電話
・お時間の変更は前日18時まで可能
・キャンセル料は不要です

{{customer_name}}様とお会いできる日を楽しみにお待ちしております。

ご連絡先：{{phone_number}}
オンライン予約：{{booking_url}}`,

          casual: `{{customer_name}}さん

昨日はどうされましたか？
体調崩されたりしてませんか？💦

もしかして忙しくて連絡できなかったのかな？
全然気にしないでくださいね！

{{customer_name}}さんのペースで大丈夫です✨

次回は：
・前日にリマインド連絡します
・当日変更もOK
・キャンセル料なし

また{{customer_name}}さんにお会いできる日を
楽しみにしてます😊

気軽に連絡してね→ {{phone_number}}`,

          friendly: `{{customer_name}}様

昨日はいかがされましたか？
きっと何かご都合があったのですね。

{{customer_name}}様のお忙しい毎日を理解しておりますので、
全くお気になさらないでください💕

むしろ、私たちからのご連絡が足りなかったかもしれません。
今後は以下のようにサポートさせていただきますね：

🤝 {{customer_name}}様サポート
・予約前日の確認連絡
・お時間変更は当日でもOK  
・無理のないスケジュール調整

{{customer_name}}様の美しさを支えることが私たちの喜びです。
お時間のある時に、またお話しさせてください。

いつでもお電話ください：{{phone_number}}`,
        },
        personalization_tokens: ['customer_name', 'phone_number', 'booking_url'],
        call_to_action: {
          primary: '次回の予約を相談する',
          secondary: 'お電話でお話しする',
        },
        timing_optimization: {
          preferred_days: [1, 2, 3, 4, 5], // Weekdays
          preferred_hours: [10, 11, 14, 15], // Non-intrusive hours
          avoid_hours: [8, 9, 12, 13, 18, 19, 20, 21], // Busy personal times
        },
        effectiveness_metrics: {
          expected_open_rate: 0.45,
          expected_response_rate: 0.25,
          expected_booking_rate: 0.15,
          historical_performance: 0.32,
        },
        follow_up_strategy: {
          if_no_response: {
            days_wait: 14,
            template_id: 'gentle_check_in',
          },
        },
      },

      // Loyalty milestone celebration
      {
        id: 'loyalty_milestone_celebration',
        reminder_type: 'loyalty_milestone',
        name: 'ロイヤルティマイルストーン記念',
        business_goal: '顧客ロイヤルティの強化と感謝の表現',
        target_segments: ['loyal_customers', 'milestone_customers'],
        trigger_conditions: {
          trigger_type: 'milestone_based',
          conditions: {
            visit_count_milestone: 10, // Every 10 visits
          },
        },
        content_variations: {
          formal: `{{customer_name}}様

この度は、{{visit_count}}回目のご来店を迎えられ、誠におめでとうございます。

{{customer_name}}様には、{{first_visit_date}}の初回ご来店から{{years_with_us}}年間に渡り、
継続してご愛顧いただき、心より感謝申し上げます。

{{visit_count}}回目記念の特別な感謝の気持ちを込めて：

🎁 {{visit_count}}回記念特典
・全メニュー {{milestone_discount}}%OFF
・プレミアムトリートメント無料
・記念品贈呈
・次回から使える特別ポイント{{bonus_points}}ポイント

これからも{{customer_name}}様の美しさをサポートさせていただけることを
スタッフ一同、心より光栄に思っております。

記念特典のご利用：{{booking_url}}
有効期限：{{expiry_date}}`,

          casual: `{{customer_name}}さん🎉

なんと！{{visit_count}}回目のご来店
おめでとうございます！！

{{first_visit_date}}から{{years_with_us}}年間も
通っていただいて、本当に嬉しいです✨

{{visit_count}}回記念だから特別にしちゃいます！

🎁 記念スペシャル
・全部{{milestone_discount}}%OFF！
・高級トリートメント無料！
・サプライズプレゼント
・ボーナスポイント{{bonus_points}}pt♪

{{customer_name}}さんがいるから
私たちも頑張れます😊

記念特典使いに来てね→ {{booking_url}}`,

          friendly: `{{customer_name}}様✨

{{visit_count}}回目のご来店記念日です！
おめでとうございます💕

{{first_visit_date}}に初めてお会いしてから{{years_with_us}}年...
{{customer_name}}様の美しさの変遷を拝見させていただき、
私たちも一緒に成長させていただいた気持ちです。

感謝の気持ちを特別な形でお伝えしたくて：

💎 {{customer_name}}様への感謝を込めて
・愛用メニュー{{milestone_discount}}%OFF
・心を込めたプレミアムケア無料
・{{customer_name}}様だけの記念品
・いつものご褒美ポイント大増量

これからも{{customer_name}}様の人生の美しい瞬間に
寄り添わせていただけたら幸せです。

記念のご予約をお待ちしています：{{booking_url}}`,
        },
        personalization_tokens: [
          'customer_name', 'visit_count', 'first_visit_date', 'years_with_us',
          'milestone_discount', 'bonus_points', 'booking_url', 'expiry_date'
        ],
        call_to_action: {
          primary: '記念特典を使って予約',
          secondary: 'お祝メッセージを見る',
        },
        timing_optimization: {
          preferred_days: [1, 2, 3, 4, 5], // Weekdays for special attention
          preferred_hours: [10, 11, 15, 16], // When staff can give personal attention
        },
        effectiveness_metrics: {
          expected_open_rate: 0.88,
          expected_response_rate: 0.72,
          expected_booking_rate: 0.65,
          historical_performance: 0.78,
        },
      },

      // Retention risk alert (for at-risk customers)
      {
        id: 'retention_risk_intelligent',
        reminder_type: 'retention_risk_alert',
        name: 'インテリジェント 顧客維持アラート',
        business_goal: '離脱リスク顧客の早期発見と関係維持',
        target_segments: ['at_risk_customers', 'declining_frequency'],
        trigger_conditions: {
          trigger_type: 'behavior_based',
          conditions: {
            inactivity_days: 75, // 2.5 months without visit
          },
        },
        content_variations: {
          formal: `{{customer_name}}様

ご無沙汰しております。{{staff_name}}です。

前回のご来店から{{months_since_visit}}ヶ月が経ちました。
{{customer_name}}様はお元気でお過ごしでしょうか。

もしかすると、私たちのサービスでご満足いただけない点があったのではないかと
心配しております。

{{customer_name}}様のご意見を是非お聞かせください：
・サービス内容について
・スタッフの対応について  
・ご要望やご提案について

お忙しい中恐縮ですが、{{customer_name}}様のお声をお聞かせいただけましたら
より良いサービスを提供できるよう改善に努めます。

また、お久しぶりのご来店を心待ちにしており、
特別なおもてなしをご用意してお待ちしております。

ご連絡をお待ちしております：{{phone_number}}`,

          casual: `{{customer_name}}さん

お元気ですか？{{staff_name}}です♪

{{months_since_visit}}ヶ月会えてなくて
すごく寂しいです😢

もしかして何か気に入らないことあった？
それとも忙しすぎて時間ない？

{{customer_name}}さんのこと心配してます💦

良かったら教えて：
・何か嫌なことあった？
・他に良いお店見つけた？
・単純に忙しいだけ？

どんな理由でも全然大丈夫！
ただ{{customer_name}}さんが元気かどうか
知りたいだけだから😊

良かったら連絡してね→ {{phone_number}}`,

          friendly: `{{customer_name}}様

お久しぶりです。{{staff_name}}です💕

{{months_since_visit}}ヶ月お会いしていませんが、
お変わりありませんか？

実は{{customer_name}}様のことをよく思い出します。
いつも素敵な笑顔で来てくださって、
お話しするのが楽しみでした。

もしもですが、何かご不満な点があったなら
ぜひ教えてください。
{{customer_name}}様にとって居心地の良い場所でありたいのです。

そして、お時間のある時に
またお顔を見せていただけたら嬉しいです。

{{customer_name}}様のペースで構いませんので、
気が向いた時にでもご連絡ください😊

いつでもお待ちしています：{{phone_number}}`,
        },
        personalization_tokens: [
          'customer_name', 'staff_name', 'months_since_visit', 'phone_number'
        ],
        call_to_action: {
          primary: 'お話を聞かせてください',
          secondary: 'お気軽にご連絡ください',
        },
        timing_optimization: {
          preferred_days: [2, 3, 4], // Mid-week, less intrusive
          preferred_hours: [14, 15, 16], // Afternoon, relaxed time
          avoid_days: [0, 6], // Weekend - personal time
          avoid_hours: [8, 9, 12, 13, 18, 19, 20], // Busy personal times
        },
        effectiveness_metrics: {
          expected_open_rate: 0.35,
          expected_response_rate: 0.18,
          expected_booking_rate: 0.08,
          historical_performance: 0.22,
        },
        follow_up_strategy: {
          if_no_response: {
            days_wait: 30,
            template_id: 'final_check_in',
          },
        },
      },
    ];
  }

  /**
   * Schedule intelligent reminders based on customer behavior and business rules
   */
  async scheduleIntelligentReminders(): Promise<{
    scheduled_count: number;
    reminders_by_type: Record<SmartReminderType, number>;
    optimization_insights: string[];
  }> {
    const templates = this.getSmartReminderTemplates();
    let scheduledCount = 0;
    const remindersByType: Record<SmartReminderType, number> = {} as any;
    const insights: string[] = [];

    // Get customers with their behavioral data
    const { data: customers } = await supabase
      .from('customers')
      .select(`
        *,
        reservations(id, start_time, end_time, price, status, menu_content, created_at),
        customer_channels(channel_type, channel_id, is_active)
      `)
      .eq('tenant_id', this.tenantId);

    if (!customers) return { scheduled_count: 0, reminders_by_type: {} as any, optimization_insights: [] };

    // Process each template
    for (const template of templates) {
      const eligibleCustomers = await this.findEligibleCustomers(customers, template);
      
      for (const customer of eligibleCustomers) {
        try {
          const reminder = await this.createIntelligentReminder(customer, template);
          await this.scheduleReminder(reminder);
          
          scheduledCount++;
          remindersByType[template.reminder_type] = (remindersByType[template.reminder_type] || 0) + 1;
          
        } catch (error) {
          console.error(`Failed to schedule reminder for customer ${customer.id}:`, error);
        }
      }

      // Generate insights
      if (eligibleCustomers.length > 0) {
        insights.push(
          `${template.name}: ${eligibleCustomers.length}名の顧客が対象 ` +
          `(予想効果: 開封率${Math.round(template.effectiveness_metrics.expected_open_rate * 100)}%, ` +
          `予約率${Math.round(template.effectiveness_metrics.expected_booking_rate * 100)}%)`
        );
      }
    }

    return {
      scheduled_count: scheduledCount,
      reminders_by_type: remindersByType,
      optimization_insights: insights,
    };
  }

  /**
   * Get weather-based promotions for immediate execution
   */
  async getWeatherBasedPromotions(weatherCondition: string): Promise<WeatherBasedPromotion[]> {
    const promotions: WeatherBasedPromotion[] = [
      {
        weather_condition: 'rainy',
        recommended_services: ['縮毛矯正', 'ストレートパーマ', '湿気対策トリートメント'],
        promotion_message: '雨の日限定！湿気に負けない美髪メニュー20-30%OFF',
        target_segments: ['humidity_sensitive', 'long_hair_customers'],
        urgency_level: 'high',
        valid_for_hours: 8,
      },
      {
        weather_condition: 'sunny',
        recommended_services: ['UVケアトリートメント', '夏カラー', 'サマーカット'],
        promotion_message: '晴天の日に最適！紫外線対策メニューで夏美髪をゲット☀️',
        target_segments: ['outdoor_customers', 'uv_sensitive'],
        urgency_level: 'medium',
        valid_for_hours: 12,
      },
      {
        weather_condition: 'humid',
        recommended_services: ['縮毛矯正', 'ドライカット', 'アンチフリッツトリートメント'],
        promotion_message: '湿度の高い日こそ！まとまりやすい髪にするチャンス',
        target_segments: ['frizzy_hair_customers', 'humidity_sensitive'],
        urgency_level: 'high',
        valid_for_hours: 6,
      },
      {
        weather_condition: 'dry',
        recommended_services: ['保湿トリートメント', 'ヘッドスパ', 'オイルケア'],
        promotion_message: '乾燥注意報！髪と頭皮に潤いチャージメニュー特価',
        target_segments: ['dry_hair_customers', 'scalp_care_needed'],
        urgency_level: 'medium',
        valid_for_hours: 10,
      },
    ];

    return promotions.filter(p => p.weather_condition === weatherCondition);
  }

  /**
   * Analyze reminder effectiveness and optimize future campaigns
   */
  async analyzeReminderEffectiveness(): Promise<{
    overall_performance: {
      total_sent: number;
      open_rate: number;
      response_rate: number;
      booking_conversion_rate: number;
      revenue_impact: number;
    };
    
    template_performance: Array<{
      template_id: string;
      template_name: string;
      sent_count: number;
      open_rate: number;
      response_rate: number;
      booking_rate: number;
      effectiveness_score: number;
      optimization_suggestions: string[];
    }>;
    
    timing_insights: {
      best_days: Array<{ day: string; success_rate: number }>;
      best_hours: Array<{ hour: string; success_rate: number }>;
      channel_preferences: Record<string, number>;
    };
    
    personalization_impact: {
      personalized_vs_generic: { personalized: number; generic: number };
      most_effective_tokens: string[];
      tone_preferences: Record<string, number>;
    };
  }> {
    // Get reminder performance data
    const { data: sentReminders } = await supabase
      .from('intelligent_reminders')
      .select(`
        *,
        reminder_responses(response_type, response_time, booking_created),
        reservation_attributions(reservation_id, revenue)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('status', 'sent')
      .gte('sent_at', subDays(new Date(), 90).toISOString()); // Last 90 days

    if (!sentReminders) {
      return {
        overall_performance: {
          total_sent: 0,
          open_rate: 0,
          response_rate: 0,
          booking_conversion_rate: 0,
          revenue_impact: 0,
        },
        template_performance: [],
        timing_insights: {
          best_days: [],
          best_hours: [],
          channel_preferences: {},
        },
        personalization_impact: {
          personalized_vs_generic: { personalized: 0, generic: 0 },
          most_effective_tokens: [],
          tone_preferences: {},
        },
      };
    }

    // Calculate overall performance
    const totalSent = sentReminders.length;
    const opened = sentReminders.filter(r => r.opened_at).length;
    const responded = sentReminders.filter(r => r.reminder_responses?.length > 0).length;
    const booked = sentReminders.filter(r => 
      r.reminder_responses?.some((resp: any) => resp.booking_created)
    ).length;
    const totalRevenue = sentReminders.reduce((sum, r) => {
      return sum + (r.reservation_attributions?.reduce((revSum: number, attr: any) => 
        revSum + (attr.revenue || 0), 0) || 0);
    }, 0);

    // Analyze template performance
    const templateStats = this.analyzeTemplatePerformance(sentReminders);
    
    // Analyze timing effectiveness
    const timingInsights = this.analyzeTimingEffectiveness(sentReminders);
    
    // Analyze personalization impact
    const personalizationImpact = this.analyzePersonalizationImpact(sentReminders);

    return {
      overall_performance: {
        total_sent: totalSent,
        open_rate: totalSent > 0 ? opened / totalSent : 0,
        response_rate: totalSent > 0 ? responded / totalSent : 0,
        booking_conversion_rate: totalSent > 0 ? booked / totalSent : 0,
        revenue_impact: totalRevenue,
      },
      template_performance: templateStats,
      timing_insights: timingInsights,
      personalization_impact: personalizationImpact,
    };
  }

  // Private helper methods

  private async findEligibleCustomers(customers: any[], template: SmartReminderTemplate): Promise<any[]> {
    return customers.filter(customer => {
      // Check if customer matches target segments
      if (!this.customerMatchesSegments(customer, template.target_segments)) {
        return false;
      }

      // Check trigger conditions
      return this.customerMeetsTriggerConditions(customer, template.trigger_conditions);
    });
  }

  private customerMatchesSegments(customer: any, targetSegments: string[]): boolean {
    // Implement segment matching logic based on customer data
    // This would check against predefined segment criteria
    
    for (const segment of targetSegments) {
      switch (segment) {
        case 'color_customers':
          if (customer.reservations?.some((r: any) => r.menu_content?.includes('カラー'))) {
            return true;
          }
          break;
        case 'regular_customers':
          if ((customer.visit_count || 0) >= 3) {
            return true;
          }
          break;
        case 'at_risk_customers':
          if (customer.last_visit_date) {
            const daysSince = differenceInDays(new Date(), new Date(customer.last_visit_date));
            if (daysSince > 60 && daysSince < 180) {
              return true;
            }
          }
          break;
        case 'loyal_customers':
          if ((customer.visit_count || 0) >= 10) {
            return true;
          }
          break;
        // Add more segment logic as needed
      }
    }
    
    return targetSegments.length === 0; // If no specific segments, include all
  }

  private customerMeetsTriggerConditions(customer: any, conditions: ReminderTriggerCondition): boolean {
    const { trigger_type, conditions: triggerConditions } = conditions;

    switch (trigger_type) {
      case 'time_based':
        if (triggerConditions.days_after_visit && customer.last_visit_date) {
          const daysSince = differenceInDays(new Date(), new Date(customer.last_visit_date));
          return daysSince >= triggerConditions.days_after_visit;
        }
        if (triggerConditions.days_before_visit) {
          // Check upcoming reservations
          const upcomingReservation = customer.reservations?.find((r: any) => 
            new Date(r.start_time) > new Date()
          );
          if (upcomingReservation) {
            const daysUntil = differenceInDays(new Date(upcomingReservation.start_time), new Date());
            return daysUntil <= triggerConditions.days_before_visit;
          }
        }
        break;

      case 'behavior_based':
        if (triggerConditions.inactivity_days && customer.last_visit_date) {
          const daysSince = differenceInDays(new Date(), new Date(customer.last_visit_date));
          return daysSince >= triggerConditions.inactivity_days;
        }
        break;

      case 'milestone_based':
        if (triggerConditions.visit_count_milestone) {
          return (customer.visit_count || 0) % triggerConditions.visit_count_milestone === 0 &&
                 customer.visit_count >= triggerConditions.visit_count_milestone;
        }
        break;

      case 'weather_based':
        // Weather-based triggers would be handled separately with real-time data
        return true;
    }

    return false;
  }

  private async createIntelligentReminder(customer: any, template: SmartReminderTemplate): Promise<IntelligentReminder> {
    // Determine optimal send time
    const optimalTime = this.calculateOptimalSendTime(customer, template);
    
    // Build personalization data
    const personalizationData = this.buildPersonalizationData(customer);
    
    // Determine channel priority
    const channelPriority = this.determineChannelPriority(customer);

    return {
      id: crypto.randomUUID(),
      tenant_id: this.tenantId,
      customer_id: customer.id,
      reminder_type: template.reminder_type,
      trigger_condition: template.trigger_conditions,
      personalization_data,
      optimal_send_time: optimalTime,
      channel_priority,
      content_template_id: template.id,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      scheduled_at: optimalTime,
    };
  }

  private calculateOptimalSendTime(customer: any, template: SmartReminderTemplate): string {
    const now = new Date();
    const { preferred_days, preferred_hours, avoid_days, avoid_hours } = template.timing_optimization;

    // Find next optimal time slot
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const candidateDate = addDays(now, dayOffset);
      const dayOfWeek = getDay(candidateDate);

      // Skip if day should be avoided
      if (avoid_days?.includes(dayOfWeek)) continue;
      
      // Check if day is preferred
      if (preferred_days.includes(dayOfWeek)) {
        // Find optimal hour
        for (const hour of preferred_hours) {
          if (avoid_hours?.includes(hour)) continue;
          
          const optimalTime = new Date(candidateDate);
          optimalTime.setHours(hour, 0, 0, 0);
          
          // Make sure it's in the future
          if (optimalTime > now) {
            return optimalTime.toISOString();
          }
        }
      }
    }

    // Fallback: next business day at 11 AM
    const fallback = addDays(now, 1);
    fallback.setHours(11, 0, 0, 0);
    return fallback.toISOString();
  }

  private buildPersonalizationData(customer: any): PersonalizationData {
    const lastReservation = customer.reservations
      ?.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];

    const serviceFreq = customer.reservations?.length || 0;
    const totalSpent = customer.reservations?.reduce((sum: number, r: any) => sum + (r.price || 0), 0) || 0;

    // Determine communication style based on customer data
    let communicationStyle: 'formal' | 'casual' | 'friendly' = 'friendly';
    if (totalSpent > 50000) communicationStyle = 'formal';
    else if (customer.visit_count > 5) communicationStyle = 'friendly';
    else communicationStyle = 'casual';

    return {
      customer_name: customer.name,
      preferred_name: customer.preferred_name || customer.name,
      last_service: lastReservation?.menu_content || '',
      last_visit_date: customer.last_visit_date || '',
      favorite_services: this.extractFavoriteServices(customer.reservations || []),
      staff_preferences: [], // Would be populated from staff preference data
      service_frequency: serviceFreq,
      total_visits: customer.visit_count || 0,
      total_spent: totalSpent,
      seasonal_preferences: {}, // Would be analyzed from historical data
      communication_style: communicationStyle,
    };
  }

  private determineChannelPriority(customer: any): ChannelPriority[] {
    const channels = customer.customer_channels || [];
    const priority: ChannelPriority[] = [];

    // Default priorities based on effectiveness
    const defaultPriorities = {
      line: { priority: 1, effectiveness: 0.75 },
      instagram: { priority: 2, effectiveness: 0.55 },
      email: { priority: 3, effectiveness: 0.45 },
      sms: { priority: 4, effectiveness: 0.35 },
    };

    channels.forEach((channel: any) => {
      if (channel.is_active && defaultPriorities[channel.channel_type as keyof typeof defaultPriorities]) {
        const defaults = defaultPriorities[channel.channel_type as keyof typeof defaultPriorities];
        priority.push({
          channel: channel.channel_type,
          priority: defaults.priority,
          effectiveness_score: defaults.effectiveness,
          customer_preference: channel.is_preferred || false,
        });
      }
    });

    return priority.sort((a, b) => a.priority - b.priority);
  }

  private async scheduleReminder(reminder: IntelligentReminder): Promise<void> {
    const { error } = await supabase
      .from('intelligent_reminders')
      .insert(reminder);

    if (error) {
      throw new Error(`Failed to schedule reminder: ${error.message}`);
    }
  }

  private extractFavoriteServices(reservations: any[]): string[] {
    const serviceCount: Record<string, number> = {};
    
    reservations.forEach(reservation => {
      const service = reservation.menu_content || '';
      serviceCount[service] = (serviceCount[service] || 0) + 1;
    });

    return Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([service]) => service);
  }

  private analyzeTemplatePerformance(reminders: any[]) {
    const templateGroups = reminders.reduce((groups, reminder) => {
      const templateId = reminder.content_template_id;
      if (!groups[templateId]) {
        groups[templateId] = [];
      }
      groups[templateId].push(reminder);
      return groups;
    }, {});

    return Object.entries(templateGroups).map(([templateId, templateReminders]: [string, any]) => {
      const sent = templateReminders.length;
      const opened = templateReminders.filter((r: any) => r.opened_at).length;
      const responded = templateReminders.filter((r: any) => r.reminder_responses?.length > 0).length;
      const booked = templateReminders.filter((r: any) => 
        r.reminder_responses?.some((resp: any) => resp.booking_created)
      ).length;

      const openRate = sent > 0 ? opened / sent : 0;
      const responseRate = sent > 0 ? responded / sent : 0;
      const bookingRate = sent > 0 ? booked / sent : 0;
      const effectivenessScore = (openRate * 0.3 + responseRate * 0.3 + bookingRate * 0.4);

      const suggestions: string[] = [];
      if (openRate < 0.4) suggestions.push('件名や送信タイミングの改善を検討');
      if (responseRate < 0.2) suggestions.push('コンテンツの魅力度を向上');
      if (bookingRate < 0.1) suggestions.push('Call to Actionの最適化が必要');

      return {
        template_id: templateId,
        template_name: templateId, // Would be looked up from template data
        sent_count: sent,
        open_rate: openRate,
        response_rate: responseRate,
        booking_rate: bookingRate,
        effectiveness_score: effectivenessScore,
        optimization_suggestions: suggestions,
      };
    });
  }

  private analyzeTimingEffectiveness(reminders: any[]) {
    // Analyze day-of-week performance
    const dayStats: Record<number, { sent: number; success: number }> = {};
    const hourStats: Record<number, { sent: number; success: number }> = {};
    const channelStats: Record<string, number> = {};

    reminders.forEach(reminder => {
      const sentTime = new Date(reminder.sent_at);
      const day = getDay(sentTime);
      const hour = getHours(sentTime);
      
      // Track by day
      if (!dayStats[day]) dayStats[day] = { sent: 0, success: 0 };
      dayStats[day].sent++;
      if (reminder.reminder_responses?.length > 0) dayStats[day].success++;

      // Track by hour
      if (!hourStats[hour]) hourStats[hour] = { sent: 0, success: 0 };
      hourStats[hour].sent++;
      if (reminder.reminder_responses?.length > 0) hourStats[hour].success++;

      // Track channel preferences
      const channel = reminder.channel_priority?.[0]?.channel || 'unknown';
      channelStats[channel] = (channelStats[channel] || 0) + 1;
    });

    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const bestDays = Object.entries(dayStats)
      .map(([day, stats]) => ({
        day: dayNames[parseInt(day)],
        success_rate: stats.sent > 0 ? stats.success / stats.sent : 0,
      }))
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 3);

    const bestHours = Object.entries(hourStats)
      .map(([hour, stats]) => ({
        hour: `${hour}:00-${parseInt(hour) + 1}:00`,
        success_rate: stats.sent > 0 ? stats.success / stats.sent : 0,
      }))
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 3);

    return {
      best_days: bestDays,
      best_hours: bestHours,
      channel_preferences: channelStats,
    };
  }

  private analyzePersonalizationImpact(reminders: any[]) {
    // This would analyze the impact of personalization tokens and tones
    // For now, returning mock data structure

    return {
      personalized_vs_generic: {
        personalized: 0.65, // 65% effectiveness for personalized
        generic: 0.35, // 35% effectiveness for generic
      },
      most_effective_tokens: ['customer_name', 'last_service', 'staff_name'],
      tone_preferences: {
        'formal': 0.45,
        'casual': 0.38,
        'friendly': 0.72,
      },
    };
  }
}