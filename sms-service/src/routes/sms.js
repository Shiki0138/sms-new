const express = require('express');
const Joi = require('joi');
const SMSService = require('../services/sms-service');
const { 
  authenticateApiKey, 
  checkQuota, 
  createRateLimiter, 
  validateProviderAccess 
} = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const sendSMSSchema = Joi.object({
  to: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +1234567890)'
    }),
  body: Joi.string().min(1).max(1600).required(),
  from: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).optional(),
  provider: Joi.string().valid('twilio', 'aws-sns').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  scheduledAt: Joi.date().iso().min('now').optional(),
  options: Joi.object().optional()
});

const bulkSMSSchema = Joi.object({
  messages: Joi.array().items(
    Joi.object({
      to: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
      body: Joi.string().min(1).max(1600).required(),
      from: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).optional()
    })
  ).min(1).max(1000).required(),
  provider: Joi.string().valid('twilio', 'aws-sns').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  batchSize: Joi.number().integer().min(1).max(100).default(50),
  delay: Joi.number().integer().min(0).max(10000).default(1000),
  scheduledAt: Joi.date().iso().min('now').optional(),
  options: Joi.object().optional()
});

// Initialize SMS service
const smsService = new SMSService();

/**
 * @route POST /api/sms/send
 * @desc Send a single SMS message  
 * @access Private (API Key required)
 */
router.post('/send', 
  authenticateApiKey,
  createRateLimiter,
  validateProviderAccess,
  checkQuota(1),
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = sendSMSSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const { to, body, from, provider, priority, scheduledAt, options } = value;
      const tenant = req.tenant;

      // Check if service is initialized
      if (!smsService.initialized) {
        await smsService.initialize();
      }

      // Send SMS
      const result = await smsService.sendSMS({
        to,
        body,
        from,
        tenantId: tenant.id,
        providerName: provider,
        priority,
        scheduledAt,
        options
      });

      res.json({
        success: true,
        ...result,
        tenant: {
          id: tenant.id,
          plan: tenant.plan
        },
        quota: req.quota
      });

    } catch (error) {
      console.error('Send SMS error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send SMS',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/sms/bulk
 * @desc Send bulk SMS messages
 * @access Private (API Key required)
 */
router.post('/bulk',
  authenticateApiKey,
  createRateLimiter,
  validateProviderAccess,
  async (req, res) => {
    try {
      // Validate request body
      const { error, value } = bulkSMSSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details[0].message
        });
      }

      const { messages, provider, priority, batchSize, delay, scheduledAt, options } = value;
      const tenant = req.tenant;

      // Check quota for bulk messages
      const messageCount = messages.length;
      const quotaResult = await require('../services/tenant-service')
        .tenantService.checkAndUpdateUsage(tenant.id, messageCount);
      
      if (!quotaResult.success) {
        return res.status(429).json({
          success: false,
          error: quotaResult.error,
          code: 'QUOTA_EXCEEDED',
          quota: quotaResult.quota
        });
      }

      // Check bulk size limit
      if (messageCount > tenant.quotas.bulkSizeLimit) {
        return res.status(400).json({
          success: false,
          error: `Bulk size limit exceeded. Maximum: ${tenant.quotas.bulkSizeLimit}`,
          code: 'BULK_SIZE_EXCEEDED',
          limit: tenant.quotas.bulkSizeLimit,
          requested: messageCount
        });
      }

      // Check if service is initialized
      if (!smsService.initialized) {
        await smsService.initialize();
      }

      // Send bulk SMS
      const result = await smsService.sendBulkSMS({
        messages,
        tenantId: tenant.id,
        providerName: provider,
        batchSize,
        delay,
        priority,
        scheduledAt,
        options
      });

      res.json({
        success: true,
        ...result,
        tenant: {
          id: tenant.id,
          plan: tenant.plan
        },
        quota: quotaResult.quota
      });

    } catch (error) {
      console.error('Bulk SMS error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send bulk SMS',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/sms/status/:jobId
 * @desc Get SMS job status
 * @access Private (API Key required)
 */
router.get('/status/:jobId',
  authenticateApiKey,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { queue = 'sms' } = req.query;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
      }

      const status = await smsService.getJobStatus(jobId, queue);
      
      res.json({
        success: true,
        jobId,
        ...status
      });

    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/sms/quota
 * @desc Get tenant quota information
 * @access Private (API Key required)
 */
router.get('/quota',
  authenticateApiKey,
  async (req, res) => {
    try {
      const tenant = req.tenant;
      const usage = await require('../services/tenant-service')
        .tenantService.getTenantUsage(tenant.id);

      res.json({
        success: true,
        ...usage
      });

    } catch (error) {
      console.error('Get quota error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quota information',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/sms/providers
 * @desc Get available providers for tenant
 * @access Private (API Key required)
 */
router.get('/providers',
  authenticateApiKey,
  async (req, res) => {
    try {
      const tenant = req.tenant;
      const { providerFactory } = require('../providers/provider-factory');
      
      const providersStats = await providerFactory.getProvidersStats();
      const allowedProviders = tenant.quotas.providerOptions;

      // Filter providers based on tenant's allowed providers
      const filteredProviders = {};
      for (const [name, stats] of Object.entries(providersStats.providers)) {
        if (allowedProviders.includes(name)) {
          filteredProviders[name] = stats;
        }
      }

      res.json({
        success: true,
        allowedProviders,
        providers: filteredProviders,
        defaultProvider: providersStats.defaultProvider
      });

    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get provider information',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/sms/webhook/:provider
 * @desc Handle provider webhooks
 * @access Public (provider webhooks)
 */
router.post('/webhook/:provider',
  async (req, res) => {
    try {
      const { provider } = req.params;
      const payload = req.body;

      const { providerFactory } = require('../providers/provider-factory');
      const providerInstance = providerFactory.getProvider(provider);

      if (!providerInstance) {
        return res.status(404).json({
          success: false,
          error: `Provider ${provider} not found`
        });
      }

      const webhookData = await providerInstance.handleWebhook(payload);
      
      // Here you could store webhook data, update message status, etc.
      console.log(`Webhook received from ${provider}:`, webhookData);

      res.json({
        success: true,
        message: 'Webhook processed',
        data: webhookData
      });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        details: error.message
      });
    }
  }
);

module.exports = router;