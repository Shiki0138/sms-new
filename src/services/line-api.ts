// LINE Messaging API 連携サービス
import { MessageChannel, Message, ChannelType } from '../types/message';

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  webhookUrl?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
  text?: string;
  packageId?: string;
  stickerId?: string;
  previewUrl?: string;
  originalContentUrl?: string;
}

interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: LineMessage;
}

export class LineApiService {
  private config: LineConfig;
  private baseUrl = 'https://api.line.me/v2/bot';

  constructor(config: LineConfig) {
    this.config = config;
  }

  // ヘッダーを生成
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.channelAccessToken}`,
    };
  }

  // ユーザープロフィールを取得
  async getUserProfile(userId: string): Promise<LineProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/profile/${userId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get LINE profile: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching LINE profile:', error);
      throw error;
    }
  }

  // メッセージを送信
  async sendMessage(userId: string, messages: any[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/message/push`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          to: userId,
          messages: messages.slice(0, 5), // 最大5メッセージ
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send LINE message: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending LINE message:', error);
      throw error;
    }
  }

  // テキストメッセージを送信
  async sendTextMessage(userId: string, text: string): Promise<void> {
    await this.sendMessage(userId, [
      {
        type: 'text',
        text,
      },
    ]);
  }

  // リッチメッセージを送信
  async sendRichMessage(userId: string, content: {
    altText: string;
    template: any;
  }): Promise<void> {
    await this.sendMessage(userId, [
      {
        type: 'template',
        altText: content.altText,
        template: content.template,
      },
    ]);
  }

  // 返信メッセージを送信
  async replyMessage(replyToken: string, messages: any[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/message/reply`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          replyToken,
          messages: messages.slice(0, 5), // 最大5メッセージ
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to reply LINE message: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error replying LINE message:', error);
      throw error;
    }
  }

  // Webhookイベントを処理
  async handleWebhookEvent(event: LineWebhookEvent): Promise<Message | null> {
    if (event.type !== 'message' || !event.message) {
      return null;
    }

    const { message, source, timestamp } = event;

    // メッセージコンテンツを取得
    let content = '';
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    switch (message.type) {
      case 'text':
        content = message.text || '';
        break;
      
      case 'image':
        content = '[画像]';
        mediaUrl = message.previewUrl || message.originalContentUrl;
        mediaType = 'image';
        break;
      
      case 'video':
        content = '[動画]';
        mediaUrl = message.previewUrl;
        mediaType = 'video';
        break;
      
      case 'sticker':
        content = `[スタンプ: ${message.packageId}-${message.stickerId}]`;
        // スタンプは画像として扱う
        mediaUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${message.stickerId}/android/sticker.png`;
        mediaType = 'image';
        break;
      
      default:
        content = `[${message.type}]`;
    }

    // メッセージオブジェクトを作成
    const newMessage: Partial<Message> = {
      channel_id: '', // 実際のチャンネルIDはデータベースから取得
      message_type: 'received',
      content,
      media_url: mediaUrl,
      media_type: mediaType as any,
      is_read: false,
      is_ai_reply: false,
      external_message_id: message.id,
      sent_at: new Date(timestamp).toISOString(),
    };

    return newMessage as Message;
  }

  // 署名を検証（Webhook用）
  validateSignature(body: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('SHA256', this.config.channelSecret)
      .update(body)
      .digest('base64');
    
    return hash === signature;
  }

  // 予約確認メッセージテンプレートを作成
  createReservationConfirmTemplate(reservation: {
    customerName: string;
    date: string;
    time: string;
    menu: string;
    duration: string;
    price: number;
  }) {
    return {
      type: 'buttons',
      thumbnailImageUrl: 'https://example.com/salon-image.jpg',
      imageAspectRatio: 'rectangle',
      imageSize: 'cover',
      imageBackgroundColor: '#e08553',
      title: '予約確認',
      text: `${reservation.customerName}様\n\n日時: ${reservation.date} ${reservation.time}\nメニュー: ${reservation.menu}\n所要時間: ${reservation.duration}\n料金: ¥${reservation.price.toLocaleString()}`,
      defaultAction: {
        type: 'uri',
        label: '予約詳細を見る',
        uri: 'https://salon.example.com/reservations',
      },
      actions: [
        {
          type: 'postback',
          label: '確認しました',
          data: 'action=confirm_reservation',
          displayText: '予約を確認しました',
        },
        {
          type: 'postback',
          label: '変更する',
          data: 'action=change_reservation',
          displayText: '予約を変更したいです',
        },
      ],
    };
  }

  // リマインダーメッセージテンプレートを作成
  createReminderTemplate(reminder: {
    type: 'week_before' | 'day_before' | 'after_visit';
    customerName: string;
    date?: string;
    time?: string;
    menu?: string;
  }) {
    const templates = {
      week_before: {
        title: '📅 ご予約のお知らせ',
        text: `${reminder.customerName}様\n\n来週${reminder.date} ${reminder.time}にご予約をいただいております。\n\n楽しみにお待ちしております✨`,
        actions: [
          {
            type: 'uri',
            label: '予約を確認',
            uri: 'https://salon.example.com/reservations',
          },
        ],
      },
      day_before: {
        title: '🔔 明日のご予約',
        text: `${reminder.customerName}様\n\n明日${reminder.time}にお待ちしております！\n\n${reminder.menu}のご予約です。\n\n何かご不明な点がございましたらお気軽にご連絡ください。`,
        actions: [
          {
            type: 'uri',
            label: 'アクセス',
            uri: 'https://salon.example.com/access',
          },
        ],
      },
      after_visit: {
        title: '💕 ご来店ありがとうございました',
        text: `${reminder.customerName}様\n\n本日はご来店いただきありがとうございました！\n\n仕上がりはいかがでしょうか？\n\nまた次回のご来店を心よりお待ちしております。`,
        actions: [
          {
            type: 'uri',
            label: '次回予約',
            uri: 'https://salon.example.com/booking',
          },
        ],
      },
    };

    const template = templates[reminder.type];
    
    return {
      type: 'buttons',
      thumbnailImageUrl: 'https://example.com/salon-thanks.jpg',
      imageAspectRatio: 'rectangle',
      imageSize: 'cover',
      imageBackgroundColor: '#e08553',
      ...template,
    };
  }

  // カルーセルメッセージを作成（メニュー紹介など）
  createMenuCarousel(menus: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
  }>) {
    return {
      type: 'carousel',
      columns: menus.slice(0, 10).map(menu => ({
        thumbnailImageUrl: menu.imageUrl,
        imageBackgroundColor: '#e08553',
        title: menu.name,
        text: `${menu.description}\n\n料金: ¥${menu.price.toLocaleString()}`,
        defaultAction: {
          type: 'uri',
          label: '詳細を見る',
          uri: `https://salon.example.com/menu/${menu.id}`,
        },
        actions: [
          {
            type: 'postback',
            label: '予約する',
            data: `action=book_menu&menu_id=${menu.id}`,
            displayText: `${menu.name}を予約したいです`,
          },
        ],
      })),
      imageAspectRatio: 'rectangle',
      imageSize: 'cover',
    };
  }
}

// LINE API サービスのシングルトンインスタンスを作成
let lineApiInstance: LineApiService | null = null;

export function initializeLineApi(config: LineConfig): LineApiService {
  lineApiInstance = new LineApiService(config);
  return lineApiInstance;
}

export function getLineApi(): LineApiService {
  if (!lineApiInstance) {
    throw new Error('LINE API is not initialized. Call initializeLineApi first.');
  }
  return lineApiInstance;
}

// LINE チャンネルをデータベースに登録
export async function registerLineChannel(
  tenantId: string,
  customerId: string,
  lineUserId: string,
  profile: LineProfile
): Promise<MessageChannel> {
  // TODO: 実際のデータベース保存処理
  const channel: MessageChannel = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    customer_id: customerId,
    channel_type: 'line',
    channel_id: lineUserId,
    channel_name: profile.displayName,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return channel;
}

// LINE メッセージを送信してデータベースに保存
export async function sendLineMessage(
  channelId: string,
  content: string,
  options?: {
    isAiReply?: boolean;
    template?: any;
  }
): Promise<Message> {
  const lineApi = getLineApi();
  
  // TODO: チャンネル情報をデータベースから取得
  const channel = {} as MessageChannel;
  
  // LINEに送信
  if (options?.template) {
    await lineApi.sendRichMessage(channel.channel_id, {
      altText: content,
      template: options.template,
    });
  } else {
    await lineApi.sendTextMessage(channel.channel_id, content);
  }

  // データベースに保存
  const message: Message = {
    id: crypto.randomUUID(),
    tenant_id: channel.tenant_id,
    customer_id: channel.customer_id,
    channel_id: channelId,
    message_type: 'sent',
    content,
    is_read: true,
    is_ai_reply: options?.isAiReply || false,
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return message;
}