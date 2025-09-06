const { Message, MessageConversation, Customer, ChannelConfig } = require('../models');
const smsService = require('./smsService');
const crypto = require('crypto');

class MultiChannelMessagingService {
  constructor() {
    this.providers = {
      sms: null,
      email: null,
      line: null,
      instagram: null
    };
    this.initialized = false;
  }

  // Initialize channel providers based on configurations
  async initialize(userId) {
    try {
      const configs = await ChannelConfig.findAll({
        where: { userId, isActive: true }
      });

      for (const config of configs) {
        await this.initializeProvider(config);
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize messaging service:', error);
      throw error;
    }
  }

  // Initialize specific channel provider
  async initializeProvider(config) {
    const { channel, provider, config: providerConfig } = config;

    switch (channel) {
      case 'sms':
        if (provider === 'twilio') {
          // Use existing SMS service or initialize new one
          this.providers.sms = smsService;
        }
        break;

      case 'email':
        if (provider === 'sendgrid') {
          // Initialize SendGrid
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(providerConfig.apiKey);
          this.providers.email = sgMail;
        }
        break;

      case 'line':
        if (provider === 'line-api') {
          // Initialize LINE SDK
          const line = require('@line/bot-sdk');
          const client = new line.Client({
            channelAccessToken: providerConfig.channelAccessToken,
            channelSecret: providerConfig.channelSecret
          });
          this.providers.line = client;
        }
        break;

      case 'instagram':
        if (provider === 'instagram-api') {
          // Initialize Instagram Messaging API
          // This would require Facebook Business SDK
          // Placeholder for now
          this.providers.instagram = {
            accessToken: providerConfig.accessToken,
            businessAccountId: providerConfig.businessAccountId
          };
        }
        break;
    }
  }

  // Send message through specified channel
  async sendMessage(userId, customerId, channel, content, options = {}) {
    try {
      // Get customer details
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(userId, customerId, channel);

      // Determine channel identifier
      const channelIdentifier = this.getChannelIdentifier(customer, channel);
      if (!channelIdentifier) {
        throw new Error(`No ${channel} identifier found for customer`);
      }

      // Send through appropriate channel
      let result;
      switch (channel) {
        case 'sms':
          result = await this.sendSMS(channelIdentifier, content, options);
          break;
        case 'email':
          result = await this.sendEmail(channelIdentifier, content, options);
          break;
        case 'line':
          result = await this.sendLINE(channelIdentifier, content, options);
          break;
        case 'instagram':
          result = await this.sendInstagram(channelIdentifier, content, options);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      // Create message record
      const message = await Message.create({
        userId,
        customerId,
        conversationId: conversation.id,
        channel,
        channelUserId: channelIdentifier,
        direction: 'outbound',
        messageType: options.messageType || 'text',
        content: typeof content === 'object' ? content.text || content.message : content,
        emailSubject: channel === 'email' ? content.subject : null,
        status: result.success ? 'sent' : 'failed',
        externalMessageId: result.messageId || null,
        metadata: result.metadata || {},
        error: result.error || null
      });

      // Update conversation
      await conversation.update({
        lastMessageAt: new Date(),
        lastMessagePreview: message.content.substring(0, 100)
      });

      // Update customer last contacted info
      await customer.update({
        lastContactedAt: new Date(),
        lastContactedChannel: channel
      });

      return {
        success: true,
        messageId: message.id,
        externalMessageId: result.messageId,
        conversation: conversation.id
      };
    } catch (error) {
      console.error(`Failed to send ${channel} message:`, error);
      throw error;
    }
  }

  // Send SMS message
  async sendSMS(phoneNumber, content, options = {}) {
    try {
      if (!this.providers.sms) {
        throw new Error('SMS provider not configured');
      }

      const result = await this.providers.sms.sendSMS(phoneNumber, content, options);
      return {
        success: true,
        messageId: result.messageId,
        metadata: { twilioStatus: result.status }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send Email message
  async sendEmail(email, content, options = {}) {
    try {
      if (!this.providers.email) {
        throw new Error('Email provider not configured');
      }

      const msg = {
        to: email,
        from: options.fromEmail || process.env.DEFAULT_FROM_EMAIL,
        subject: content.subject || 'Message from Salon',
        text: content.text || content,
        html: content.html || `<p>${content.text || content}</p>`
      };

      const result = await this.providers.email.send(msg);
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        metadata: { sendgridMessageId: result[0].headers['x-message-id'] }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send LINE message
  async sendLINE(lineUserId, content, options = {}) {
    try {
      if (!this.providers.line) {
        throw new Error('LINE provider not configured');
      }

      const message = {
        type: options.messageType || 'text',
        text: typeof content === 'object' ? content.text : content
      };

      if (options.imageUrl) {
        message.type = 'image';
        message.originalContentUrl = options.imageUrl;
        message.previewImageUrl = options.thumbnailUrl || options.imageUrl;
      }

      const result = await this.providers.line.pushMessage(lineUserId, message);
      return {
        success: true,
        messageId: `line_${Date.now()}`,
        metadata: { lineRequestId: result['x-line-request-id'] }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send Instagram message
  async sendInstagram(instagramUserId, content, options = {}) {
    try {
      if (!this.providers.instagram) {
        throw new Error('Instagram provider not configured');
      }

      // Instagram Messaging API implementation would go here
      // This is a placeholder as it requires Facebook Business SDK setup
      return {
        success: false,
        error: 'Instagram messaging not yet implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send message to all configured channels for a customer
  async sendToAllChannels(userId, customerId, content, options = {}) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const results = [];
    const channels = ['sms', 'email', 'line', 'instagram'];

    for (const channel of channels) {
      // Check if customer has this channel enabled and has identifier
      if (customer.channelPreferences[channel] && this.getChannelIdentifier(customer, channel)) {
        try {
          const result = await this.sendMessage(userId, customerId, channel, content, options);
          results.push({ channel, ...result });
        } catch (error) {
          results.push({ channel, success: false, error: error.message });
        }
      }
    }

    return results;
  }

  // Get or create conversation
  async getOrCreateConversation(userId, customerId, channel) {
    const customer = await Customer.findByPk(customerId);
    const channelIdentifier = this.getChannelIdentifier(customer, channel);

    let conversation = await MessageConversation.findOne({
      where: { userId, customerId, channel }
    });

    if (!conversation) {
      conversation = await MessageConversation.create({
        userId,
        customerId,
        channel,
        channelIdentifier,
        title: `${customer.firstName} ${customer.lastName} - ${channel.toUpperCase()}`
      });
    }

    return conversation;
  }

  // Get channel identifier for customer
  getChannelIdentifier(customer, channel) {
    switch (channel) {
      case 'sms':
        return customer.phoneNumber;
      case 'email':
        return customer.email;
      case 'line':
        return customer.lineUserId;
      case 'instagram':
        return customer.instagramUserId;
      default:
        return null;
    }
  }

  // Receive inbound message
  async receiveMessage(channel, data) {
    try {
      // Parse channel-specific data
      const parsedData = await this.parseInboundMessage(channel, data);

      // Find or create customer
      const customer = await this.findOrCreateCustomerFromMessage(channel, parsedData);

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        customer.userId,
        customer.id,
        channel
      );

      // Create message record
      const message = await Message.create({
        userId: customer.userId,
        customerId: customer.id,
        conversationId: conversation.id,
        channel,
        channelUserId: parsedData.channelUserId,
        direction: 'inbound',
        messageType: parsedData.messageType || 'text',
        content: parsedData.content,
        mediaUrl: parsedData.mediaUrl,
        externalMessageId: parsedData.externalMessageId,
        metadata: parsedData.metadata || {}
      });

      // Update conversation
      await conversation.update({
        lastMessageAt: new Date(),
        lastMessagePreview: message.content.substring(0, 100),
        unreadCount: conversation.unreadCount + 1
      });

      return {
        success: true,
        messageId: message.id,
        conversationId: conversation.id,
        customerId: customer.id
      };
    } catch (error) {
      console.error(`Failed to receive ${channel} message:`, error);
      throw error;
    }
  }

  // Parse inbound message based on channel
  async parseInboundMessage(channel, data) {
    switch (channel) {
      case 'sms':
        return {
          channelUserId: data.From,
          content: data.Body,
          externalMessageId: data.MessageSid,
          metadata: {
            fromCity: data.FromCity,
            fromCountry: data.FromCountry
          }
        };

      case 'email':
        return {
          channelUserId: data.from,
          content: data.text || data.html,
          externalMessageId: data.messageId,
          metadata: {
            subject: data.subject,
            attachments: data.attachments?.length || 0
          }
        };

      case 'line':
        return {
          channelUserId: data.source.userId,
          content: data.message.text,
          messageType: data.message.type,
          externalMessageId: data.message.id,
          mediaUrl: data.message.type === 'image' ? `line://message/${data.message.id}` : null,
          metadata: {
            replyToken: data.replyToken
          }
        };

      case 'instagram':
        return {
          channelUserId: data.sender.id,
          content: data.message.text,
          externalMessageId: data.message.mid,
          mediaUrl: data.message.attachments?.[0]?.payload?.url,
          metadata: {
            isStory: data.message.is_story || false
          }
        };

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  // Find or create customer from message
  async findOrCreateCustomerFromMessage(channel, parsedData) {
    let customer;

    switch (channel) {
      case 'sms':
        customer = await Customer.findOne({
          where: { phoneNumber: parsedData.channelUserId }
        });
        break;

      case 'email':
        customer = await Customer.findOne({
          where: { email: parsedData.channelUserId }
        });
        break;

      case 'line':
        customer = await Customer.findOne({
          where: { lineUserId: parsedData.channelUserId }
        });
        break;

      case 'instagram':
        customer = await Customer.findOne({
          where: { instagramUserId: parsedData.channelUserId }
        });
        break;
    }

    if (!customer) {
      // Create new customer with minimal info
      // In production, you might want to enrich this with API calls
      customer = await Customer.create({
        userId: process.env.DEFAULT_USER_ID, // You'd need to handle this properly
        firstName: 'Unknown',
        lastName: 'Customer',
        phoneNumber: channel === 'sms' ? parsedData.channelUserId : null,
        email: channel === 'email' ? parsedData.channelUserId : null,
        lineUserId: channel === 'line' ? parsedData.channelUserId : null,
        instagramUserId: channel === 'instagram' ? parsedData.channelUserId : null,
        preferredChannel: channel,
        channelPreferences: {
          [channel]: true
        }
      });
    }

    return customer;
  }

  // Get conversation messages
  async getConversationMessages(conversationId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    return messages;
  }

  // Get all conversations for a user
  async getConversations(userId, options = {}) {
    const { channel, isArchived = false, limit = 20, offset = 0 } = options;

    const where = { userId, isArchived };
    if (channel) {
      where.channel = channel;
    }

    const conversations = await MessageConversation.findAll({
      where,
      order: [['lastMessageAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }
      ]
    });

    return conversations;
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId) {
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { conversationId, direction: 'inbound', isRead: false } }
    );

    await MessageConversation.update(
      { unreadCount: 0 },
      { where: { id: conversationId } }
    );
  }

  // Generate webhook signature for security
  generateWebhookSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new MultiChannelMessagingService();
module.exports.MultiChannelMessagingService = MultiChannelMessagingService;