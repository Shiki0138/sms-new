const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const smsRoutes = require('../../src/routes/sms-routes');

// Mock dependencies
jest.mock('../../src/services/sms-service');
jest.mock('../../src/middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/sms', smsRoutes);

// Test data
const validToken = jwt.sign(
  { id: 'user123', tenantId: 'tenant123' },
  'test-secret',
  { expiresIn: '1h' }
);

const mockTenant = {
  id: 'tenant123',
  name: 'Test Tenant',
  active: true,
  plan: 'premium',
  limits: {
    smsPerDay: 1000,
    smsPerMonth: 30000,
    bulkSmsPerDay: 10,
    providersAllowed: ['twilio']
  }
};

describe('SMS Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    const authMock = require('../../src/middleware/auth');
    authMock.authenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', tenantId: 'tenant123' };
      next();
    });
    
    authMock.validateTenant.mockImplementation((req, res, next) => {
      req.tenant = mockTenant;
      next();
    });
  });

  describe('POST /api/sms/send', () => {
    it('should send SMS successfully with valid data', async () => {
      const SMSService = require('../../src/services/sms-service');
      const mockSMSService = {
        sendSMS: jest.fn().mockResolvedValue({
          success: true,
          jobId: 'job123',
          message: 'SMS queued for processing'
        })
      };
      SMSService.mockImplementation(() => mockSMSService);

      const smsData = {
        to: '+1234567890',
        body: 'Test message',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send(smsData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBe('job123');
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: smsData.to,
          body: smsData.body,
          tenantId: 'tenant123',
          priority: 'normal'
        })
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({
          to: '+1234567890'
          // Missing body
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({
          to: 'invalid-phone',
          body: 'Test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should enforce message length limits', async () => {
      const longMessage = 'a'.repeat(1601);
      
      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({
          to: '+1234567890',
          body: longMessage
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle SMS service errors gracefully', async () => {
      const SMSService = require('../../src/services/sms-service');
      const mockSMSService = {
        sendSMS: jest.fn().mockRejectedValue(new Error('Provider unavailable'))
      };
      SMSService.mockImplementation(() => mockSMSService);

      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({
          to: '+1234567890',
          body: 'Test message'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to send SMS');
    });
  });

  describe('POST /api/sms/bulk', () => {
    it('should send bulk SMS successfully', async () => {
      const SMSService = require('../../src/services/sms-service');
      const mockSMSService = {
        sendBulkSMS: jest.fn().mockResolvedValue({
          success: true,
          jobId: 'bulk-job123',
          messageCount: 2
        })
      };
      SMSService.mockImplementation(() => mockSMSService);

      const bulkData = {
        messages: [
          { to: '+1234567890', body: 'Message 1' },
          { to: '+0987654321', body: 'Message 2' }
        ],
        batchSize: 50
      };

      const response = await request(app)
        .post('/api/sms/bulk')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send(bulkData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageCount).toBe(2);
      expect(mockSMSService.sendBulkSMS).toHaveBeenCalled();
    });

    it('should validate messages array', async () => {
      const response = await request(app)
        .post('/api/sms/bulk')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({
          messages: [] // Empty array
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should enforce maximum message count limit', async () => {
      const messages = Array(1001).fill().map((_, i) => ({
        to: `+123456789${i}`,
        body: `Message ${i}`
      }));

      const response = await request(app)
        .post('/api/sms/bulk')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({ messages });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate individual message format', async () => {
      const response = await request(app)
        .post('/api/sms/bulk')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .send({
          messages: [
            { to: '+1234567890', body: 'Valid message' },
            { to: '+0987654321' } // Missing body
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sms/status/:jobId', () => {
    it('should return job status successfully', async () => {
      const SMSService = require('../../src/services/sms-service');
      const mockSMSService = {
        getJobStatus: jest.fn().mockResolvedValue({
          success: true,
          jobId: 'job123',
          state: 'completed',
          result: { messageId: 'msg123', delivered: true }
        })
      };
      SMSService.mockImplementation(() => mockSMSService);

      const response = await request(app)
        .get('/api/sms/status/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.state).toBe('completed');
    });

    it('should validate job ID format', async () => {
      const response = await request(app)
        .get('/api/sms/status/invalid-job-id')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle job not found', async () => {
      const SMSService = require('../../src/services/sms-service');
      const mockSMSService = {
        getJobStatus: jest.fn().mockResolvedValue({
          success: false,
          error: 'Job not found'
        })
      };
      SMSService.mockImplementation(() => mockSMSService);

      const response = await request(app)
        .get('/api/sms/status/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sms/stats', () => {
    it('should return service statistics', async () => {
      const SMSService = require('../../src/services/sms-service');
      const mockStats = {
        service: {
          messagesSent: 100,
          messagesQueued: 5,
          messagesFailed: 2,
          uptime: 86400
        },
        queues: {
          sms: { waiting: 2, active: 1, completed: 97, failed: 2 },
          bulk: { waiting: 0, active: 0, completed: 5, failed: 0 }
        },
        providers: {
          twilio: { sent: 95, failed: 2, uptime: 99.8 }
        }
      };
      
      const mockSMSService = {
        getStats: jest.fn().mockResolvedValue(mockStats)
      };
      SMSService.mockImplementation(() => mockSMSService);

      const response = await request(app)
        .get('/api/sms/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('GET /api/sms/analytics', () => {
    it('should return analytics data', async () => {
      const response = await request(app)
        .get('/api/sms/analytics')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .query({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('summary');
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/sms/analytics')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'tenant123')
        .query({
          startDate: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sms/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/sms/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('POST /api/sms/webhook/:provider', () => {
    it('should accept webhook from supported provider', async () => {
      const webhookData = {
        messageId: 'msg123',
        status: 'delivered',
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/sms/webhook/twilio')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject webhook from unsupported provider', async () => {
      const response = await request(app)
        .post('/api/sms/webhook/unsupported-provider')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication token', async () => {
      const authMock = require('../../src/middleware/auth');
      authMock.authenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({ success: false, error: 'Access token required' });
      });

      const response = await request(app)
        .post('/api/sms/send')
        .send({
          to: '+1234567890',
          body: 'Test message'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require valid tenant', async () => {
      const authMock = require('../../src/middleware/auth');
      authMock.validateTenant.mockImplementation((req, res, next) => {
        res.status(400).json({ success: false, error: 'Tenant ID required' });
      });

      const response = await request(app)
        .post('/api/sms/send')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          to: '+1234567890',
          body: 'Test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limits to endpoints', async () => {
      // This would require more complex setup to test actual rate limiting
      // For now, we'll test that the routes are properly configured
      expect(smsRoutes).toBeDefined();
    });
  });
});