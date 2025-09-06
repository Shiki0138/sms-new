const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const multiChannelMessagingService = require('../services/multiChannelMessagingService');
const bulkMessagingService = require('../services/bulkMessagingService');
const { Message, MessageConversation, Customer, ChannelConfig, BulkMessageJob } = require('../models');
const { body, query, param, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Initialize messaging service for user
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    await multiChannelMessagingService.initialize(req.user.id);
    res.json({ success: true, message: 'Messaging service initialized' });
  } catch (error) {
    console.error('Failed to initialize messaging service:', error);
    res.status(500).json({ error: 'Failed to initialize messaging service' });
  }
});

// Send message
router.post('/send',
  authenticateToken,
  [
    body('customerId').isUUID(),
    body('channel').isIn(['sms', 'email', 'line', 'instagram']),
    body('content').notEmpty(),
    body('messageType').optional().isIn(['text', 'image', 'video', 'file'])
  ],
  validate,
  async (req, res) => {
    try {
      const { customerId, channel, content, messageType } = req.body;

      const result = await multiChannelMessagingService.sendMessage(
        req.user.id,
        customerId,
        channel,
        content,
        { messageType }
      );

      res.json(result);
    } catch (error) {
      console.error('Failed to send message:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Send to all channels
router.post('/send-all-channels',
  authenticateToken,
  [
    body('customerId').isUUID(),
    body('content').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { customerId, content } = req.body;

      const results = await multiChannelMessagingService.sendToAllChannels(
        req.user.id,
        customerId,
        content
      );

      res.json({ results });
    } catch (error) {
      console.error('Failed to send to all channels:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get conversations
router.get('/conversations',
  authenticateToken,
  [
    query('channel').optional().isIn(['sms', 'email', 'line', 'instagram']),
    query('isArchived').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validate,
  async (req, res) => {
    try {
      const conversations = await multiChannelMessagingService.getConversations(
        req.user.id,
        req.query
      );

      res.json({ conversations });
    } catch (error) {
      console.error('Failed to get conversations:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get conversation messages
router.get('/conversations/:conversationId/messages',
  authenticateToken,
  [
    param('conversationId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validate,
  async (req, res) => {
    try {
      // Verify conversation belongs to user
      const conversation = await MessageConversation.findOne({
        where: { id: req.params.conversationId, userId: req.user.id }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const messages = await multiChannelMessagingService.getConversationMessages(
        req.params.conversationId,
        req.query
      );

      res.json({ messages });
    } catch (error) {
      console.error('Failed to get messages:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Mark messages as read
router.post('/conversations/:conversationId/read',
  authenticateToken,
  [param('conversationId').isUUID()],
  validate,
  async (req, res) => {
    try {
      // Verify conversation belongs to user
      const conversation = await MessageConversation.findOne({
        where: { id: req.params.conversationId, userId: req.user.id }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      await multiChannelMessagingService.markMessagesAsRead(req.params.conversationId);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create bulk message job
router.post('/bulk/create',
  authenticateToken,
  [
    body('name').notEmpty(),
    body('channels').isArray().notEmpty(),
    body('channels.*').isIn(['sms', 'email', 'line', 'instagram']),
    body('recipientFilter').isObject(),
    body('messageContent').isObject(),
    body('scheduledAt').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const job = await bulkMessagingService.createBulkJob(req.user.id, req.body);
      res.json({ job });
    } catch (error) {
      console.error('Failed to create bulk job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Preview bulk message
router.post('/bulk/preview',
  authenticateToken,
  [
    body('channels').isArray().notEmpty(),
    body('recipientFilter').isObject(),
    body('messageContent').isObject(),
    body('sampleSize').optional().isInt({ min: 1, max: 10 }).toInt()
  ],
  validate,
  async (req, res) => {
    try {
      const previews = await bulkMessagingService.previewMessage(
        req.user.id,
        req.body,
        req.body.sampleSize
      );

      res.json({ previews });
    } catch (error) {
      console.error('Failed to preview message:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Start bulk message job
router.post('/bulk/:jobId/start',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  async (req, res) => {
    try {
      // Verify job belongs to user
      const job = await BulkMessageJob.findOne({
        where: { id: req.params.jobId, userId: req.user.id }
      });

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Start processing asynchronously
      bulkMessagingService.processBulkJob(req.params.jobId);

      res.json({ success: true, message: 'Job processing started' });
    } catch (error) {
      console.error('Failed to start bulk job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Cancel bulk message job
router.post('/bulk/:jobId/cancel',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  async (req, res) => {
    try {
      // Verify job belongs to user
      const job = await BulkMessageJob.findOne({
        where: { id: req.params.jobId, userId: req.user.id }
      });

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      await bulkMessagingService.cancelJob(req.params.jobId);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to cancel bulk job:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get bulk job status
router.get('/bulk/:jobId/status',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  async (req, res) => {
    try {
      // Verify job belongs to user
      const job = await BulkMessageJob.findOne({
        where: { id: req.params.jobId, userId: req.user.id }
      });

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const status = await bulkMessagingService.getJobStatus(req.params.jobId);

      res.json(status);
    } catch (error) {
      console.error('Failed to get job status:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get bulk job history
router.get('/bulk/history',
  authenticateToken,
  [
    query('status').optional().isIn(['draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validate,
  async (req, res) => {
    try {
      const jobs = await bulkMessagingService.getJobHistory(req.user.id, req.query);
      res.json({ jobs });
    } catch (error) {
      console.error('Failed to get job history:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Webhook endpoints for receiving messages
router.post('/webhook/sms', async (req, res) => {
  try {
    // Verify webhook signature if configured
    // This would depend on your SMS provider (e.g., Twilio)

    const result = await multiChannelMessagingService.receiveMessage('sms', req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process SMS webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook/email', async (req, res) => {
  try {
    // Verify webhook signature if configured
    // This would depend on your email provider (e.g., SendGrid)

    const result = await multiChannelMessagingService.receiveMessage('email', req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process email webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook/line', async (req, res) => {
  try {
    // Verify LINE webhook signature
    const channelConfig = await ChannelConfig.findOne({
      where: { channel: 'line', isActive: true }
    });

    if (channelConfig && req.headers['x-line-signature']) {
      const isValid = multiChannelMessagingService.verifyWebhookSignature(
        req.body,
        req.headers['x-line-signature'],
        channelConfig.config.channelSecret
      );

      if (!isValid) {
        return res.status(403).json({ error: 'Invalid signature' });
      }
    }

    // Process LINE events
    for (const event of req.body.events) {
      if (event.type === 'message') {
        await multiChannelMessagingService.receiveMessage('line', event);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process LINE webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook/instagram', async (req, res) => {
  try {
    // Verify Instagram webhook signature
    // This would use Facebook's webhook verification

    const result = await multiChannelMessagingService.receiveMessage('instagram', req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process Instagram webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;