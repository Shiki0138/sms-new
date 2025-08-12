const AWS = require('aws-sdk');
const BaseSMSProvider = require('./base-provider');

/**
 * AWS SNS SMS Provider Implementation
 */
class AWSSNSProvider extends BaseSMSProvider {
  constructor(config) {
    super(config);
    this.name = 'aws-sns';
    this.sns = null;
  }

  async initialize() {
    try {
      const { accessKeyId, secretAccessKey, region } = this.config;
      
      if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('AWS credentials and region are required');
      }

      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region
      });

      this.sns = new AWS.SNS();
      
      // Test the connection
      await this.sns.getSMSAttributes().promise();
      
      this.initialized = true;
      console.log('AWS SNS provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AWS SNS provider:', error.message);
      throw error;
    }
  }

  async sendSMS(message, options = {}) {
    if (!this.initialized) {
      throw new Error('AWS SNS provider not initialized');
    }

    try {
      const { to, body } = message;
      const { senderName, smsType = 'Transactional' } = options;

      if (!this.validatePhoneNumber(to)) {
        throw new Error(`Invalid phone number: ${to}`);
      }

      const params = {
        Message: body,
        PhoneNumber: to,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: smsType
          }
        }
      };

      // Add sender name if provided
      if (senderName) {
        params.MessageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: senderName
        };
      }

      const result = await this.sns.publish(params).promise();

      return {
        success: true,
        messageId: result.MessageId,
        to,
        status: 'sent',
        provider: this.name,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AWS SNS send SMS error:', error.message);
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
      throw new Error('AWS SNS provider not initialized');
    }

    const batchSize = options.batchSize || 10;
    const delay = options.delay || 200; // ms between batches
    const results = [];

    // Process messages in batches to avoid throttling
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
    // AWS SNS doesn't provide direct message status lookup
    // This would require implementing CloudWatch logs integration
    throw new Error('Message status lookup not supported by AWS SNS provider');
  }

  getCapabilities() {
    return {
      bulkSMS: true,
      deliveryReceipts: false, // Requires CloudWatch setup
      unicode: true,
      maxMessageLength: 1600,
      maxBulkSize: 1000,
      supportedFeatures: [
        'sender_id',
        'transactional_sms',
        'promotional_sms'
      ]
    };
  }

  async handleWebhook(payload) {
    // AWS SNS uses CloudWatch for delivery status
    // This would need to be implemented based on specific CloudWatch setup
    throw new Error('Webhook handling not implemented for AWS SNS provider');
  }

  async getStats() {
    const baseStats = await super.getStats();
    
    if (!this.initialized) {
      return baseStats;
    }

    try {
      // Get SMS attributes (spending limits, etc.)
      const attributes = await this.sns.getSMSAttributes().promise();
      
      return {
        ...baseStats,
        smsAttributes: attributes.attributes,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get AWS SNS stats:', error.message);
      return baseStats;
    }
  }
}

module.exports = AWSSNSProvider;