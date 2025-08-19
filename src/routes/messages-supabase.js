const express = require('express');
const router = express.Router();
const { messageService, customerService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { validateMessageSend } = require('../middleware/validation');

/**
 * @route   GET /api/messages
 * @desc    Get messages with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { 
      customerId, 
      channelType, 
      direction,
      unreadOnly,
      page = 1, 
      limit = 50 
    } = req.query;

    const options = {
      tenantId: req.user.tenantId,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      orderBy: 'created_at',
      orderDirection: 'desc',
      filters: {}
    };

    if (customerId) {
      options.filters.customer_id = customerId;
    }
    if (channelType) {
      options.filters.channel_type = channelType;
    }
    if (direction) {
      options.filters.direction = direction;
    }
    if (unreadOnly === 'true') {
      options.filters.read_at = null;
      options.filters.direction = 'received';
    }

    const result = await messageService.findAll(options);

    res.json({
      data: result.data,
      total: result.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(result.count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * @route   GET /api/messages/conversation/:customerId
 * @desc    Get conversation with specific customer
 * @access  Private
 */
router.get('/conversation/:customerId', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const messages = await messageService.getConversation(
      req.params.customerId,
      req.user.tenantId,
      { limit: parseInt(limit) }
    );

    // Get customer info
    const customer = await customerService.findById(req.params.customerId, {
      tenantId: req.user.tenantId
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone_number: customer.phone_number,
        email: customer.email,
        preferred_contact_method: customer.preferred_contact_method
      },
      messages: messages.data
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * @route   POST /api/messages
 * @desc    Send a message
 * @access  Private
 */
router.post('/', validateMessageSend, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, channelType, content, mediaUrls } = req.body;

    // Verify customer exists and belongs to tenant
    const customer = await customerService.findById(customerId, {
      tenantId: req.user.tenantId
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer has this channel configured
    const channels = await customerService.getAvailableChannels(customerId);
    if (!channels[channelType]) {
      return res.status(400).json({ 
        error: `Customer does not have ${channelType} configured` 
      });
    }

    // Create message
    const messageData = {
      tenant_id: req.user.tenantId,
      customer_id: customerId,
      channel_type: channelType,
      content,
      media_urls: mediaUrls,
      metadata: {
        sent_by: req.user.id,
        sent_by_name: req.user.fullName
      }
    };

    const message = await messageService.sendMessage(messageData);

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @route   POST /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.post('/:id/read', async (req, res) => {
  try {
    const message = await messageService.markAsRead(req.params.id);

    res.json({
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

/**
 * @route   POST /api/messages/mark-read
 * @desc    Mark multiple messages as read
 * @access  Private
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Message IDs must be an array' });
    }

    await messageService.markManyAsRead(messageIds);

    res.json({
      message: `${messageIds.length} messages marked as read`
    });
  } catch (error) {
    console.error('Mark many as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

/**
 * @route   GET /api/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { customerId } = req.query;

    const count = await messageService.getUnreadCount(
      req.user.tenantId,
      customerId
    );

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * @route   GET /api/messages/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ 
        error: 'Search term must be at least 2 characters' 
      });
    }

    const messages = await messageService.search(
      q,
      req.user.tenantId,
      { limit: parseInt(limit) }
    );

    res.json(messages);
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

/**
 * @route   GET /api/messages/bulk
 * @desc    Get bulk message campaigns
 * @access  Private
 */
router.get('/bulk', async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;

    const options = {};
    if (status) {
      options.status = status;
    }
    if (limit) {
      options.limit = parseInt(limit);
    }

    const bulkMessages = await messageService.getBulkMessages(
      req.user.tenantId,
      options
    );

    res.json(bulkMessages);
  } catch (error) {
    console.error('Get bulk messages error:', error);
    res.status(500).json({ error: 'Failed to fetch bulk messages' });
  }
});

/**
 * @route   POST /api/messages/bulk
 * @desc    Create bulk message campaign
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { 
      title, 
      content, 
      customerSegments, 
      channelPriority,
      scheduledAt 
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        error: 'Title and content are required' 
      });
    }

    // Get customers based on segments
    const customers = await customerService.getSegment(
      customerSegments || {},
      req.user.tenantId
    );

    const bulkMessageData = {
      tenant_id: req.user.tenantId,
      title,
      content,
      customer_segments: customerSegments || {},
      channel_priority: channelPriority || ['line', 'instagram', 'email'],
      total_recipients: customers.length,
      scheduled_at: scheduledAt || null,
      status: scheduledAt ? 'scheduled' : 'draft'
    };

    const bulkMessage = await messageService.createBulkMessage(bulkMessageData);

    res.status(201).json({
      message: 'Bulk message campaign created',
      data: bulkMessage,
      recipients: customers.length
    });
  } catch (error) {
    console.error('Create bulk message error:', error);
    res.status(500).json({ error: 'Failed to create bulk message' });
  }
});

/**
 * @route   POST /api/messages/bulk/:id/send
 * @desc    Send bulk message campaign
 * @access  Private
 */
router.post('/bulk/:id/send', async (req, res) => {
  try {
    // Update status to sending
    await messageService.updateBulkMessage(req.params.id, {
      status: 'sending',
      sent_at: new Date().toISOString()
    });

    // TODO: Implement actual sending logic with message queue
    // For now, just update status to completed
    setTimeout(async () => {
      await messageService.updateBulkMessage(req.params.id, {
        status: 'completed'
      });
    }, 5000);

    res.json({
      message: 'Bulk message campaign started',
      status: 'sending'
    });
  } catch (error) {
    console.error('Send bulk message error:', error);
    res.status(500).json({ error: 'Failed to send bulk message' });
  }
});

/**
 * @route   GET /api/messages/stats
 * @desc    Get messaging statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const stats = await messageService.getStatistics(
      req.user.tenantId,
      period
    );

    res.json(stats);
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({ error: 'Failed to fetch message statistics' });
  }
});

/**
 * @route   GET /api/messages/templates
 * @desc    Get message templates
 * @access  Private
 */
router.get('/templates', async (req, res) => {
  try {
    // TODO: Implement message templates
    const templates = [
      {
        id: '1',
        name: 'Appointment Reminder',
        content: 'Hello {{customer_name}}, this is a reminder for your appointment on {{date}} at {{time}}.',
        variables: ['customer_name', 'date', 'time']
      },
      {
        id: '2',
        name: 'Thank You',
        content: 'Thank you {{customer_name}} for visiting us today! We hope to see you again soon.',
        variables: ['customer_name']
      },
      {
        id: '3',
        name: 'Birthday Greeting',
        content: 'Happy Birthday {{customer_name}}! 🎉 Enjoy a special 20% discount on your next visit.',
        variables: ['customer_name']
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

module.exports = router;