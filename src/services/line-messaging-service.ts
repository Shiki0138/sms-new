import { supabase } from '../lib/supabase';
import crypto from 'crypto';

export interface LineCredentials {
  accessToken: string;
  secret: string;
  webhookUrl?: string;
}

export interface LineMessage {
  type: 'text' | 'image' | 'sticker' | 'template';
  text?: string;
  packageId?: string;
  stickerId?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  template?: any;
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineWebhookEvent {
  type: string;
  message?: any;
  timestamp: number;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
  };
  replyToken?: string;
}

export class LineMessagingService {
  private channelAccessToken: string;
  private channelSecret: string;
  private baseUrl = 'https://api.line.me/v2/bot';

  constructor(credentials: LineCredentials) {
    this.channelAccessToken = credentials.accessToken;
    this.channelSecret = credentials.secret;
  }

  /**
   * メッセージを送信（プッシュメッセージ）
   */
  async sendMessage(userId: string, messages: LineMessage | LineMessage[]): Promise<void> {
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    const response = await fetch(`${this.baseUrl}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: messageArray,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LINE API Error: ${error.message || response.statusText}`);
    }
  }

  /**
   * 返信メッセージを送信
   */
  async replyMessage(replyToken: string, messages: LineMessage | LineMessage[]): Promise<void> {
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    const response = await fetch(`${this.baseUrl}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: messageArray,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LINE API Error: ${error.message || response.statusText}`);
    }
  }

  /**
   * ユーザープロフィールを取得
   */
  async getUserProfile(userId: string): Promise<LineProfile> {
    const response = await fetch(`${this.baseUrl}/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LINE API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Webhook署名を検証
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(body)
      .digest('base64');
    
    return signature === hash;
  }

  /**
   * Webhookイベントを処理
   */
  async handleWebhookEvents(events: LineWebhookEvent[], tenantId: string): Promise<void> {
    for (const event of events) {
      try {
        switch (event.type) {
          case 'message':
            await this.handleMessageEvent(event, tenantId);
            break;
          case 'follow':
            await this.handleFollowEvent(event, tenantId);
            break;
          case 'unfollow':
            await this.handleUnfollowEvent(event, tenantId);
            break;
          case 'postback':
            await this.handlePostbackEvent(event, tenantId);
            break;
        }
      } catch (error) {
        console.error('Error handling webhook event:', error);
      }
    }
  }

  /**
   * メッセージイベントを処理
   */
  private async handleMessageEvent(event: LineWebhookEvent, tenantId: string) {
    if (!event.source.userId || !event.message) return;

    const userId = event.source.userId;
    const message = event.message;

    // ユーザー情報を取得
    const profile = await this.getUserProfile(userId);

    // 顧客情報を検索または作成
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('line_user_id', userId)
      .single();

    let customerId = customer?.id;

    if (!customer) {
      // 新規顧客として登録
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          name: profile.displayName,
          line_user_id: userId,
          preferred_contact_method: 'line',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      customerId = newCustomer?.id;

      // LINE連絡先を登録
      if (customerId) {
        await supabase.from('customer_channels').insert({
          customer_id: customerId,
          channel_type: 'line',
          channel_id: userId,
          channel_name: profile.displayName,
          is_active: true,
          profile_picture_url: profile.pictureUrl,
        });
      }
    }

    // メッセージを保存
    if (customerId) {
      let content = '';
      let messageType = 'text';

      switch (message.type) {
        case 'text':
          content = message.text;
          break;
        case 'image':
          content = '[画像]';
          messageType = 'image';
          break;
        case 'sticker':
          content = '[スタンプ]';
          messageType = 'sticker';
          break;
        default:
          content = `[${message.type}]`;
      }

      await supabase.from('messages').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        channel_type: 'line',
        direction: 'received',
        message_type: messageType,
        content,
        channel_message_id: event.timestamp.toString(),
        created_at: new Date().toISOString(),
        metadata: {
          lineUserId: userId,
          messageId: message.id,
          replyToken: event.replyToken,
        },
      });
    }

    // 自動返信（営業時間外など）
    if (event.replyToken) {
      await this.sendAutoReply(event.replyToken, tenantId);
    }
  }

  /**
   * フォローイベントを処理
   */
  private async handleFollowEvent(event: LineWebhookEvent, tenantId: string) {
    if (!event.source.userId) return;

    const userId = event.source.userId;
    const profile = await this.getUserProfile(userId);

    // ウェルカムメッセージを送信
    await this.sendMessage(userId, [
      {
        type: 'text',
        text: `${profile.displayName}様、友だち追加ありがとうございます！🌟\n\nこちらから予約の確認やお問い合わせが可能です。\nお気軽にメッセージをお送りください。`,
      },
      {
        type: 'template',
        template: {
          type: 'buttons',
          text: 'ご利用方法をお選びください',
          actions: [
            {
              type: 'message',
              label: '予約する',
              text: '予約したい',
            },
            {
              type: 'message',
              label: '予約確認',
              text: '予約を確認',
            },
            {
              type: 'message',
              label: 'お問い合わせ',
              text: 'お問い合わせ',
            },
          ],
        },
      },
    ]);
  }

  /**
   * アンフォローイベントを処理
   */
  private async handleUnfollowEvent(event: LineWebhookEvent, tenantId: string) {
    if (!event.source.userId) return;

    // 顧客のLINE連携を無効化
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('line_user_id', event.source.userId)
      .single();

    if (customer) {
      await supabase
        .from('customer_channels')
        .update({ is_active: false })
        .eq('customer_id', customer.id)
        .eq('channel_type', 'line');
    }
  }

  /**
   * ポストバックイベントを処理
   */
  private async handlePostbackEvent(event: LineWebhookEvent, tenantId: string) {
    // ボタンアクションなどの処理
    console.log('Postback event:', event);
  }

  /**
   * 自動返信を送信
   */
  private async sendAutoReply(replyToken: string, tenantId: string) {
    // 営業時間を確認
    const now = new Date();
    const currentHour = now.getHours();
    const isBusinessHours = currentHour >= 9 && currentHour < 19;

    if (!isBusinessHours) {
      await this.replyMessage(replyToken, {
        type: 'text',
        text: 'お問い合わせありがとうございます。\n現在営業時間外のため、明日営業開始後にご返信させていただきます。\n\n営業時間: 9:00-19:00',
      });
    }
  }

  /**
   * リッチメニューを設定
   */
  async createRichMenu(tenantId: string): Promise<string> {
    // リッチメニューの作成
    const richMenuData = {
      size: {
        width: 2500,
        height: 1686,
      },
      selected: true,
      name: '美容サロンメニュー',
      chatBarText: 'メニュー',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { type: 'message', text: '予約する' },
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: { type: 'message', text: '予約確認' },
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: { type: 'message', text: 'キャンセル' },
        },
        {
          bounds: { x: 0, y: 843, width: 833, height: 843 },
          action: { type: 'uri', uri: 'https://your-salon.com/menu' },
        },
        {
          bounds: { x: 833, y: 843, width: 834, height: 843 },
          action: { type: 'message', text: 'お問い合わせ' },
        },
        {
          bounds: { x: 1667, y: 843, width: 833, height: 843 },
          action: { type: 'uri', uri: 'https://your-salon.com/access' },
        },
      ],
    };

    const response = await fetch(`${this.baseUrl}/richmenu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.channelAccessToken}`,
      },
      body: JSON.stringify(richMenuData),
    });

    if (!response.ok) {
      throw new Error('Failed to create rich menu');
    }

    const result = await response.json();
    return result.richMenuId;
  }

  /**
   * メッセージテンプレート
   */
  getMessageTemplates() {
    return {
      reservation_reminder: (customerName: string, date: string, time: string, menu: string) => ({
        type: 'text',
        text: `${customerName}様\n\nご予約のリマインドです📅\n\n日時: ${date} ${time}\nメニュー: ${menu}\n\n当日のご来店を心よりお待ちしております✨`,
      }),

      reservation_confirmed: (customerName: string, date: string, time: string) => ({
        type: 'text',
        text: `${customerName}様\n\nご予約を承りました✅\n\n日時: ${date} ${time}\n\n変更・キャンセルの場合は、お早めにご連絡ください。`,
      }),

      thank_you: (customerName: string) => ({
        type: 'text',
        text: `${customerName}様\n\n本日はご来店ありがとうございました😊\n\n仕上がりはいかがでしょうか？\nまた次回のご来店を心よりお待ちしております💕`,
      }),

      campaign: (customerName: string, campaignDetails: string) => ({
        type: 'text',
        text: `${customerName}様\n\n🎉 特別キャンペーンのお知らせ 🎉\n\n${campaignDetails}\n\nこの機会にぜひご利用ください！`,
      }),
    };
  }
}