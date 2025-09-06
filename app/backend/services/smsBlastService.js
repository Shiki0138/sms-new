const twilioService = require('./twilioService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Simple SMS Blast Service
 * Provides enhanced SMS capabilities while maintaining simplicity
 */
class SmsBlastService {
  constructor() {
    this.twilioService = twilioService;
    this.activeJobs = new Map();
  }

  /**
   * Send bulk SMS with personalization
   */
  async sendBulkSms(recipients, messageTemplate, options = {}) {
    try {
      const results = [];
      
      for (const recipient of recipients) {
        try {
          const personalizedMessage = this.personalizeMessage(messageTemplate, recipient);
          
          const result = await this.twilioService.sendSMS({
            to: recipient.phoneNumber || recipient.phone,
            message: personalizedMessage
          });

          results.push({
            recipient: recipient.phoneNumber || recipient.phone,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });

          // Rate limiting delay
          if (options.rateLimit && recipients.indexOf(recipient) < recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          results.push({
            recipient: recipient.phoneNumber || recipient.phone,
            success: false,
            error: error.message
          });
        }
      }

      return {
        totalRecipients: recipients.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      logger.error('Bulk SMS failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Personalize message content
   */
  personalizeMessage(template, customer) {
    let personalized = template;

    const replacements = {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      fullName: `${customer.lastName || ''} ${customer.firstName || ''}`.trim(),
      phoneNumber: customer.phoneNumber || customer.phone || '',
      email: customer.email || '',
      salonName: 'Salon Lumière'
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      personalized = personalized.replace(regex, value);
    });

    return personalized;
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return {
        isValid: false,
        error: 'Phone number is required'
      };
    }

    try {
      const formatted = this.twilioService.formatPhoneNumber(phoneNumber);
      return {
        isValid: true,
        formatted
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate estimated cost
   */
  calculateCost(recipientCount) {
    const costPerSms = 3; // 3 yen per SMS
    return recipientCount * costPerSms;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isEnabled: this.twilioService.isEnabled,
      activeJobs: this.activeJobs.size,
      service: 'SMS Blast Service',
      version: '1.0.0'
    };
  }
}

module.exports = new SmsBlastService();