const axios = require('axios');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const { Line } = require('@line/bot-sdk');

/**
 * Service for testing channel configurations
 */
class ChannelTestService {
  
  /**
   * Test SMS channel configuration (Twilio)
   * @param {Object} config - SMS configuration
   * @returns {Object} Test result
   */
  async testSMS(config) {
    try {
      const { accountSid, authToken, phoneNumber, messagingServiceSid } = config;
      
      if (!accountSid || !authToken || !phoneNumber) {
        return {
          success: false,
          error: 'Missing required SMS configuration fields',
          details: 'accountSid, authToken, and phoneNumber are required'
        };
      }

      // Initialize Twilio client
      const client = twilio(accountSid, authToken);
      
      // Test 1: Verify account
      const account = await client.api.accounts(accountSid).fetch();
      
      // Test 2: Verify phone number
      const phoneNumbers = await client.incomingPhoneNumbers.list({ phoneNumber });
      if (phoneNumbers.length === 0) {
        return {
          success: false,
          error: 'Phone number not found in account',
          details: `Phone number ${phoneNumber} is not associated with this Twilio account`
        };
      }

      // Test 3: Verify messaging service if provided
      if (messagingServiceSid) {
        try {
          await client.messaging.services(messagingServiceSid).fetch();
        } catch (error) {
          return {
            success: false,
            error: 'Invalid Messaging Service SID',
            details: error.message
          };
        }
      }

      return {
        success: true,
        message: 'SMS configuration is valid',
        details: {
          accountName: account.friendlyName,
          accountStatus: account.status,
          phoneNumber: phoneNumber,
          messagingServiceConfigured: !!messagingServiceSid
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'SMS configuration test failed',
        details: error.message
      };
    }
  }

  /**
   * Test Email channel configuration (SendGrid)
   * @param {Object} config - Email configuration
   * @returns {Object} Test result
   */
  async testEmail(config) {
    try {
      const { apiKey, fromEmail, fromName, domain } = config;
      
      if (!apiKey || !fromEmail) {
        return {
          success: false,
          error: 'Missing required email configuration fields',
          details: 'apiKey and fromEmail are required'
        };
      }

      // Set API key
      sgMail.setApiKey(apiKey);

      // Test API key validity by checking API key permissions
      try {
        const response = await axios.get('https://api.sendgrid.com/v3/user/profile', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fromEmail)) {
          return {
            success: false,
            error: 'Invalid from email format',
            details: 'Please provide a valid email address'
          };
        }

        return {
          success: true,
          message: 'Email configuration is valid',
          details: {
            userEmail: response.data.email,
            userName: response.data.first_name + ' ' + response.data.last_name,
            fromEmail: fromEmail,
            fromName: fromName || 'Not specified',
            domain: domain || 'Default domain'
          }
        };
        
      } catch (error) {
        if (error.response?.status === 401) {
          return {
            success: false,
            error: 'Invalid API key',
            details: 'The provided SendGrid API key is invalid or expired'
          };
        }
        throw error;
      }
      
    } catch (error) {
      return {
        success: false,
        error: 'Email configuration test failed',
        details: error.message
      };
    }
  }

  /**
   * Test LINE channel configuration
   * @param {Object} config - LINE configuration
   * @returns {Object} Test result
   */
  async testLINE(config) {
    try {
      const { channelAccessToken, channelSecret, channelId } = config;
      
      if (!channelAccessToken || !channelSecret) {
        return {
          success: false,
          error: 'Missing required LINE configuration fields',
          details: 'channelAccessToken and channelSecret are required'
        };
      }

      // Test 1: Verify channel access token by getting bot info
      try {
        const response = await axios.get('https://api.line.me/v2/bot/info', {
          headers: {
            'Authorization': `Bearer ${channelAccessToken}`
          }
        });

        const botInfo = response.data;
        
        // Test 2: If channelId is provided, verify it matches
        if (channelId && botInfo.userId !== channelId) {
          return {
            success: false,
            error: 'Channel ID mismatch',
            details: `Provided channel ID doesn't match the bot's actual ID`
          };
        }

        return {
          success: true,
          message: 'LINE configuration is valid',
          details: {
            botId: botInfo.userId,
            displayName: botInfo.displayName,
            pictureUrl: botInfo.pictureUrl,
            chatMode: botInfo.chatMode,
            markAsReadMode: botInfo.markAsReadMode
          }
        };
        
      } catch (error) {
        if (error.response?.status === 401) {
          return {
            success: false,
            error: 'Invalid channel access token',
            details: 'The provided LINE channel access token is invalid or expired'
          };
        }
        throw error;
      }
      
    } catch (error) {
      return {
        success: false,
        error: 'LINE configuration test failed',
        details: error.message
      };
    }
  }

  /**
   * Test Instagram channel configuration
   * @param {Object} config - Instagram configuration
   * @returns {Object} Test result
   */
  async testInstagram(config) {
    try {
      const { accessToken, businessAccountId, webhookSecret } = config;
      
      if (!accessToken || !businessAccountId) {
        return {
          success: false,
          error: 'Missing required Instagram configuration fields',
          details: 'accessToken and businessAccountId are required'
        };
      }

      // Test 1: Verify access token by getting account info
      try {
        const response = await axios.get(
          `https://graph.facebook.com/v18.0/${businessAccountId}`, 
          {
            params: {
              fields: 'id,name,category,profile_picture_url',
              access_token: accessToken
            }
          }
        );

        const accountInfo = response.data;
        
        // Test 2: Verify messaging permissions
        const permissionsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${businessAccountId}/messaging_feature_review`,
          {
            params: {
              access_token: accessToken
            }
          }
        );

        return {
          success: true,
          message: 'Instagram configuration is valid',
          details: {
            accountId: accountInfo.id,
            accountName: accountInfo.name,
            category: accountInfo.category,
            profilePictureUrl: accountInfo.profile_picture_url,
            messagingFeatures: permissionsResponse.data?.data || []
          }
        };
        
      } catch (error) {
        if (error.response?.status === 401) {
          return {
            success: false,
            error: 'Invalid access token or business account ID',
            details: 'The provided Instagram access token or business account ID is invalid'
          };
        }
        throw error;
      }
      
    } catch (error) {
      return {
        success: false,
        error: 'Instagram configuration test failed',
        details: error.message
      };
    }
  }

  /**
   * Test channel configuration based on channel type
   * @param {string} channel - Channel type
   * @param {string} provider - Provider name
   * @param {Object} config - Channel configuration
   * @returns {Object} Test result
   */
  async testChannel(channel, provider, config) {
    switch (channel.toLowerCase()) {
      case 'sms':
        return await this.testSMS(config);
      case 'email':
        return await this.testEmail(config);
      case 'line':
        return await this.testLINE(config);
      case 'instagram':
        return await this.testInstagram(config);
      default:
        return {
          success: false,
          error: 'Unsupported channel type',
          details: `Channel type '${channel}' is not supported`
        };
    }
  }

  /**
   * Get channel health status
   * @param {string} channel - Channel type
   * @param {Object} config - Channel configuration
   * @returns {Object} Health status
   */
  async getChannelHealth(channel, config) {
    const testResult = await this.testChannel(channel, null, config);
    
    return {
      channel,
      status: testResult.success ? 'healthy' : 'unhealthy',
      lastChecked: new Date().toISOString(),
      error: testResult.success ? null : testResult.error,
      details: testResult.details
    };
  }
}

module.exports = new ChannelTestService();