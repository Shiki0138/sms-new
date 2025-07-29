import { supabase } from '../lib/supabase';
import { IntegratedApiService } from './integrated-api-service';
import { addDays, subDays, format } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  filters: {
    visit_frequency?: 'new' | 'regular' | 'vip' | 'inactive';
    last_visit_range?: {
      start_days_ago?: number;
      end_days_ago?: number;
    };
    age_range?: {
      min?: number;
      max?: number;
    };
    preferred_services?: string[];
    total_spent_range?: {
      min?: number;
      max?: number;
    };
    channels?: Array<'line' | 'instagram' | 'email'>;
  };
}

export interface BulkMessage {
  id: string;
  tenant_id: string;
  campaign_name: string;
  message_type: 'campaign' | 'announcement' | 'reminder';
  subject?: string; // メール用件名
  content: string;
  target_segments: string[]; // セグメントID配列
  send_channels: Array<'line' | 'instagram' | 'email'>; // 優先順位順
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  
  // 送信結果
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  delivery_stats?: {
    line: number;
    instagram: number;
    email: number;
  };
}

export interface BulkMessageLog {
  id: string;
  bulk_message_id: string;
  customer_id: string;
  channel_used: 'line' | 'instagram' | 'email';
  status: 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
}

export class BulkMessagingService {
  private tenantId: string;
  private apiService: IntegratedApiService;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.apiService = new IntegratedApiService(tenantId);
  }

  /**
   * 定義済みセグメントを取得
   */
  getDefaultSegments(): CustomerSegment[] {
    return [
      {
        id: 'all_customers',
        name: '全顧客',
        description: '全ての顧客にメッセージを送信',
        filters: {},
      },
      {
        id: 'new_customers',
        name: '新規顧客（初回来店から30日以内）',
        description: '最近初回来店された顧客',
        filters: {
          visit_frequency: 'new',
          last_visit_range: { end_days_ago: 0, start_days_ago: 30 },
        },
      },
      {
        id: 'regular_customers',
        name: '常連顧客（月1回以上来店）',
        description: '定期的にご来店いただいている顧客',
        filters: {
          visit_frequency: 'regular',
        },
      },
      {
        id: 'vip_customers',
        name: 'VIP顧客（累計10万円以上）',
        description: '高額利用顧客',
        filters: {
          visit_frequency: 'vip',
          total_spent_range: { min: 100000 },
        },
      },
      {
        id: 'inactive_customers',
        name: '休眠顧客（3ヶ月以上未来店）',
        description: '長期間来店していない顧客',
        filters: {
          visit_frequency: 'inactive',
          last_visit_range: { start_days_ago: 90 },
        },
      },
      {
        id: 'line_users',
        name: 'LINE友だち',
        description: 'LINEで連絡可能な顧客',
        filters: {
          channels: ['line'],
        },
      },
      {
        id: 'instagram_followers',
        name: 'Instagramフォロワー',
        description: 'Instagramで連絡可能な顧客',
        filters: {
          channels: ['instagram'],
        },
      },
      {
        id: 'email_subscribers',
        name: 'メール購読者',
        description: 'メールアドレス登録済み顧客',
        filters: {
          channels: ['email'],
        },
      },
    ];
  }

  /**
   * セグメントに該当する顧客を取得
   */
  async getCustomersBySegment(segmentId: string): Promise<any[]> {
    const segments = this.getDefaultSegments();
    const segment = segments.find(s => s.id === segmentId);
    
    if (!segment) {
      throw new Error('セグメントが見つかりません');
    }

    const query = supabase
      .from('customers')
      .select(`
        *,
        channels:customer_channels(*),
        reservations(id, start_time, price, status)
      `)
      .eq('tenant_id', this.tenantId);

    const { filters } = segment;

    // チャンネル絞り込み
    if (filters.channels) {
      // TODO: JOIN条件を追加して、指定されたチャンネルを持つ顧客のみ取得
    }

    const { data: customers, error } = await query;
    
    if (error) throw new Error(error.message);
    if (!customers) return [];

    // フィルター適用
    return customers.filter(customer => {
      return this.matchesSegmentFilters(customer, filters);
    });
  }

  /**
   * 顧客がセグメントフィルターに該当するかチェック
   */
  private matchesSegmentFilters(customer: any, filters: CustomerSegment['filters']): boolean {
    // 来店頻度フィルター
    if (filters.visit_frequency) {
      const visitCount = customer.visit_count || 0;
      const lastVisitDate = customer.last_visit_date ? new Date(customer.last_visit_date) : null;
      const daysSinceLastVisit = lastVisitDate ? 
        Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)) : 
        999;

      switch (filters.visit_frequency) {
        case 'new':
          if (visitCount > 3 || daysSinceLastVisit > 30) return false;
          break;
        case 'regular':
          if (visitCount < 3 || daysSinceLastVisit > 60) return false;
          break;
        case 'vip':
          if (visitCount < 10) return false;
          break;
        case 'inactive':
          if (daysSinceLastVisit < 90) return false;
          break;
      }
    }

    // 最終来店日範囲フィルター
    if (filters.last_visit_range) {
      const lastVisitDate = customer.last_visit_date ? new Date(customer.last_visit_date) : null;
      if (!lastVisitDate) return false;

      const daysSinceLastVisit = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.last_visit_range.start_days_ago && daysSinceLastVisit < filters.last_visit_range.start_days_ago) {
        return false;
      }
      if (filters.last_visit_range.end_days_ago && daysSinceLastVisit > filters.last_visit_range.end_days_ago) {
        return false;
      }
    }

    // 累計支払い額フィルター
    if (filters.total_spent_range) {
      const totalSpent = customer.reservations?.reduce((sum: number, r: any) => {
        return r.status === 'COMPLETED' ? sum + (r.price || 0) : sum;
      }, 0) || 0;

      if (filters.total_spent_range.min && totalSpent < filters.total_spent_range.min) {
        return false;
      }
      if (filters.total_spent_range.max && totalSpent > filters.total_spent_range.max) {
        return false;
      }
    }

    // チャンネルフィルター
    if (filters.channels) {
      const availableChannels = customer.channels?.map((c: any) => c.channel_type) || [];
      const hasRequiredChannel = filters.channels.some(channel => availableChannels.includes(channel));
      if (!hasRequiredChannel) return false;
    }

    return true;
  }

  /**
   * 一斉送信メッセージを作成
   */
  async createBulkMessage(data: Omit<BulkMessage, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'status'>): Promise<BulkMessage> {
    const messageData = {
      ...data,
      tenant_id: this.tenantId,
      status: 'draft' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: message, error } = await supabase
      .from('bulk_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return message;
  }

  /**
   * 一斉送信を実行
   */
  async sendBulkMessage(messageId: string): Promise<void> {
    // メッセージ情報を取得
    const { data: message, error: messageError } = await supabase
      .from('bulk_messages')
      .select('*')
      .eq('id', messageId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (messageError) throw new Error(messageError.message);
    if (!message) throw new Error('メッセージが見つかりません');

    // ステータスを送信中に更新
    await supabase
      .from('bulk_messages')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', messageId);

    try {
      // 対象顧客を取得
      let allRecipients: any[] = [];
      
      for (const segmentId of message.target_segments) {
        const segmentCustomers = await this.getCustomersBySegment(segmentId);
        allRecipients = [...allRecipients, ...segmentCustomers];
      }

      // 重複除去
      const uniqueRecipients = allRecipients.reduce((acc, customer) => {
        if (!acc.find((c: any) => c.id === customer.id)) {
          acc.push(customer);
        }
        return acc;
      }, []);

      let sentCount = 0;
      let failedCount = 0;
      const deliveryStats = { line: 0, instagram: 0, email: 0 };

      // 各顧客にメッセージを送信
      for (const customer of uniqueRecipients) {
        try {
          const channelUsed = await this.sendToCustomer(customer, message);
          
          if (channelUsed) {
            sentCount++;
            deliveryStats[channelUsed]++;
            
            // 送信ログを記録
            await supabase.from('bulk_message_logs').insert({
              bulk_message_id: messageId,
              customer_id: customer.id,
              channel_used: channelUsed,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          } else {
            failedCount++;
            
            await supabase.from('bulk_message_logs').insert({
              bulk_message_id: messageId,
              customer_id: customer.id,
              channel_used: 'email', // デフォルト
              status: 'failed',
              error_message: '利用可能なチャンネルがありません',
            });
          }
        } catch (error) {
          failedCount++;
          console.error(`Failed to send to customer ${customer.id}:`, error);
          
          await supabase.from('bulk_message_logs').insert({
            bulk_message_id: messageId,
            customer_id: customer.id,
            channel_used: 'email',
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        // レート制限対応（100ms間隔）
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 送信完了状況を更新
      await supabase
        .from('bulk_messages')
        .update({
          status: 'completed',
          total_recipients: uniqueRecipients.length,
          sent_count: sentCount,
          failed_count: failedCount,
          delivery_stats: deliveryStats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

    } catch (error) {
      // エラー状態を記録
      await supabase
        .from('bulk_messages')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);
      
      throw error;
    }
  }

  /**
   * 個別顧客にメッセージを送信（優先順位に従って）
   */
  private async sendToCustomer(customer: any, message: BulkMessage): Promise<'line' | 'instagram' | 'email' | null> {
    const availableChannels = customer.channels || [];
    
    // 優先順位に従ってチャンネルを試行
    for (const channelType of message.send_channels) {
      const channel = availableChannels.find((c: any) => 
        c.channel_type === channelType && c.is_active
      );
      
      if (channel) {
        try {
          // メッセージ内容をパーソナライズ
          const personalizedContent = this.personalizeMessage(message.content, customer);
          
          await this.apiService.sendMessage({
            customer_id: customer.id,
            channel_type: channelType,
            message_type: 'text',
            content: personalizedContent,
            channel_specific_data: {
              channel_id: channel.channel_id,
              subject: message.subject, // メール用
            },
          });
          
          return channelType;
        } catch (error) {
          console.warn(`Failed to send via ${channelType} to customer ${customer.id}:`, error);
          continue;
        }
      }
    }
    
    return null;
  }

  /**
   * メッセージ内容をパーソナライズ
   */
  private personalizeMessage(template: string, customer: any): string {
    return template
      .replace(/{{customer_name}}/g, customer.name || 'お客様')
      .replace(/{{phone}}/g, customer.phone_number || '')
      .replace(/{{last_visit}}/g, customer.last_visit_date ? 
        format(new Date(customer.last_visit_date), 'yyyy年M月d日', { locale: ja }) : 
        '初回'
      )
      .replace(/{{visit_count}}/g, customer.visit_count?.toString() || '0');
  }

  /**
   * 一斉送信履歴を取得
   */
  async getBulkMessageHistory(): Promise<BulkMessage[]> {
    const { data, error } = await supabase
      .from('bulk_messages')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * 一斉送信の詳細レポートを取得
   */
  async getBulkMessageReport(messageId: string): Promise<{
    message: BulkMessage;
    logs: BulkMessageLog[];
    summary: {
      total_recipients: number;
      sent_count: number;
      failed_count: number;
      success_rate: number;
      channel_breakdown: Record<string, number>;
    };
  }> {
    // メッセージ情報を取得
    const { data: message, error: messageError } = await supabase
      .from('bulk_messages')
      .select('*')
      .eq('id', messageId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (messageError) throw new Error(messageError.message);

    // 送信ログを取得
    const { data: logs, error: logsError } = await supabase
      .from('bulk_message_logs')
      .select(`
        *,
        customer:customers(name, phone_number, email)
      `)
      .eq('bulk_message_id', messageId);

    if (logsError) throw new Error(logsError.message);

    // サマリー情報を計算
    const totalRecipients = logs?.length || 0;
    const sentCount = logs?.filter(l => l.status === 'sent').length || 0;
    const failedCount = logs?.filter(l => l.status === 'failed').length || 0;
    const successRate = totalRecipients > 0 ? (sentCount / totalRecipients) * 100 : 0;

    // チャンネル別集計
    const channelBreakdown: Record<string, number> = {};
    logs?.forEach(log => {
      if (log.status === 'sent') {
        channelBreakdown[log.channel_used] = (channelBreakdown[log.channel_used] || 0) + 1;
      }
    });

    return {
      message,
      logs: logs || [],
      summary: {
        total_recipients: totalRecipients,
        sent_count: sentCount,
        failed_count: failedCount,
        success_rate: successRate,
        channel_breakdown: channelBreakdown,
      },
    };
  }

  /**
   * 緊急告知用のテンプレートメッセージ
   */
  getEmergencyTemplates(): Array<{ name: string; subject: string; content: string }> {
    return [
      {
        name: '急な休業告知',
        subject: '【重要】本日の営業について',
        content: `{{customer_name}}様

いつもご利用いただきありがとうございます。

申し訳ございませんが、本日は都合により急遽休業とさせていただきます。

ご予約をいただいていたお客様には、別途お電話にてご連絡差し上げます。

ご迷惑をおかけして誠に申し訳ございません。

美容室スタッフ一同`,
      },
      {
        name: 'キャンペーン告知',
        subject: '【期間限定】特別キャンペーンのお知らせ',
        content: `{{customer_name}}様

いつもありがとうございます✨

期間限定の特別キャンペーンをご案内いたします！

🌟 カット＋カラー 通常￥8,000 → ￥6,500
🌟 トリートメント 全メニュー20%OFF

期間：今月末まで
※要予約、他券との併用不可

ご予約はお電話またはLINEでお気軽にどうぞ😊`,
      },
      {
        name: 'カムバック促進',
        subject: 'お久しぶりです！特別ご優待のご案内',
        content: `{{customer_name}}様

お元気でお過ごしでしょうか？
前回のご来店から{{last_visit}}が経ちました。

いつもご愛顧いただいているお客様限定で、特別ご優待をご用意いたします💕

🎁 次回ご来店時 全メニュー15%OFF
🎁 トリートメント無料サービス

ぜひこの機会にお越しください✨
スタッフ一同、心よりお待ちしております😊`,
      },
    ];
  }
}