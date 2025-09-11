const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cron = require('node-cron');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Channel configuration store
let channelConfigs = {
  line: {
    enabled: false,
    accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    webhookUrl: process.env.LINE_WEBHOOK_URL
  },
  instagram: {
    enabled: false,
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN,
    webhookUrl: process.env.INSTAGRAM_WEBHOOK_URL
  },
  sms: {
    enabled: true,
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  email: {
    enabled: true,
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@votan-salon.com'
  }
};

// Message queue for processing
let messageQueue = [];
let scheduledMessages = [];
let messageTemplates = [];

/**
 * Multi-Channel Message API Implementation
 */

// Get all channels configuration
router.get('/channels', async (req, res) => {
  try {
    const channels = Object.entries(channelConfigs).map(([id, config]) => ({
      id,
      name: id.toUpperCase(),
      enabled: config.enabled,
      configured: Boolean(config.accessToken || config.accountSid || config.apiKey),
      capabilities: getChannelCapabilities(id)
    }));

    res.json({
      success: true,
      channels,
      total: channels.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update channel configuration
router.put('/channels/:channelId', [
  body('enabled').isBoolean(),
  body('config').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { channelId } = req.params;
    const { enabled, config } = req.body;

    if (!channelConfigs[channelId]) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Update configuration
    channelConfigs[channelId] = {
      ...channelConfigs[channelId],
      enabled,
      ...config
    };

    res.json({
      success: true,
      channel: {
        id: channelId,
        enabled: channelConfigs[channelId].enabled,
        configured: Boolean(channelConfigs[channelId].accessToken || channelConfigs[channelId].accountSid)
      },
      message: 'Channel configuration updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// LINE Webhook Handler
router.post('/webhooks/line', async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);
    
    // Verify LINE signature
    if (!verifyLineSignature(body, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const events = req.body.events;
    
    for (const event of events) {
      await processLineEvent(event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('LINE webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Instagram Webhook Handler
router.post('/webhooks/instagram', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const body = JSON.stringify(req.body);
    
    // Verify Instagram signature
    if (!verifyInstagramSignature(body, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { entry } = req.body;
    
    for (const entryItem of entry) {
      if (entryItem.messaging) {
        for (const messaging of entryItem.messaging) {
          await processInstagramEvent(messaging);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Instagram webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Instagram Webhook Verification
router.get('/webhooks/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === channelConfigs.instagram.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Send multi-channel message
router.post('/send', upload.array('attachments', 5), [
  body('recipients').isArray().notEmpty(),
  body('message').notEmpty(),
  body('channels').isArray().notEmpty(),
  body('messageType').isIn(['text', 'image', 'template']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { recipients, message, channels, messageType = 'text', templateId, scheduleTime } = req.body;
    const attachments = req.files || [];

    // Process attachments
    const processedAttachments = [];
    for (const file of attachments) {
      const processedFile = await processImageAttachment(file);
      processedAttachments.push(processedFile);
    }

    const messageData = {
      id: uuidv4(),
      recipients: JSON.parse(recipients),
      message,
      channels: JSON.parse(channels),
      messageType,
      templateId,
      attachments: processedAttachments,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : null,
      status: scheduleTime ? 'scheduled' : 'pending',
      createdAt: new Date(),
      createdBy: req.user?.userId || 'system'
    };

    if (scheduleTime) {
      // Add to scheduled messages
      scheduledMessages.push(messageData);
      scheduleMessage(messageData);
    } else {
      // Send immediately
      await sendMultiChannelMessage(messageData);
    }

    res.json({
      success: true,
      messageId: messageData.id,
      status: messageData.status,
      recipientCount: messageData.recipients.length,
      channelCount: messageData.channels.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get message history
router.get('/messages', async (req, res) => {
  try {
    const { customerId, channel, status, limit = 50, offset = 0 } = req.query;
    
    // This would typically query Firebase/database
    let messages = messageQueue.concat(scheduledMessages);
    
    // Apply filters
    if (customerId) {
      messages = messages.filter(msg => 
        msg.recipients.some(r => r.customerId === parseInt(customerId))
      );
    }
    
    if (channel) {
      messages = messages.filter(msg => msg.channels.includes(channel));
    }
    
    if (status) {
      messages = messages.filter(msg => msg.status === status);
    }
    
    // Pagination
    const total = messages.length;
    messages = messages.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Message templates management
router.get('/templates', async (req, res) => {
  try {
    const { category, language } = req.query;
    
    let templates = [...messageTemplates];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    if (language) {
      templates = templates.filter(t => t.language === language);
    }
    
    res.json({
      success: true,
      templates,
      total: templates.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/templates', [
  body('name').notEmpty(),
  body('content').notEmpty(),
  body('category').isIn(['appointment', 'reminder', 'promotion', 'greeting', 'followup']),
  body('language').isIn(['ja', 'en']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, content, category, language = 'ja', variables = [] } = req.body;
    
    const template = {
      id: uuidv4(),
      name,
      content,
      category,
      language,
      variables,
      createdAt: new Date(),
      createdBy: req.user?.userId || 'system'
    };
    
    messageTemplates.push(template);
    
    res.status(201).json({
      success: true,
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk messaging
router.post('/bulk-send', upload.array('attachments', 5), [
  body('customerIds').isArray().notEmpty(),
  body('message').notEmpty(),
  body('channels').isArray().notEmpty(),
  body('excludeIds').isArray().optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { customerIds, message, channels, excludeIds = [], scheduleTime } = req.body;
    const attachments = req.files || [];

    // Filter out excluded customers
    const filteredCustomerIds = JSON.parse(customerIds).filter(id => 
      !JSON.parse(excludeIds).includes(id)
    );

    // Process attachments
    const processedAttachments = [];
    for (const file of attachments) {
      const processedFile = await processImageAttachment(file);
      processedAttachments.push(processedFile);
    }

    const bulkMessageData = {
      id: uuidv4(),
      customerIds: filteredCustomerIds,
      message,
      channels: JSON.parse(channels),
      excludeIds: JSON.parse(excludeIds),
      attachments: processedAttachments,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : null,
      status: scheduleTime ? 'scheduled' : 'pending',
      createdAt: new Date(),
      createdBy: req.user?.userId || 'system'
    };

    if (scheduleTime) {
      scheduledMessages.push(bulkMessageData);
      scheduleBulkMessage(bulkMessageData);
    } else {
      await sendBulkMessage(bulkMessageData);
    }

    res.json({
      success: true,
      messageId: bulkMessageData.id,
      status: bulkMessageData.status,
      recipientCount: filteredCustomerIds.length,
      excludedCount: JSON.parse(excludeIds).length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Message analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, channel } = req.query;
    
    // Calculate message statistics
    const analytics = {
      totalMessages: messageQueue.length,
      messagesByChannel: getMessagesByChannel(),
      messagesByStatus: getMessagesByStatus(),
      deliveryRates: getDeliveryRates(),
      responseRates: getResponseRates(),
      popularTemplates: getPopularTemplates()
    };
    
    res.json({
      success: true,
      analytics,
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Helper Functions
 */

function getChannelCapabilities(channelId) {
  const capabilities = {
    line: ['text', 'image', 'template', 'quick_reply', 'carousel'],
    instagram: ['text', 'image', 'story'],
    sms: ['text'],
    email: ['text', 'html', 'attachment']
  };
  
  return capabilities[channelId] || ['text'];
}

function verifyLineSignature(body, signature) {
  if (!channelConfigs.line.channelSecret || !signature) return false;
  
  const hash = crypto
    .createHmac('SHA256', channelConfigs.line.channelSecret)
    .update(body)
    .digest('base64');
    
  return signature === hash;
}

function verifyInstagramSignature(body, signature) {
  if (!channelConfigs.instagram.verifyToken || !signature) return false;
  
  const hash = crypto
    .createHmac('sha256', channelConfigs.instagram.verifyToken)
    .update(body)
    .digest('hex');
    
  return signature === `sha256=${hash}`;
}

async function processLineEvent(event) {
  try {
    if (event.type === 'message') {
      const message = {
        id: uuidv4(),
        channel: 'line',
        customerId: event.source.userId,
        message: event.message.text || '[Non-text message]',
        type: 'received',
        timestamp: new Date(event.timestamp),
        status: 'unread',
        messageType: event.message.type,
        originalEvent: event
      };
      
      messageQueue.push(message);
      
      // Auto-reply logic
      await processAutoReply(message);
    }
  } catch (error) {
    console.error('Error processing LINE event:', error);
  }
}

async function processInstagramEvent(messaging) {
  try {
    if (messaging.message) {
      const message = {
        id: uuidv4(),
        channel: 'instagram',
        customerId: messaging.sender.id,
        message: messaging.message.text || '[Media message]',
        type: 'received',
        timestamp: new Date(messaging.timestamp),
        status: 'unread',
        messageType: messaging.message.text ? 'text' : 'media',
        originalEvent: messaging
      };
      
      messageQueue.push(message);
      
      // Auto-reply logic
      await processAutoReply(message);
    }
  } catch (error) {
    console.error('Error processing Instagram event:', error);
  }
}

async function processAutoReply(incomingMessage) {
  try {
    // Simple keyword-based auto-reply
    const keywords = {
      '予約': 'ご予約についてのお問い合わせありがとうございます。お電話またはウェブサイトからご予約いただけます。',
      '営業時間': '営業時間は平日9:00-19:00、土曜日9:00-18:00です。日曜日は定休日となっております。',
      '料金': '料金についてはウェブサイトの料金表をご確認ください。詳細なお見積りもご相談いただけます。',
      'こんにちは': 'こんにちは！VOTAN美容室です。何かお手伝いできることがございましたらお気軽にお声がけください。'
    };
    
    const messageText = incomingMessage.message.toLowerCase();
    
    for (const [keyword, reply] of Object.entries(keywords)) {
      if (messageText.includes(keyword)) {
        const autoReplyData = {
          recipients: [{ customerId: incomingMessage.customerId }],
          message: reply,
          channels: [incomingMessage.channel],
          messageType: 'text',
          isAutoReply: true
        };
        
        await sendMultiChannelMessage(autoReplyData);
        break;
      }
    }
  } catch (error) {
    console.error('Auto-reply error:', error);
  }
}

async function processImageAttachment(file) {
  try {
    // Resize and optimize image
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate filename
    const filename = `${uuidv4()}.jpg`;
    
    // In a real implementation, upload to Firebase Storage or similar
    return {
      originalName: file.originalname,
      filename,
      size: optimizedBuffer.length,
      mimetype: 'image/jpeg',
      buffer: optimizedBuffer // In production, this would be a URL
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
}

async function sendMultiChannelMessage(messageData) {
  try {
    const results = [];
    
    for (const channel of messageData.channels) {
      if (!channelConfigs[channel]?.enabled) continue;
      
      for (const recipient of messageData.recipients) {
        try {
          let result;
          
          switch (channel) {
            case 'line':
              result = await sendLineMessage(recipient, messageData);
              break;
            case 'instagram':
              result = await sendInstagramMessage(recipient, messageData);
              break;
            case 'sms':
              result = await sendSMSMessage(recipient, messageData);
              break;
            case 'email':
              result = await sendEmailMessage(recipient, messageData);
              break;
          }
          
          results.push({
            channel,
            recipient: recipient.customerId,
            status: 'sent',
            result
          });
        } catch (error) {
          results.push({
            channel,
            recipient: recipient.customerId,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
    
    messageData.status = 'sent';
    messageData.results = results;
    messageData.sentAt = new Date();
    
    return results;
  } catch (error) {
    console.error('Multi-channel send error:', error);
    throw error;
  }
}

async function sendLineMessage(recipient, messageData) {
  // LINE Bot SDK implementation would go here
  return { messageId: `line_${Date.now()}` };
}

async function sendInstagramMessage(recipient, messageData) {
  // Instagram API implementation would go here
  return { messageId: `instagram_${Date.now()}` };
}

async function sendSMSMessage(recipient, messageData) {
  // Twilio SMS implementation would go here
  return { messageId: `sms_${Date.now()}` };
}

async function sendEmailMessage(recipient, messageData) {
  // SendGrid email implementation would go here
  return { messageId: `email_${Date.now()}` };
}

async function sendBulkMessage(bulkMessageData) {
  // Convert bulk message to individual messages
  const recipients = bulkMessageData.customerIds.map(id => ({ customerId: id }));
  
  const messageData = {
    ...bulkMessageData,
    recipients
  };
  
  return await sendMultiChannelMessage(messageData);
}

function scheduleMessage(messageData) {
  const scheduleTime = new Date(messageData.scheduleTime);
  const cronExpression = `${scheduleTime.getMinutes()} ${scheduleTime.getHours()} ${scheduleTime.getDate()} ${scheduleTime.getMonth() + 1} *`;
  
  cron.schedule(cronExpression, async () => {
    try {
      await sendMultiChannelMessage(messageData);
      
      // Remove from scheduled messages
      const index = scheduledMessages.findIndex(m => m.id === messageData.id);
      if (index > -1) {
        scheduledMessages.splice(index, 1);
      }
    } catch (error) {
      console.error('Scheduled message error:', error);
    }
  });
}

function scheduleBulkMessage(bulkMessageData) {
  const scheduleTime = new Date(bulkMessageData.scheduleTime);
  const cronExpression = `${scheduleTime.getMinutes()} ${scheduleTime.getHours()} ${scheduleTime.getDate()} ${scheduleTime.getMonth() + 1} *`;
  
  cron.schedule(cronExpression, async () => {
    try {
      await sendBulkMessage(bulkMessageData);
      
      // Remove from scheduled messages
      const index = scheduledMessages.findIndex(m => m.id === bulkMessageData.id);
      if (index > -1) {
        scheduledMessages.splice(index, 1);
      }
    } catch (error) {
      console.error('Scheduled bulk message error:', error);
    }
  });
}

function getMessagesByChannel() {
  const stats = {};
  messageQueue.forEach(msg => {
    stats[msg.channel] = (stats[msg.channel] || 0) + 1;
  });
  return stats;
}

function getMessagesByStatus() {
  const stats = {};
  messageQueue.forEach(msg => {
    stats[msg.status] = (stats[msg.status] || 0) + 1;
  });
  return stats;
}

function getDeliveryRates() {
  const total = messageQueue.length;
  const delivered = messageQueue.filter(m => m.status === 'delivered').length;
  return total > 0 ? (delivered / total * 100).toFixed(2) : 0;
}

function getResponseRates() {
  // This would be calculated based on conversation flows
  return 15.5; // Mock response rate
}

function getPopularTemplates() {
  // Return most used templates
  return messageTemplates.slice(0, 5);
}

module.exports = router;