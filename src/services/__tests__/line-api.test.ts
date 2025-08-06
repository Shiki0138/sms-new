import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  LineApiService, 
  initializeLineApi, 
  getLineApi,
  registerLineChannel,
  sendLineMessage
} from '../line-api';

// Mock global fetch
global.fetch = vi.fn();

describe('LineApiService', () => {
  let service: LineApiService;
  const mockConfig = {
    channelAccessToken: 'test-channel-access-token',
    channelSecret: 'test-channel-secret',
    webhookUrl: 'https://example.com/webhook',
  };

  beforeEach(() => {
    service = new LineApiService(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        userId: 'U1234567890abcdef',
        displayName: '山田花子',
        pictureUrl: 'https://example.com/profile.jpg',
        statusMessage: 'Hello LINE!',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const profile = await service.getUserProfile('U1234567890abcdef');

      expect(profile).toEqual(mockProfile);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/profile/U1234567890abcdef',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockConfig.channelAccessToken}`,
          },
        }
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(service.getUserProfile('invalid-user-id'))
        .rejects.toThrow('Failed to get LINE profile: Not Found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(service.getUserProfile('U1234567890abcdef'))
        .rejects.toThrow('Network error');
    });
  });

  describe('sendMessage', () => {
    it('should send messages successfully', async () => {
      const userId = 'U1234567890abcdef';
      const messages = [
        { type: 'text', text: 'テストメッセージ1' },
        { type: 'text', text: 'テストメッセージ2' },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendMessage(userId, messages);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockConfig.channelAccessToken}`,
          },
          body: JSON.stringify({
            to: userId,
            messages: messages,
          }),
        }
      );
    });

    it('should limit messages to maximum 5', async () => {
      const userId = 'U1234567890abcdef';
      const messages = Array.from({ length: 10 }, (_, i) => ({
        type: 'text',
        text: `メッセージ${i + 1}`,
      }));

      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendMessage(userId, messages);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages).toHaveLength(5);
    });

    it('should handle send errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(service.sendMessage('U1234567890abcdef', []))
        .rejects.toThrow('Failed to send LINE message: Bad Request');
    });
  });

  describe('sendTextMessage', () => {
    it('should send text message', async () => {
      const userId = 'U1234567890abcdef';
      const text = 'こんにちは！テストメッセージです。';

      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendTextMessage(userId, text);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages).toEqual([
        { type: 'text', text: text },
      ]);
    });
  });

  describe('sendRichMessage', () => {
    it('should send rich template message', async () => {
      const userId = 'U1234567890abcdef';
      const content = {
        altText: 'リッチメッセージです',
        template: {
          type: 'buttons',
          title: 'テストタイトル',
          text: 'テスト内容',
          actions: [
            { type: 'postback', label: 'ボタン1', data: 'action=test' },
          ],
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendRichMessage(userId, content);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages).toEqual([
        {
          type: 'template',
          altText: content.altText,
          template: content.template,
        },
      ]);
    });
  });

  describe('replyMessage', () => {
    it('should reply to message', async () => {
      const replyToken = 'reply-token-123';
      const messages = [
        { type: 'text', text: 'ご返信ありがとうございます' },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.replyMessage(replyToken, messages);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/reply',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockConfig.channelAccessToken}`,
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: messages,
          }),
        }
      );
    });

    it('should handle reply errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Forbidden',
      });

      await expect(service.replyMessage('invalid-token', []))
        .rejects.toThrow('Failed to reply LINE message: Forbidden');
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle text message event', async () => {
      const mockEvent = {
        type: 'message',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
        replyToken: 'reply-token-123',
        message: {
          id: 'message-123',
          type: 'text',
          text: 'こんにちは！',
        },
      };

      const result = await service.handleWebhookEvent(mockEvent as any);

      expect(result).toMatchObject({
        message_type: 'received',
        content: 'こんにちは！',
        is_read: false,
        is_ai_reply: false,
        external_message_id: 'message-123',
      });
      expect(result?.sent_at).toBeDefined();
    });

    it('should handle image message event', async () => {
      const mockEvent = {
        type: 'message',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
        message: {
          id: 'message-456',
          type: 'image',
          previewUrl: 'https://example.com/preview.jpg',
          originalContentUrl: 'https://example.com/original.jpg',
        },
      };

      const result = await service.handleWebhookEvent(mockEvent as any);

      expect(result).toMatchObject({
        content: '[画像]',
        media_url: 'https://example.com/preview.jpg',
        media_type: 'image',
      });
    });

    it('should handle sticker message event', async () => {
      const mockEvent = {
        type: 'message',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
        message: {
          id: 'message-789',
          type: 'sticker',
          packageId: '1',
          stickerId: '2',
        },
      };

      const result = await service.handleWebhookEvent(mockEvent as any);

      expect(result).toMatchObject({
        content: '[スタンプ: 1-2]',
        media_type: 'image',
      });
      expect(result?.media_url).toContain('stickershop.line-scdn.net');
    });

    it('should handle video message event', async () => {
      const mockEvent = {
        type: 'message',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
        message: {
          id: 'message-video',
          type: 'video',
          previewUrl: 'https://example.com/video-preview.jpg',
        },
      };

      const result = await service.handleWebhookEvent(mockEvent as any);

      expect(result).toMatchObject({
        content: '[動画]',
        media_url: 'https://example.com/video-preview.jpg',
        media_type: 'video',
      });
    });

    it('should return null for non-message events', async () => {
      const mockEvent = {
        type: 'follow',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
      };

      const result = await service.handleWebhookEvent(mockEvent as any);

      expect(result).toBeNull();
    });

    it('should handle unknown message types', async () => {
      const mockEvent = {
        type: 'message',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U1234567890abcdef',
        },
        message: {
          id: 'message-unknown',
          type: 'unknown',
        },
      };

      const result = await service.handleWebhookEvent(mockEvent as any);

      expect(result).toMatchObject({
        content: '[unknown]',
      });
    });
  });

  describe('validateSignature', () => {
    it('should skip validation in browser environment', () => {
      // Mock browser environment
      (global as any).window = {};

      const result = service.validateSignature('test-body', 'test-signature');

      expect(result).toBe(true);

      // Clean up
      delete (global as any).window;
    });

    it('should validate signature in Node.js environment', () => {
      // Mock Node.js environment (no window)
      const mockCrypto = {
        createHmac: vi.fn(() => ({
          update: vi.fn(() => ({
            digest: vi.fn(() => 'expected-hash'),
          })),
        })),
      };

      // Mock require for crypto
      vi.doMock('crypto', () => mockCrypto);

      const body = 'test-body';
      const signature = 'expected-hash';

      const result = service.validateSignature(body, signature);

      expect(result).toBe(true);
    });
  });

  describe('Template Creation', () => {
    it('should create reservation confirmation template', () => {
      const reservation = {
        customerName: '山田花子',
        date: '2024年1月22日',
        time: '14:00',
        menu: 'カット＆カラー',
        duration: '90分',
        price: 8000,
      };

      const template = service.createReservationConfirmTemplate(reservation);

      expect(template.type).toBe('buttons');
      expect(template.title).toBe('予約確認');
      expect(template.text).toContain('山田花子様');
      expect(template.text).toContain('2024年1月22日 14:00');
      expect(template.text).toContain('カット＆カラー');
      expect(template.text).toContain('90分');
      expect(template.text).toContain('¥8,000');
      expect(template.actions).toHaveLength(2);
    });

    it('should create reminder template for week before', () => {
      const reminder = {
        type: 'week_before' as const,
        customerName: '佐藤太郎',
        date: '来週月曜日',
        time: '10:00',
        menu: 'パーマ',
      };

      const template = service.createReminderTemplate(reminder);

      expect(template.type).toBe('buttons');
      expect(template.title).toBe('📅 ご予約のお知らせ');
      expect(template.text).toContain('佐藤太郎様');
      expect(template.text).toContain('来週来週月曜日 10:00');
    });

    it('should create reminder template for day before', () => {
      const reminder = {
        type: 'day_before' as const,
        customerName: '鈴木美咲',
        time: '15:00',
        menu: 'トリートメント',
      };

      const template = service.createReminderTemplate(reminder);

      expect(template.title).toBe('🔔 明日のご予約');
      expect(template.text).toContain('鈴木美咲様');
      expect(template.text).toContain('明日15:00');
      expect(template.text).toContain('トリートメント');
    });

    it('should create after visit template', () => {
      const reminder = {
        type: 'after_visit' as const,
        customerName: '田中一郎',
      };

      const template = service.createReminderTemplate(reminder);

      expect(template.title).toBe('💕 ご来店ありがとうございました');
      expect(template.text).toContain('田中一郎様');
      expect(template.text).toContain('本日はご来店いただきありがとうございました');
    });

    it('should create menu carousel', () => {
      const menus = [
        {
          id: 'menu-1',
          name: 'カット',
          description: 'スタンダードカット',
          price: 4500,
          imageUrl: 'https://example.com/cut.jpg',
        },
        {
          id: 'menu-2',
          name: 'カラー',
          description: 'フルカラー',
          price: 6000,
          imageUrl: 'https://example.com/color.jpg',
        },
      ];

      const carousel = service.createMenuCarousel(menus);

      expect(carousel.type).toBe('carousel');
      expect(carousel.columns).toHaveLength(2);
      expect(carousel.columns[0].title).toBe('カット');
      expect(carousel.columns[0].text).toContain('スタンダードカット');
      expect(carousel.columns[0].text).toContain('¥4,500');
      expect(carousel.columns[0].actions[0].data).toBe('action=book_menu&menu_id=menu-1');
    });

    it('should limit carousel to 10 items', () => {
      const menus = Array.from({ length: 15 }, (_, i) => ({
        id: `menu-${i}`,
        name: `メニュー${i}`,
        description: `説明${i}`,
        price: 5000,
        imageUrl: `https://example.com/menu${i}.jpg`,
      }));

      const carousel = service.createMenuCarousel(menus);

      expect(carousel.columns).toHaveLength(10);
    });
  });

  describe('Singleton Pattern', () => {
    it('should initialize LINE API instance', () => {
      const config = {
        channelAccessToken: 'test-token',
        channelSecret: 'test-secret',
      };

      const instance = initializeLineApi(config);

      expect(instance).toBeInstanceOf(LineApiService);
      expect(getLineApi()).toBe(instance);
    });

    it('should throw error when accessing uninitialized instance', () => {
      // Reset the singleton
      (global as any).lineApiInstance = null;

      expect(() => getLineApi()).toThrow('LINE API is not initialized');
    });
  });

  describe('Channel Registration', () => {
    it('should register LINE channel', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'customer-456';
      const lineUserId = 'U1234567890abcdef';
      const profile = {
        userId: lineUserId,
        displayName: '山田花子',
        pictureUrl: 'https://example.com/profile.jpg',
        statusMessage: 'Hello!',
      };

      const channel = await registerLineChannel(tenantId, customerId, lineUserId, profile);

      expect(channel).toMatchObject({
        tenant_id: tenantId,
        customer_id: customerId,
        channel_type: 'line',
        channel_id: lineUserId,
        channel_name: profile.displayName,
        is_active: true,
      });
      expect(channel.id).toBeDefined();
      expect(channel.created_at).toBeDefined();
      expect(channel.updated_at).toBeDefined();
    });
  });

  describe('Message Sending with Database', () => {
    it('should send LINE message and create database record', async () => {
      const channelId = 'channel-123';
      const content = 'テストメッセージ';

      // Mock getLineApi
      const mockLineApiInstance = {
        sendTextMessage: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(require('../line-api'), 'getLineApi').mockReturnValue(mockLineApiInstance);

      // Mock channel data (would normally come from database)
      const mockChannel = {
        tenant_id: 'tenant-123',
        customer_id: 'customer-456',
        channel_id: 'U1234567890abcdef',
      };

      const mockMessage = {
        id: 'message-123',
        tenant_id: mockChannel.tenant_id,
        customer_id: mockChannel.customer_id,
        channel_id: channelId,
        message_type: 'sent',
        content: content,
        is_read: true,
        is_ai_reply: false,
        sent_at: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      const result = await sendLineMessage(channelId, content);

      expect(mockLineApiInstance.sendTextMessage).toHaveBeenCalledWith(
        mockChannel.channel_id,
        content
      );
      expect(result).toMatchObject({
        message_type: 'sent',
        content: content,
        is_read: true,
        is_ai_reply: false,
      });
    });

    it('should send rich message with template', async () => {
      const channelId = 'channel-123';
      const content = 'リッチメッセージ';
      const template = {
        type: 'buttons',
        title: 'テスト',
        text: 'テスト内容',
        actions: [],
      };

      const mockLineApiInstance = {
        sendRichMessage: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(require('../line-api'), 'getLineApi').mockReturnValue(mockLineApiInstance);

      await sendLineMessage(channelId, content, {
        isAiReply: true,
        template: template,
      });

      expect(mockLineApiInstance.sendRichMessage).toHaveBeenCalledWith(
        expect.any(String),
        {
          altText: content,
          template: template,
        }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty message arrays', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendMessage('U1234567890abcdef', []);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages).toEqual([]);
    });

    it('should handle extremely long text messages', async () => {
      const longText = 'A'.repeat(50000); // Very long message
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendTextMessage('U1234567890abcdef', longText);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages[0].text).toBe(longText);
    });

    it('should handle malformed webhook events', async () => {
      const malformedEvent = {
        type: 'message',
        // Missing required fields
      };

      const result = await service.handleWebhookEvent(malformedEvent as any);

      expect(result).toBeNull();
    });

    it('should handle network timeouts', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Request timeout'));

      await expect(service.sendTextMessage('U1234567890abcdef', 'test'))
        .rejects.toThrow('Request timeout');
    });

    it('should handle invalid JSON responses', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(service.getUserProfile('U1234567890abcdef'))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle special characters in messages', async () => {
      const specialText = '🎉👏💖 特殊文字テスト: ①②③ 【重要】';
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await service.sendTextMessage('U1234567890abcdef', specialText);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      
      expect(body.messages[0].text).toBe(specialText);
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(service.sendTextMessage('U1234567890abcdef', 'test'))
        .rejects.toThrow('Failed to send LINE message: Too Many Requests');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent message sends', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const promises = Array.from({ length: 100 }, (_, i) =>
        service.sendTextMessage('U1234567890abcdef', `メッセージ${i}`)
      );

      await Promise.all(promises);

      expect(global.fetch).toHaveBeenCalledTimes(100);
    });

    it('should handle large carousel with many items', () => {
      const manyMenus = Array.from({ length: 50 }, (_, i) => ({
        id: `menu-${i}`,
        name: `メニュー${i}`,
        description: `説明${i}`,
        price: 5000 + i * 100,
        imageUrl: `https://example.com/menu${i}.jpg`,
      }));

      const carousel = service.createMenuCarousel(manyMenus);

      // Should be limited to 10 items
      expect(carousel.columns).toHaveLength(10);
    });
  });
});