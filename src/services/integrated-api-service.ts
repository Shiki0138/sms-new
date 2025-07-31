import { LineApiService } from './line-api';
import { InstagramApiService } from './instagram-api';
import { EmailApiService } from './email-api';
import { PlanLimitsService } from './plan-limits';
import { SalonErrorMessages } from './salon-error-messages';
import { ApiIntegration, Message, ChannelType } from '../types/message';
import { supabase } from '../lib/supabase';

/**
 * ライトプラン向け統合APIサービス
 * 全ての外部API連携を統一的に管理し、制限チェックも行う
 */
export class IntegratedApiService {
  private tenantId: string;
  private planLimitsService: PlanLimitsService;
  private lineService?: LineApiService;
  private instagramService?: InstagramApiService;
  private emailService?: EmailApiService;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.planLimitsService = new PlanLimitsService(tenantId);
  }

  /**
   * 初期化 - API連携設定を読み込み
   */
  async initialize(): Promise<void> {
    try {
      const { data: integrations, error } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true);

      if (error) throw error;

      // 各サービスを初期化
      for (const integration of integrations || []) {
        switch (integration.integration_type) {
          case 'line':
            this.lineService = new LineApiService(integration);
            break;
          case 'instagram':
            this.instagramService = new InstagramApiService(integration);
            break;
          case 'email':
            this.emailService = new EmailApiService(integration);
            break;
        }
      }
    } catch (error) {
      console.error('Error initializing integrated API service:', error);
      throw SalonErrorMessages.getSystemErrors('INITIALIZATION_ERROR');
    }
  }

  /**
   * 統合メッセージ送信（制限チェック付き）
   */
  async sendMessage(
    channel: ChannelType,
    recipientId: string,
    content: string,
    options?: {
      subject?: string;
      messageType?: 'text' | 'rich' | 'template';
      template?: string;
      attachments?: any[];
    }
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // API制限チェック
      const apiLimitCheck = await this.planLimitsService.canMakeApiCall();
      if (!apiLimitCheck.allowed) {
        return {
          success: false,
          error: SalonErrorMessages.getApiErrors('API_LIMIT_REACHED'),
        };
      }

      // チャンネル別の送信処理
      switch (channel) {
        case 'line':
          if (!this.lineService) {
            return {
              success: false,
              error: SalonErrorMessages.getMessageErrors('LINE_API_ERROR'),
            };
          }
          await this.lineService.sendTextMessage(recipientId, content);
          await this.planLimitsService.recordApiCall('line');
          break;

        case 'instagram':
          if (!this.instagramService) {
            return {
              success: false,
              error: SalonErrorMessages.getMessageErrors('INSTAGRAM_API_ERROR'),
            };
          }
          await this.instagramService.sendDirectMessage(recipientId, content);
          await this.planLimitsService.recordApiCall('instagram');
          break;

        case 'email':
          // メール送信制限チェック
          const emailLimitCheck = await this.planLimitsService.canSendEmail();
          if (!emailLimitCheck.allowed) {
            return {
              success: false,
              error: SalonErrorMessages.getMessageErrors('EMAIL_LIMIT_REACHED'),
            };
          }

          if (!this.emailService) {
            return {
              success: false,
              error: SalonErrorMessages.getMessageErrors('EMAIL_SMTP_ERROR'),
            };
          }

          await this.emailService.sendEmail(
            recipientId,
            options?.subject || '美容室からのお知らせ',
            content,
            options?.attachments ? { attachments: options.attachments } : undefined
          );
          
          await this.planLimitsService.recordEmailSent('manual');
          break;

        default:
          return {
            success: false,
            error: SalonErrorMessages.getGenericError('UNSUPPORTED_CHANNEL'),
          };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: SalonErrorMessages.getMessageErrors(`${channel.toUpperCase()}_API_ERROR`),
      };
    }
  }

  /**
   * 統合メッセージ受信
   */
  async getMessages(channels: ChannelType[] = ['line', 'instagram', 'email']): Promise<Message[]> {
    const allMessages: Message[] = [];

    try {
      // 並行して各チャンネルからメッセージを取得
      const messagePromises = channels.map(async (channel) => {
        try {
          switch (channel) {
            case 'line':
              // LINE APIはメッセージ取得をサポートしていない
              console.warn('LINE API does not support message retrieval');
              return [];
              break;
            case 'instagram':
              if (this.instagramService) {
                return await this.instagramService.getDirectMessages();
              }
              break;
            case 'email':
              if (this.emailService) {
                return await this.emailService.getReceivedEmails();
              }
              break;
          }
          return [];
        } catch (error) {
          console.error(`Error getting messages from ${channel}:`, error);
          return [];
        }
      });

      const messagesArrays = await Promise.all(messagePromises);
      messagesArrays.forEach(messages => {
        if (messages) {
          allMessages.push(...messages);
        }
      });

      // 時間順でソート（新しい順）
      allMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allMessages;
    } catch (error) {
      console.error('Error getting integrated messages:', error);
      return [];
    }
  }

  /**
   * 予約確認メッセージの送信（全チャンネル）
   */
  async sendReservationConfirmation(reservation: {
    customerName: string;
    customerContacts: {
      line?: string;
      instagram?: string;
      email?: string;
    };
    date: string;
    time: string;
    menu: string;
    price: number;
    salonName: string;
  }): Promise<{ 
    sent: Array<{ channel: ChannelType; success: boolean }>;
    errors: any[];
  }> {
    const results = {
      sent: [] as Array<{ channel: ChannelType; success: boolean }>,
      errors: [] as any[],
    };

    // メール確認テンプレート（メールの場合のみ）
    if (reservation.customerContacts.email && this.emailService) {
      try {
        const emailTemplate = this.emailService.generateReservationConfirmationEmail(reservation);
        const emailResult = await this.sendMessage(
          'email',
          reservation.customerContacts.email,
          emailTemplate.content,
          {
            subject: emailTemplate.subject,
          }
        );
        
        results.sent.push({ channel: 'email', success: emailResult.success });
        if (!emailResult.success) {
          results.errors.push(emailResult.error);
        }
      } catch (error) {
        results.sent.push({ channel: 'email', success: false });
        results.errors.push(error);
      }
    }

    // LINE/Instagram用の簡潔なメッセージ
    const shortMessage = `
【ご予約確認】
${reservation.customerName} 様

ご予約ありがとうございます✨

📅 ${reservation.date} ${reservation.time}
💄 ${reservation.menu}
💰 ¥${reservation.price.toLocaleString()}

ご来店をお待ちしております！
${reservation.salonName}
`;

    // LINE送信
    if (reservation.customerContacts.line && this.lineService) {
      try {
        const lineResult = await this.sendMessage(
          'line',
          reservation.customerContacts.line,
          shortMessage
        );
        
        results.sent.push({ channel: 'line', success: lineResult.success });
        if (!lineResult.success) {
          results.errors.push(lineResult.error);
        }
      } catch (error) {
        results.sent.push({ channel: 'line', success: false });
        results.errors.push(error);
      }
    }

    // Instagram送信
    if (reservation.customerContacts.instagram && this.instagramService) {
      try {
        const instagramResult = await this.sendMessage(
          'instagram',
          reservation.customerContacts.instagram,
          shortMessage
        );
        
        results.sent.push({ channel: 'instagram', success: instagramResult.success });
        if (!instagramResult.success) {
          results.errors.push(instagramResult.error);
        }
      } catch (error) {
        results.sent.push({ channel: 'instagram', success: false });
        results.errors.push(error);
      }
    }

    return results;
  }

  /**
   * リマインダーメッセージの送信
   */
  async sendReminder(reservation: {
    customerName: string;
    customerContacts: {
      line?: string;
      instagram?: string;
      email?: string;
    };
    date: string;
    time: string;
    menu: string;
    salonName: string;
    salonPhone?: string;
  }, daysBeforeVisit: number): Promise<{
    sent: Array<{ channel: ChannelType; success: boolean }>;
    errors: any[];
  }> {
    const results = {
      sent: [] as Array<{ channel: ChannelType; success: boolean }>,
      errors: [] as any[],
    };

    const timeText = daysBeforeVisit === 0 ? '本日' : `${daysBeforeVisit}日後`;

    // メールリマインダー（メールの場合のみ）
    if (reservation.customerContacts.email && this.emailService) {
      try {
        const emailTemplate = this.emailService.generateReminderEmail(reservation, daysBeforeVisit);
        const emailResult = await this.sendMessage(
          'email',
          reservation.customerContacts.email,
          emailTemplate.content,
          {
            subject: emailTemplate.subject,
          }
        );
        
        results.sent.push({ channel: 'email', success: emailResult.success });
        if (!emailResult.success) {
          results.errors.push(emailResult.error);
        }
      } catch (error) {
        results.sent.push({ channel: 'email', success: false });
        results.errors.push(error);
      }
    }

    // LINE/Instagram用のリマインダー
    const shortReminderMessage = `
【${timeText}のご予約リマインダー】
${reservation.customerName} 様

${timeText}のご予約についてご案内いたします💇‍♀️

📅 ${reservation.date} ${reservation.time}
💄 ${reservation.menu}

${daysBeforeVisit === 0 ? 
  'ご来店をお待ちしております✨' : 
  'ご都合が悪い場合はお早めにご連絡ください📞'
}

${reservation.salonName}
`;

    // LINE/Instagram送信
    for (const channel of ['line', 'instagram'] as ChannelType[]) {
      const contactInfo = reservation.customerContacts[channel];
      if (contactInfo) {
        try {
          const result = await this.sendMessage(channel, contactInfo, shortReminderMessage);
          results.sent.push({ channel, success: result.success });
          if (!result.success) {
            results.errors.push(result.error);
          }
        } catch (error) {
          results.sent.push({ channel, success: false });
          results.errors.push(error);
        }
      }
    }

    return results;
  }

  /**
   * 接続状況の確認
   */
  async checkConnections(): Promise<{
    line: boolean;
    instagram: boolean;
    email: boolean;
  }> {
    const status = {
      line: false,
      instagram: false,
      email: false,
    };

    try {
      const promises = [
        // LINE APIは接続テストメソッドを提供していない
        this.lineService ? Promise.resolve().then(() => { status.line = true; }) : Promise.resolve(),
        this.instagramService?.testConnection().then(result => { status.instagram = result; }).catch(() => {}),
        this.emailService?.testConnection().then(result => { 
          status.email = result.smtp && result.imap; 
        }).catch(() => {}),
      ];

      await Promise.all(promises);
    } catch (error) {
      console.error('Error checking connections:', error);
    }

    return status;
  }

  /**
   * 統計情報の取得
   */
  async getStatistics(): Promise<{
    totalMessagesSent: number;
    messagesByChannel: Record<ChannelType, number>;
    apiCallsThisMonth: number;
    emailsSentToday: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [apiCallsData, emailsData] = await Promise.all([
        supabase
          .from('api_usage_logs')
          .select('api_type')
          .eq('tenant_id', this.tenantId)
          .gte('called_at', startOfMonth.toISOString()),
        
        supabase
          .from('email_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', this.tenantId)
          .gte('sent_at', startOfDay.toISOString())
      ]);

      const messagesByChannel: Record<ChannelType, number> = {
        line: 0,
        instagram: 0,
        email: 0,
      };

      apiCallsData.data?.forEach(log => {
        if (log.api_type in messagesByChannel) {
          messagesByChannel[log.api_type as ChannelType]++;
        }
      });

      const totalMessagesSent = Object.values(messagesByChannel).reduce((sum, count) => sum + count, 0);

      return {
        totalMessagesSent,
        messagesByChannel,
        apiCallsThisMonth: apiCallsData.data?.length || 0,
        emailsSentToday: emailsData.count || 0,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalMessagesSent: 0,
        messagesByChannel: { line: 0, instagram: 0, email: 0 },
        apiCallsThisMonth: 0,
        emailsSentToday: 0,
      };
    }
  }
}