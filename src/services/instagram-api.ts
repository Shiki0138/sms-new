import { ApiIntegration, Message, MessageChannel } from '../types/message';

// Instagram Basic Display API + Instagram Graph API for messaging
export class InstagramApiService {
  private accessToken: string;
  private appId: string;
  private appSecret: string;

  constructor(integration: ApiIntegration) {
    this.accessToken = integration.api_credentials.access_token || '';
    this.appId = integration.api_credentials.app_id || '';
    this.appSecret = integration.api_credentials.app_secret || '';
  }

  private getBaseUrl() {
    return 'https://graph.instagram.com';
  }

  // Instagram Graph API for messaging (requires business account)
  private getMessagingBaseUrl() {
    return 'https://graph.facebook.com/v18.0';
  }

  /**
   * アカウント情報を取得
   */
  async getAccountInfo(): Promise<{
    id: string;
    username: string;
    name: string;
    profile_picture_url: string;
    followers_count: number;
  }> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/me?fields=id,username,account_type,media_count&access_token=${this.accessToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Instagram account info:', error);
      throw error;
    }
  }

  /**
   * Instagram DMの受信メッセージを取得（Graph API）
   * 注意: Instagram Graph API for Messagingはビジネスアカウントのみ利用可能
   */
  async getDirectMessages(): Promise<Message[]> {
    try {
      const response = await fetch(
        `${this.getMessagingBaseUrl()}/me/conversations?fields=participants,messages{message,from,created_time}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Instagram messaging API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.data?.map((conversation: any) => ({
        id: conversation.id,
        channel_id: 'instagram-dm',
        sender_id: conversation.messages?.data?.[0]?.from?.id || '',
        sender_name: conversation.participants?.data?.find((p: any) => p.id !== 'me')?.name || 'Instagram User',
        content: conversation.messages?.data?.[0]?.message || '',
        message_type: 'text' as const,
        direction: 'incoming' as const,
        created_at: conversation.messages?.data?.[0]?.created_time || new Date().toISOString(),
        is_read: false,
      })) || [];
    } catch (error) {
      console.error('Error fetching Instagram DMs:', error);
      // 開発環境ではモックデータを返す
      if (import.meta.env.DEV) {
        return this.getMockDirectMessages();
      }
      throw error;
    }
  }

  /**
   * Instagram DMを送信（Graph API）
   */
  async sendDirectMessage(recipientId: string, message: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.getMessagingBaseUrl()}/me/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send Instagram DM: ${response.status}`);
      }

      console.log('Instagram DM sent successfully');
    } catch (error) {
      console.error('Error sending Instagram DM:', error);
      // 開発環境ではログのみ出力
      if (import.meta.env.DEV) {
        console.log('Mock: Instagram DM sent to', recipientId, 'message:', message);
        return;
      }
      throw error;
    }
  }

  /**
   * メディア投稿を取得
   */
  async getRecentMedia(limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=${limit}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Instagram media:', error);
      return [];
    }
  }

  /**
   * Instagram Webhookの処理
   */
  async handleWebhook(payload: any): Promise<Message | null> {
    try {
      // Instagram Graph API Webhook for messaging
      if (payload.object === 'instagram' && payload.entry) {
        const entry = payload.entry[0];
        const messaging = entry.messaging?.[0];

        if (messaging && messaging.message) {
          return {
            id: messaging.message.mid,
            channel_id: 'instagram-dm',
            sender_id: messaging.sender.id,
            sender_name: messaging.sender.username || 'Instagram User',
            content: messaging.message.text || '',
            message_type: 'received' as MessageType,
            direction: 'incoming',
            created_at: new Date(messaging.timestamp).toISOString(),
            is_read: false,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error processing Instagram webhook:', error);
      return null;
    }
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Instagram connection test failed:', error);
      return false;
    }
  }

  /**
   * 開発環境用のモックデータ
   */
  private getMockDirectMessages(): Message[] {
    return [
      {
        id: 'ig_dm_1',
        channel_id: 'instagram-dm',
        sender_id: 'ig_user_1',
        sender_name: '田中美咲',
        content: 'こんにちは！来週の予約は可能でしょうか？',
        message_type: 'received' as MessageType,
        direction: 'incoming',
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30分前
        is_read: false,
      },
      {
        id: 'ig_dm_2',
        channel_id: 'instagram-dm',
        sender_id: 'ig_user_2',
        sender_name: 'beauty_lover_2024',
        content: 'ヘアカラーの料金について教えてください 💇‍♀️',
        message_type: 'received' as MessageType,
        direction: 'incoming',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1時間前
        is_read: false,
      },
      {
        id: 'ig_dm_3',
        channel_id: 'instagram-dm',
        sender_id: 'ig_user_3',
        sender_name: 'salon_regular',
        content: '先日はありがとうございました！とても満足です ✨',
        message_type: 'received' as MessageType,
        direction: 'incoming',
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2時間前
        is_read: true,
      },
    ];
  }

  /**
   * アクセストークンの有効性を確認
   */
  async validateAccessToken(): Promise<{ isValid: boolean; expiresAt?: Date }> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/access_token?grant_type=ig_exchange_token&client_secret=${this.appSecret}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        return { isValid: false };
      }

      const data = await response.json();
      return {
        isValid: true,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      };
    } catch (error) {
      console.error('Error validating Instagram access token:', error);
      return { isValid: false };
    }
  }

  /**
   * リッチメッセージ送信（画像付きなど）
   */
  async sendRichMessage(recipientId: string, options: {
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  }): Promise<void> {
    try {
      const payload: any = {
        recipient: { id: recipientId },
        access_token: this.accessToken,
      };

      if (options.mediaUrl && options.mediaType) {
        payload.message = {
          attachment: {
            type: options.mediaType,
            payload: {
              url: options.mediaUrl,
            },
          },
        };
      } else if (options.text) {
        payload.message = { text: options.text };
      }

      const response = await fetch(
        `${this.getMessagingBaseUrl()}/me/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send Instagram rich message: ${response.status}`);
      }

      console.log('Instagram rich message sent successfully');
    } catch (error) {
      console.error('Error sending Instagram rich message:', error);
      if (import.meta.env.DEV) {
        console.log('Mock: Instagram rich message sent to', recipientId, 'options:', options);
        return;
      }
      throw error;
    }
  }
}

// Instagram統合のヘルパー関数
export const instagramHelpers = {
  /**
   * Instagram URLからユーザー名を抽出
   */
  extractUsernameFromUrl(url: string): string | null {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  },

  /**
   * Instagram投稿URLの検証
   */
  isValidInstagramUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?instagram\.com\//.test(url);
  },

  /**
   * メッセージ内容の美容室向けフィルタリング
   */
  filterSalonRelevantMessages(messages: Message[]): Message[] {
    const salonKeywords = [
      '予約', 'カット', 'カラー', 'パーマ', 'トリートメント',
      '料金', '価格', '時間', '営業', 'ヘア', '美容', 'サロン'
    ];

    return messages.filter(message => 
      salonKeywords.some(keyword => 
        message.content.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  },

  /**
   * Instagram特有の絵文字やハッシュタグを処理
   */
  processInstagramContent(content: string): string {
    // ハッシュタグの処理
    const processedContent = content.replace(
      /#([^\s#]+)/g, 
      '<span class="text-primary-600 font-medium">#$1</span>'
    );

    return processedContent;
  },
};