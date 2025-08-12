const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const SMSService = require('../../sms-service/src/services/sms-service');
const { authenticateToken, validateTenant } = require('../middleware/auth');

const router = express.Router();

// Initialize SMS service instance
const smsService = new SMSService();

// Rate limiting middleware
const createRateLimit = (limit, windowMs = 15 * 60 * 1000) => 
  rateLimit({
    windowMs,
    max: limit,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Send single SMS
router.post('/send',
  createRateLimit(100), // 100 requests per 15 minutes
  authenticateToken,
  validateTenant,
  [
    body('to').isMobilePhone().withMessage('Valid phone number required'),
    body('body').isLength({ min: 1, max: 1600 }).withMessage('Message body required (max 1600 chars)'),
    body('from').optional().isMobilePhone(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('scheduledAt').optional().isISO8601(),
    body('providerName').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { to, body: messageBody, from, priority, scheduledAt, providerName, options = {} } = req.body;
      
      const result = await smsService.sendSMS({
        to,
        body: messageBody,
        from,
        tenantId: req.tenant.id,
        priority,
        scheduledAt,
        providerName,
        options: {
          ...options,
          userId: req.user.id,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('SMS send error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send SMS',
        message: error.message
      });
    }
  }
);

// Send bulk SMS
router.post('/bulk',
  createRateLimit(10, 15 * 60 * 1000), // 10 bulk requests per 15 minutes
  authenticateToken,
  validateTenant,
  [
    body('messages').isArray({ min: 1, max: 1000 }).withMessage('Messages array required (max 1000)'),
    body('messages.*.to').isMobilePhone(),
    body('messages.*.body').isLength({ min: 1, max: 1600 }),
    body('messages.*.from').optional().isMobilePhone(),
    body('batchSize').optional().isInt({ min: 1, max: 100 }),
    body('delay').optional().isInt({ min: 100, max: 10000 }),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('scheduledAt').optional().isISO8601(),
    body('providerName').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        messages, 
        batchSize = 50, 
        delay = 1000, 
        priority = 'normal',
        scheduledAt,
        providerName,
        options = {}
      } = req.body;

      // Validate individual messages
      for (const message of messages) {
        if (!message.to || !message.body) {
          return res.status(400).json({
            success: false,
            error: 'Each message must have "to" and "body" properties'
          });
        }
      }

      const result = await smsService.sendBulkSMS({
        messages,
        tenantId: req.tenant.id,
        batchSize,
        delay,
        priority,
        scheduledAt,
        providerName,
        options: {
          ...options,
          userId: req.user.id,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Bulk SMS send error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send bulk SMS',
        message: error.message
      });
    }
  }
);

// Get job status
router.get('/status/:jobId',
  createRateLimit(200), // 200 status checks per 15 minutes
  authenticateToken,
  validateTenant,
  [
    param('jobId').isUUID().withMessage('Valid job ID required'),
    query('queueType').optional().isIn(['sms', 'bulk']),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { queueType = 'sms' } = req.query;

      const result = await smsService.getJobStatus(jobId, queueType);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        message: error.message
      });
    }
  }
);

// Get SMS analytics
router.get('/analytics',
  createRateLimit(50), // 50 analytics requests per 15 minutes
  authenticateToken,
  validateTenant,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('provider').optional().isString(),
    query('status').optional().isIn(['sent', 'failed', 'pending']),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, provider, status } = req.query;
      
      // TODO: Implement analytics service
      const analytics = {
        period: {
          start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        },
        summary: {
          totalSent: 0,
          totalFailed: 0,
          totalQueued: 0,
          averageDeliveryTime: 0
        },
        providers: {},
        hourlyBreakdown: []
      };

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics',
        message: error.message
      });
    }
  }
);

// Get service statistics
router.get('/stats',
  createRateLimit(100), // 100 stats requests per 15 minutes
  authenticateToken,
  async (req, res) => {
    try {
      const stats = await smsService.getStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        message: error.message
      });
    }
  }
);

// Webhook endpoint for delivery status updates
router.post('/webhook/:provider',
  createRateLimit(1000), // 1000 webhook calls per 15 minutes
  [
    param('provider').isIn(['twilio', 'aws-sns']).withMessage('Supported provider required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const webhookData = req.body;
      
      // TODO: Implement webhook processing
      console.log(`Received webhook from ${provider}:`, webhookData);
      
      // Verify webhook signature based on provider
      // Process delivery status update
      // Update job status and analytics
      
      res.status(200).json({
        success: true,
        message: 'Webhook processed'
      });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  }
);

// Health check endpoint
router.get('/health',
  async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SMS API',
        version: '1.0.0',
        uptime: process.uptime(),
        dependencies: {
          redis: 'unknown',
          providers: 'unknown'
        }
      };

      // TODO: Add actual health checks for dependencies
      
      res.status(200).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;