const twilio = require('twilio');
const BaseSMSProvider = require('./base-provider');

/**
 * Twilio SMS Provider Implementation
 */
class TwilioProvider extends BaseSMSProvider {
  constructor(config) {
    super(config);
    this.name = 'twilio';
    this.client = null;
  }

  async initialize() {
    try {
      const { accountSid, authToken, phoneNumber } = this.config;
      
      if (!accountSid || !authToken) {
        throw new Error('Twilio accountSid and authToken are required');
      }

      this.client = twilio(accountSid, authToken);
      this.defaultFromNumber = phoneNumber;
      
      // Test the connection
      await this.client.api.accounts(accountSid).fetch();
      
      this.initialized = true;
      console.log('Twilio provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio provider:', error.message);
      throw error;
    }
  }

  async sendSMS(message, options = {}) {
    if (!this.initialized) {
      throw new Error('Twilio provider not initialized');
    }

    try {
      const { to, from, body } = message;
      const fromNumber = from || this.defaultFromNumber;

      if (!this.validatePhoneNumber(to)) {
        throw new Error(`Invalid phone number: ${to}`);
      }

      if (!fromNumber) {
        throw new Error('From phone number is required');
      }

      const twilioMessage = await this.client.messages.create({
        body,
        from: fromNumber,
        to,
        ...options
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        to: twilioMessage.to,
        from: twilioMessage.from,
        status: twilioMessage.status,
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Twilio send SMS error:', error.message);
      return {
        success: false,
        error: error.message,
        to: message.to,
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendBulkSMS(messages, options = {}) {
    if (!this.initialized) {
      throw new Error('Twilio provider not initialized');
    }

    const batchSize = options.batchSize || 10;
    const delay = options.delay || 100; // ms between batches
    const results = [];

    // Process messages in batches to avoid rate limiting
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(message => this.sendSMS(message, options));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        const processedResults = batchResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              success: false,
              error: result.reason.message || 'Unknown error',
              to: batch[index].to,
              provider: this.name,
              timestamp: new Date().toISOString()
            };
          }
        });
        
        results.push(...processedResults);
        
        // Add delay between batches
        if (i + batchSize < messages.length && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error('Batch processing error:', error.message);
        // Add failed results for the batch
        batch.forEach(message => {
          results.push({
            success: false,
            error: error.message,
            to: message.to,
            provider: this.name,
            timestamp: new Date().toISOString()
          });
        });
      }
    }

    return results;
  }

  async getMessageStatus(messageId) {
    if (!this.initialized) {
      throw new Error('Twilio provider not initialized');
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      
      return {
        messageId: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        provider: this.name
      };
    } catch (error) {
      console.error('Failed to get message status:', error.message);
      throw error;
    }
  }

  getCapabilities() {
    return {
      bulkSMS: true,
      deliveryReceipts: true,
      unicode: true,
      maxMessageLength: 1600,
      maxBulkSize: 1000,
      supportedFeatures: [
        'delivery_status',
        'media_messages',
        'shortcodes',
        'alphanumeric_sender'
      ]
    };
  }

  async handleWebhook(payload) {
    // Handle Twilio webhook for delivery receipts
    const {
      MessageSid: messageId,
      MessageStatus: status,
      To: to,
      From: from,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage
    } = payload;

    return {
      messageId,
      status,
      to,
      from,
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString(),
      provider: this.name
    };
  }

  async getStats() {
    const baseStats = await super.getStats();
    
    if (!this.initialized) {
      return baseStats;
    }

    try {
      // Get account usage statistics
      const usage = await this.client.usage.records.list({
        category: 'sms',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      });

      const todayUsage = usage.reduce((sum, record) => sum + parseInt(record.count), 0);

      return {
        ...baseStats,
        usage: {
          messagesLast24h: todayUsage,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to get Twilio stats:', error.message);
      return baseStats;
    }
  }
}

module.exports = TwilioProvider;