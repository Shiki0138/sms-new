import { LineApiService } from '../../services/line-api';
import { InstagramApiService } from '../../services/instagram-api';
import { supabase } from '../../lib/supabase';
import { Message, MessageChannel } from '../../types/message';
import { SalonErrorMessages } from '../../services/salon-error-messages';

interface WebhookRequest {
  headers: Record<string, string>;
  body: any;
  query?: Record<string, string>;
}

interface WebhookResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * Webhookリクエストの共通ハンドラー
 */
export class WebhookHandler {
  /**
   * LINE Webhookの処理
   */
  static async handleLineWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      // 署名検証
      const signature = request.headers['x-line-signature'];
      if (!signature) {
        return {
          status: 400,
          body: { error: 'Missing signature' },
        };
      }

      // LINE署名の検証（本番環境では必須）
      // TODO: 実装環境に応じて署名検証を有効化
      
      // イベント処理
      const { events } = request.body;
      if (!events || !Array.isArray(events)) {
        return {
          status: 400,
          body: { error: 'Invalid request body' },
        };
      }

      // 各イベントを処理
      for (const event of events) {
        try {
          await this.processLineEvent(event);
        } catch (error) {
          console.error('Error processing LINE event:', error, event);
          // 個別のイベント処理エラーは継続
        }
      }

      // LINEプラットフォームには常に200を返す
      return {
        status: 200,
        body: { success: true },
      };
    } catch (error) {
      console.error('LINE webhook error:', error);
      return {
        status: 500,
        body: { error: 'Internal server error' },
      };
    }
  }

  /**
   * Instagram Webhookの処理
   */
  static async handleInstagramWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      // Webhook検証（GETリクエスト）
      if (request.query?.['hub.mode'] === 'subscribe') {
        const verifyToken = request.query['hub.verify_token'];
        const challenge = request.query['hub.challenge'];
        
        // TODO: 環境変数から検証トークンを取得
        const expectedToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'salon_verify_token';
        
        if (verifyToken === expectedToken) {
          return {
            status: 200,
            body: challenge,
            headers: { 'Content-Type': 'text/plain' },
          };
        } else {
          return {
            status: 403,
            body: { error: 'Invalid verify token' },
          };
        }
      }

      // Webhookイベント処理（POSTリクエスト）
      const { object, entry } = request.body;
      
      if (object !== 'instagram') {
        return {
          status: 400,
          body: { error: 'Invalid object type' },
        };
      }

      // 各エントリを処理
      if (entry && Array.isArray(entry)) {
        for (const item of entry) {
          try {
            await this.processInstagramEntry(item);
          } catch (error) {
            console.error('Error processing Instagram entry:', error, item);
          }
        }
      }

      return {
        status: 200,
        body: { success: true },
      };
    } catch (error) {
      console.error('Instagram webhook error:', error);
      return {
        status: 500,
        body: { error: 'Internal server error' },
      };
    }
  }

  /**
   * LINEイベントの処理
   */
  private static async processLineEvent(event: any): Promise<void> {
    // メッセージイベントのみ処理
    if (event.type !== 'message') {
      return;
    }

    const { source, message, replyToken, timestamp } = event;
    
    // テキストメッセージ以外は現在サポートしない
    if (message.type !== 'text') {
      console.log('Unsupported message type:', message.type);
      return;
    }

    try {
      // 送信者のチャンネル情報を取得
      const { data: channel, error: channelError } = await supabase
        .from('message_channels')
        .select('*')
        .eq('channel_type', 'line')
        .eq('channel_id', source.userId)
        .single();

      if (channelError || !channel) {
        // 新規ユーザーの場合はチャンネルを作成
        await this.createNewLineChannel(source.userId);
        return;
      }

      // メッセージを保存
      const newMessage: Partial<Message> = {
        tenant_id: channel.tenant_id,
        customer_id: channel.customer_id,
        channel_id: channel.id,
        message_type: 'received',
        content: message.text,
        is_read: false,
        is_ai_reply: false,
        external_message_id: message.id,
        sent_at: new Date(timestamp).toISOString(),
      };

      const { error: messageError } = await supabase
        .from('messages')
        .insert(newMessage);

      if (messageError) {
        console.error('Error saving LINE message:', messageError);
        return;
      }

      // 自動応答が有効な場合は返信
      if (channel.auto_reply_enabled && replyToken) {
        await this.sendAutoReply(channel, replyToken, message.text);
      }

    } catch (error) {
      console.error('Error processing LINE message:', error);
    }
  }

  /**
   * Instagramエントリの処理
   */
  private static async processInstagramEntry(entry: any): Promise<void> {
    const { messaging } = entry;
    
    if (!messaging || !Array.isArray(messaging)) {
      return;
    }

    for (const messagingEvent of messaging) {
      if (messagingEvent.message) {
        await this.processInstagramMessage(messagingEvent);
      }
    }
  }

  /**
   * Instagramメッセージの処理
   */
  private static async processInstagramMessage(messagingEvent: any): Promise<void> {
    const { sender, message, timestamp } = messagingEvent;
    
    try {
      // 送信者のチャンネル情報を取得
      const { data: channel, error: channelError } = await supabase
        .from('message_channels')
        .select('*')
        .eq('channel_type', 'instagram')
        .eq('channel_id', sender.id)
        .single();

      if (channelError || !channel) {
        // 新規ユーザーの場合はチャンネルを作成
        await this.createNewInstagramChannel(sender.id);
        return;
      }

      // メッセージを保存
      const newMessage: Partial<Message> = {
        tenant_id: channel.tenant_id,
        customer_id: channel.customer_id,
        channel_id: channel.id,
        message_type: 'received',
        content: message.text || '[メディアメッセージ]',
        is_read: false,
        is_ai_reply: false,
        external_message_id: message.mid,
        sent_at: new Date(timestamp).toISOString(),
      };

      // メディアがある場合は追加
      if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0];
        newMessage.media_url = attachment.payload?.url;
        newMessage.media_type = attachment.type;
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert(newMessage);

      if (messageError) {
        console.error('Error saving Instagram message:', messageError);
      }

    } catch (error) {
      console.error('Error processing Instagram message:', error);
    }
  }

  /**
   * 新規LINEチャンネルの作成
   */
  private static async createNewLineChannel(lineUserId: string): Promise<void> {
    try {
      // LINE APIからプロフィール情報を取得
      const { data: integration } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('integration_type', 'line')
        .eq('is_active', true)
        .single();

      if (!integration) {
        console.error('LINE integration not found');
        return;
      }

      const lineApi = new LineApiService({
        channelAccessToken: integration.api_credentials.channel_access_token,
        channelSecret: integration.api_credentials.channel_secret,
      });

      const profile = await lineApi.getUserProfile(lineUserId);

      // 仮の顧客とチャンネルを作成
      // TODO: 実際の実装では管理画面から顧客と紐付ける機能が必要
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          tenant_id: integration.tenant_id,
          name: profile.displayName,
          line_id: lineUserId,
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return;
      }

      const { error: channelError } = await supabase
        .from('message_channels')
        .insert({
          tenant_id: integration.tenant_id,
          customer_id: customer.id,
          channel_type: 'line',
          channel_id: lineUserId,
          channel_name: profile.displayName,
          is_active: true,
        });

      if (channelError) {
        console.error('Error creating LINE channel:', channelError);
      }

    } catch (error) {
      console.error('Error creating new LINE channel:', error);
    }
  }

  /**
   * 新規Instagramチャンネルの作成
   */
  private static async createNewInstagramChannel(instagramUserId: string): Promise<void> {
    try {
      const { data: integration } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('integration_type', 'instagram')
        .eq('is_active', true)
        .single();

      if (!integration) {
        console.error('Instagram integration not found');
        return;
      }

      // 仮の顧客とチャンネルを作成
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          tenant_id: integration.tenant_id,
          name: `Instagram User ${instagramUserId.substring(0, 6)}`,
          instagram_id: instagramUserId,
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return;
      }

      const { error: channelError } = await supabase
        .from('message_channels')
        .insert({
          tenant_id: integration.tenant_id,
          customer_id: customer.id,
          channel_type: 'instagram',
          channel_id: instagramUserId,
          channel_name: `Instagram User`,
          is_active: true,
        });

      if (channelError) {
        console.error('Error creating Instagram channel:', channelError);
      }

    } catch (error) {
      console.error('Error creating new Instagram channel:', error);
    }
  }

  /**
   * 自動返信の送信
   */
  private static async sendAutoReply(
    channel: MessageChannel,
    replyToken: string,
    originalMessage: string
  ): Promise<void> {
    try {
      // AI自動返信が有効な場合
      if (channel.ai_reply_enabled) {
        // TODO: Gemini AIサービスと連携して返信を生成
        const replyText = 'お問い合わせありがとうございます。担当者より後ほどご連絡いたします。';
        
        // LINE API経由で返信
        const { data: integration } = await supabase
          .from('api_integrations')
          .select('*')
          .eq('integration_type', 'line')
          .eq('tenant_id', channel.tenant_id)
          .eq('is_active', true)
          .single();

        if (integration) {
          const lineApi = new LineApiService({
            channelAccessToken: integration.api_credentials.channel_access_token,
            channelSecret: integration.api_credentials.channel_secret,
          });

          await lineApi.replyMessage(replyToken, [
            {
              type: 'text',
              text: replyText,
            },
          ]);

          // 送信済みメッセージを保存
          await supabase
            .from('messages')
            .insert({
              tenant_id: channel.tenant_id,
              customer_id: channel.customer_id,
              channel_id: channel.id,
              message_type: 'sent',
              content: replyText,
              is_read: true,
              is_ai_reply: true,
              sent_at: new Date().toISOString(),
            });
        }
      }
    } catch (error) {
      console.error('Error sending auto reply:', error);
    }
  }

  /**
   * Webhookのレート制限チェック
   */
  static async checkRateLimit(
    source: string,
    identifier: string,
    maxRequests: number = 100,
    windowMinutes: number = 1
  ): Promise<boolean> {
    const key = `webhook_rate_${source}_${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);

    try {
      // レート制限の記録を取得
      const { data, error } = await supabase
        .from('rate_limit_logs')
        .select('count')
        .eq('key', key)
        .gte('timestamp', new Date(windowStart).toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // not found error
        console.error('Rate limit check error:', error);
        return true; // エラー時は通す
      }

      const currentCount = data?.count || 0;
      
      if (currentCount >= maxRequests) {
        return false; // レート制限に達している
      }

      // カウントを増やす
      await supabase
        .from('rate_limit_logs')
        .upsert({
          key,
          count: currentCount + 1,
          timestamp: new Date().toISOString(),
        });

      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true; // エラー時は通す
    }
  }

  /**
   * Webhookエラーの記録
   */
  static async logWebhookError(
    source: string,
    error: any,
    context?: any
  ): Promise<void> {
    try {
      await supabase
        .from('webhook_error_logs')
        .insert({
          source,
          error_message: error.message || String(error),
          error_stack: error.stack,
          context: context ? JSON.stringify(context) : null,
          occurred_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
  }
}