import { TwilioProvider } from '../../../src/providers/twilio.provider';
import { mockTwilio } from '../../mocks/sms-providers.mock';

// Mock Twilio SDK
jest.mock('twilio', () => jest.fn(() => mockTwilio));

describe('TwilioProvider', () => {
  let provider: TwilioProvider;

  beforeEach(() => {
    provider = new TwilioProvider({
      accountSid: 'test-sid',
      authToken: 'test-token'
    });
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with valid configuration', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('twilio');
    });

    it('should validate configuration on creation', () => {
      expect(() => {
        new TwilioProvider({
          accountSid: '',
          authToken: 'test-token'
        });
      }).toThrow('Twilio Account SID is required');

      expect(() => {
        new TwilioProvider({
          accountSid: 'test-sid',
          authToken: ''
        });
      }).toThrow('Twilio Auth Token is required');
    });

    it('should return correct rate limits', () => {
      const limits = provider.getRateLimit();
      expect(limits).toEqual({
        requestsPerSecond: 1,
        requestsPerMinute: 60,
        burstLimit: 10
      });
    });
  });

  describe('Message Sending', () => {
    const testMessage = {
      to: '+1234567890',
      from: '+0987654321',
      message: 'Test message'
    };

    it('should send message successfully', async () => {
      const result = await provider.send(testMessage);

      expect(result).toEqual({
        success: true,
        messageId: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        status: 'queued',
        provider: 'twilio'
      });

      expect(mockTwilio.messages.create).toHaveBeenCalledWith({
        to: testMessage.to,
        from: testMessage.from,
        body: testMessage.message
      });
    });

    it('should handle Twilio API errors', async () => {
      const twilioError = new Error('Invalid phone number');
      (twilioError as any).code = 21211;
      mockTwilio.messages.create.mockRejectedValueOnce(twilioError);

      await expect(provider.send(testMessage)).rejects.toThrow('Invalid phone number');
    });

    it('should include messaging service SID when configured', async () => {
      const providerWithService = new TwilioProvider({
        accountSid: 'test-sid',
        authToken: 'test-token',
        messagingServiceSid: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      });

      await providerWithService.send(testMessage);

      expect(mockTwilio.messages.create).toHaveBeenCalledWith({
        to: testMessage.to,
        messagingServiceSid: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        body: testMessage.message
      });
    });

    it('should handle media messages', async () => {
      const mediaMessage = {
        ...testMessage,
        mediaUrls: ['https://example.com/image.jpg']
      };

      await provider.send(mediaMessage);

      expect(mockTwilio.messages.create).toHaveBeenCalledWith({
        to: mediaMessage.to,
        from: mediaMessage.from,
        body: mediaMessage.message,
        mediaUrl: mediaMessage.mediaUrls
      });
    });
  });

  describe('Message Status', () => {
    it('should get message status', async () => {
      const messageId = 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      
      // Mock the message fetch
      mockTwilio.messages = {
        ...mockTwilio.messages,
        get: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue({
            sid: messageId,
            status: 'delivered',
            to: '+1234567890',
            from: '+0987654321',
            body: 'Test message',
            dateCreated: new Date(),
            dateUpdated: new Date(),
            dateSent: new Date(),
            errorCode: null,
            errorMessage: null
          })
        })
      };

      const status = await provider.getMessageStatus(messageId);

      expect(status).toEqual({
        messageId,
        status: 'delivered',
        deliveredAt: expect.any(Date),
        errorCode: null,
        errorMessage: null
      });
    });

    it('should handle failed message status', async () => {
      const messageId = 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      
      mockTwilio.messages = {
        ...mockTwilio.messages,
        get: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue({
            sid: messageId,
            status: 'failed',
            errorCode: 30003,
            errorMessage: 'Unreachable destination handset'
          })
        })
      };

      const status = await provider.getMessageStatus(messageId);

      expect(status).toEqual({
        messageId,
        status: 'failed',
        deliveredAt: null,
        errorCode: 30003,
        errorMessage: 'Unreachable destination handset'
      });
    });
  });

  describe('Webhook Validation', () => {
    it('should validate webhook signature', () => {
      const twilioSignature = 'test-signature';
      const url = 'https://example.com/webhook';
      const params = { MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' };

      // Mock Twilio webhook validation
      const validateWebhook = jest.fn().mockReturnValue(true);
      (provider as any).validateWebhookSignature = validateWebhook;

      const isValid = provider.validateWebhook(twilioSignature, url, params);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const twilioSignature = 'invalid-signature';
      const url = 'https://example.com/webhook';
      const params = { MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' };

      const validateWebhook = jest.fn().mockReturnValue(false);
      (provider as any).validateWebhookSignature = validateWebhook;

      const isValid = provider.validateWebhook(twilioSignature, url, params);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should map Twilio error codes to readable messages', async () => {
      const twilioErrors = [
        { code: 21211, message: 'Invalid To phone number' },
        { code: 21212, message: 'Invalid From phone number' },
        { code: 21608, message: 'The message body is required' },
        { code: 21614, message: 'Message body exceeds 1600 characters' }
      ];

      for (const error of twilioErrors) {
        const twilioError = new Error(error.message);
        (twilioError as any).code = error.code;
        mockTwilio.messages.create.mockRejectedValueOnce(twilioError);

        await expect(provider.send({
          to: '+1234567890',
          from: '+0987654321',
          message: 'Test'
        })).rejects.toThrow(error.message);
      }
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).code = 20429;
      mockTwilio.messages.create.mockRejectedValueOnce(rateLimitError);

      await expect(provider.send({
        to: '+1234567890',
        from: '+0987654321',
        message: 'Test'
      })).rejects.toThrow('Too Many Requests');
    });
  });
});