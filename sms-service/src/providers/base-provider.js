/**
 * Base SMS Provider Interface
 * All SMS providers must implement this interface
 */
class BaseSMSProvider {
  constructor(config) {
    this.config = config;
    this.name = 'base';
    this.initialized = false;
  }

  /**
   * Initialize the provider with configuration
   */
  async initialize() {
    throw new Error('initialize() method must be implemented');
  }

  /**
   * Send a single SMS message
   * @param {Object} message - Message object
   * @param {string} message.to - Recipient phone number
   * @param {string} message.from - Sender phone number
   * @param {string} message.body - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result object with success status and message ID
   */
  async sendSMS(message, options = {}) {
    throw new Error('sendSMS() method must be implemented');
  }

  /**
   * Send bulk SMS messages
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Array of result objects
   */
  async sendBulkSMS(messages, options = {}) {
    // Default implementation: send messages one by one
    const results = [];
    for (const message of messages) {
      try {
        const result = await this.sendSMS(message, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          to: message.to
        });
      }
    }
    return results;
  }

  /**
   * Get delivery status of a message
   * @param {string} messageId - Message ID from provider
   * @returns {Promise<Object>} - Status object
   */
  async getMessageStatus(messageId) {
    throw new Error('getMessageStatus() method must be implemented');
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - True if valid
   */
  validatePhoneNumber(phoneNumber) {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Get provider capabilities
   * @returns {Object} - Capabilities object
   */
  getCapabilities() {
    return {
      bulkSMS: true,
      deliveryReceipts: false,
      unicode: true,
      maxMessageLength: 160,
      maxBulkSize: 100
    };
  }

  /**
   * Handle webhook/callback from provider
   * @param {Object} payload - Webhook payload
   * @returns {Object} - Processed webhook data
   */
  async handleWebhook(payload) {
    throw new Error('handleWebhook() method must be implemented');
  }

  /**
   * Get current provider statistics
   * @returns {Object} - Statistics object
   */
  async getStats() {
    return {
      name: this.name,
      initialized: this.initialized,
      capabilities: this.getCapabilities()
    };
  }
}

module.exports = BaseSMSProvider;