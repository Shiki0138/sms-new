// SMS Service
const twilio = require('twilio');
const { Message } = require('../models');

class SMSService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.queue = [];
    
    // Initialize Twilio client if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.initialized = true;
    }
  }

  async sendSMS(to, message, options = {}) {
    try {
      // Validate inputs
      if (!to || !message) {
        throw new Error('Phone number and message are required');
      }

      // Sanitize phone number
      const cleanPhone = this.sanitizePhoneNumber(to);
      
      // Check if SMS service is available
      if (!this.initialized) {
        if (options.allowQueue) {
          return this.queueMessage(cleanPhone, message, options);
        }
        throw new Error('SMS service unavailable');
      }

      // Send SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        to: cleanPhone,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
      });

      // Record message in database
      await Message.create({
        userId: options.userId,
        customerId: options.customerId,
        phone: cleanPhone,
        message,
        type: 'sms',
        status: 'sent',
        messageId: result.sid,
        sentAt: new Date()
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS send error:', error);
      
      // Record failed message
      if (options.userId) {
        await Message.create({
          userId: options.userId,
          customerId: options.customerId,
          phone: to,
          message,
          type: 'sms',
          status: 'failed',
          error: error.message,
          sentAt: new Date()
        });
      }

      throw error;
    }
  }

  async queueMessage(to, message, options) {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.queue.push({
      id: queueId,
      to,
      message,
      options,
      queuedAt: new Date()
    });

    // In a real implementation, this would persist to a database
    return {
      queued: true,
      queueId,
      position: this.queue.length
    };
  }

  sanitizePhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned; // Assume US number
    }
    
    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  async sendBulkSMS(recipients, message, options = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient.phone, message, {
          ...options,
          customerId: recipient.id
        });
        results.push({ recipient: recipient.id, ...result });
      } catch (error) {
        results.push({
          recipient: recipient.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async getMessageHistory(customerId, limit = 50) {
    try {
      const messages = await Message.findAll({
        where: { customerId },
        order: [['createdAt', 'DESC']],
        limit
      });
      
      return messages;
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  }

  async processQueue() {
    // Process queued messages
    const processedMessages = [];
    
    while (this.queue.length > 0 && this.initialized) {
      const queuedMessage = this.queue.shift();
      
      try {
        const result = await this.sendSMS(
          queuedMessage.to,
          queuedMessage.message,
          queuedMessage.options
        );
        processedMessages.push({ ...queuedMessage, result });
      } catch (error) {
        // Re-queue on failure
        this.queue.unshift(queuedMessage);
        break;
      }
    }
    
    return processedMessages;
  }

  isAvailable() {
    return this.initialized;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

// Export singleton instance
module.exports = new SMSService();
module.exports.SMSService = SMSService;