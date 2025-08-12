const { jest } = require('@jest/globals');
const SMSService = require('../../src/services/sms-service');

// Mock dependencies
jest.mock('bull');
jest.mock('winston');
jest.mock('../../src/providers/provider-factory');

describe('SMS Service', () => {
  let smsService;
  let mockQueue;
  let mockProviderFactory;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Bull queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn(),
      close: jest.fn()
    };
    
    require('bull').mockReturnValue(mockQueue);
    
    // Mock provider factory
    mockProviderFactory = {
      getProvider: jest.fn(),
      getProvidersStats: jest.fn()
    };
    
    require('../../src/providers/provider-factory').providerFactory = mockProviderFactory;
    
    // Create service instance
    smsService = new SMSService({
      redis: { host: 'localhost', port: 6379 },
      logLevel: 'error' // Reduce log noise in tests
    });
  });

  afterEach(async () => {
    if (smsService.initialized) {
      await smsService.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid config', async () => {
      await smsService.initialize();
      
      expect(smsService.initialized).toBe(true);
      expect(require('bull')).toHaveBeenCalledTimes(2); // SMS queue and bulk queue
    });

    test('should throw error if initialization fails', async () => {
      require('bull').mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      await expect(smsService.initialize()).rejects.toThrow('Redis connection failed');
    });
  });

  describe('Send SMS', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    test('should queue SMS message successfully', async () => {
      const params = {
        to: '+1234567890',
        body: 'Test message',
        tenantId: 'tenant-123'
      };

      const result = await smsService.sendSMS(params);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.objectContaining({
          message: { to: params.to, body: params.body, from: null },
          tenantId: params.tenantId
        }),
        expect.any(Object)
      );
    });

    test('should validate required parameters', async () => {
      const params = {
        to: '+1234567890'
        // Missing body and tenantId
      };

      await expect(smsService.sendSMS(params)).rejects.toThrow(
        'Missing required parameters: to, body, tenantId'
      );
    });

    test('should handle priority setting', async () => {
      const params = {
        to: '+1234567890',
        body: 'Test message',
        tenantId: 'tenant-123',
        priority: 'high'
      };

      await smsService.sendSMS(params);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.any(Object),
        expect.objectContaining({
          priority: 10 // High priority value
        })
      );
    });

    test('should handle scheduled messages', async () => {
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
      const params = {
        to: '+1234567890',
        body: 'Scheduled message',
        tenantId: 'tenant-123',
        scheduledAt
      };

      await smsService.sendSMS(params);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-sms',
        expect.any(Object),
        expect.objectContaining({
          delay: expect.any(Number)
        })
      );
    });
  });

  describe('Send Bulk SMS', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    test('should queue bulk SMS successfully', async () => {
      const params = {
        messages: [
          { to: '+1234567890', body: 'Message 1' },
          { to: '+0987654321', body: 'Message 2' }
        ],
        tenantId: 'tenant-123'
      };

      const result = await smsService.sendBulkSMS(params);

      expect(result.success).toBe(true);
      expect(result.messageCount).toBe(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-bulk-sms',
        expect.objectContaining({
          messages: params.messages,
          tenantId: params.tenantId
        }),
        expect.any(Object)
      );
    });

    test('should validate messages array', async () => {
      const params = {
        messages: [],
        tenantId: 'tenant-123'
      };

      await expect(smsService.sendBulkSMS(params)).rejects.toThrow(
        'Messages array is required and cannot be empty'
      );
    });

    test('should validate message format', async () => {
      const params = {
        messages: [
          { to: '+1234567890' } // Missing body
        ],
        tenantId: 'tenant-123'
      };

      await expect(smsService.sendBulkSMS(params)).rejects.toThrow(
        'Each message must have "to" and "body" properties'
      );
    });
  });

  describe('Job Status', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    test('should return job status when job exists', async () => {
      const mockJob = {
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        returnvalue: { success: true, messageId: 'msg-123' },
        attemptsMade: 1,
        opts: { attempts: 3 },
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now()
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await smsService.getJobStatus('job-123');

      expect(status.success).toBe(true);
      expect(status.jobId).toBe('job-123');
      expect(status.state).toBe('completed');
    });

    test('should handle non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const status = await smsService.getJobStatus('non-existent');

      expect(status.success).toBe(false);
      expect(status.error).toBe('Job not found');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    test('should return service statistics', async () => {
      // Mock queue methods
      mockQueue.getWaiting = jest.fn().mockResolvedValue([]);
      mockQueue.getActive = jest.fn().mockResolvedValue([]);
      mockQueue.getCompleted = jest.fn().mockResolvedValue([]);
      mockQueue.getFailed = jest.fn().mockResolvedValue([]);

      mockProviderFactory.getProvidersStats.mockResolvedValue({
        defaultProvider: 'twilio',
        providers: { twilio: { initialized: true } }
      });

      const stats = await smsService.getStats();

      expect(stats.service).toBeDefined();
      expect(stats.queues).toBeDefined();
      expect(stats.providers).toBeDefined();
      expect(stats.service.initialized).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    test('should convert priority to numeric value', () => {
      expect(smsService.getPriorityValue('low')).toBe(1);
      expect(smsService.getPriorityValue('normal')).toBe(5);
      expect(smsService.getPriorityValue('high')).toBe(10);
      expect(smsService.getPriorityValue('urgent')).toBe(15);
      expect(smsService.getPriorityValue('invalid')).toBe(5); // Default
    });

    test('should estimate processing time', () => {
      const estimate = smsService.getEstimatedProcessingTime();
      expect(typeof estimate).toBe('string');
      expect(estimate).toContain('seconds');
    });

    test('should estimate bulk processing time', () => {
      const estimate = smsService.getEstimatedBulkProcessingTime(100);
      expect(typeof estimate).toBe('string');
      expect(estimate).toContain('minutes');
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await smsService.initialize();
      
      await smsService.shutdown();
      
      expect(mockQueue.close).toHaveBeenCalledTimes(2); // SMS and bulk queues
      expect(smsService.initialized).toBe(false);
    });
  });
});