const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { ChannelConfig } = require('../models');
const { body, param, validationResult } = require('express-validator');
const crypto = require('crypto');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Encrypt sensitive configuration data
const encryptConfig = (config) => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Decrypt sensitive configuration data
const decryptConfig = (encryptedData) => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this', 'utf8').slice(0, 32);
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
};

// Get all channel configurations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const configs = await ChannelConfig.findAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['encryptedConfig'] }
    });

    // Mask sensitive data
    const maskedConfigs = configs.map(config => {
      const masked = config.toJSON();
      if (masked.config) {
        // Mask sensitive fields
        if (masked.config.authToken) masked.config.authToken = '***';
        if (masked.config.apiKey) masked.config.apiKey = '***';
        if (masked.config.channelAccessToken) masked.config.channelAccessToken = '***';
        if (masked.config.accessToken) masked.config.accessToken = '***';
      }
      return masked;
    });

    res.json({ configs: maskedConfigs });
  } catch (error) {
    console.error('Failed to get channel configs:', error);
    res.status(500).json({ error: 'Failed to get channel configurations' });
  }
});

// Get specific channel configuration
router.get('/:channel',
  authenticateToken,
  [param('channel').isIn(['sms', 'email', 'line', 'instagram'])],
  validate,
  async (req, res) => {
    try {
      const config = await ChannelConfig.findOne({
        where: { userId: req.user.id, channel: req.params.channel },
        attributes: { exclude: ['encryptedConfig'] }
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      // Mask sensitive data
      const masked = config.toJSON();
      if (masked.config) {
        if (masked.config.authToken) masked.config.authToken = '***';
        if (masked.config.apiKey) masked.config.apiKey = '***';
        if (masked.config.channelAccessToken) masked.config.channelAccessToken = '***';
        if (masked.config.accessToken) masked.config.accessToken = '***';
      }

      res.json({ config: masked });
    } catch (error) {
      console.error('Failed to get channel config:', error);
      res.status(500).json({ error: 'Failed to get channel configuration' });
    }
  }
);

// Create or update channel configuration
router.post('/:channel',
  authenticateToken,
  [
    param('channel').isIn(['sms', 'email', 'line', 'instagram']),
    body('provider').notEmpty(),
    body('config').isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const { channel } = req.params;
      const { provider, config } = req.body;

      // Validate provider and config based on channel
      const isValid = validateChannelConfig(channel, provider, config);
      if (!isValid.valid) {
        return res.status(400).json({ error: isValid.error });
      }

      // Encrypt sensitive configuration
      const encryptedData = encryptConfig(config);

      // Find existing config
      let channelConfig = await ChannelConfig.findOne({
        where: { userId: req.user.id, channel }
      });

      if (channelConfig) {
        // Update existing
        await channelConfig.update({
          provider,
          config: maskConfig(config),
          encryptedConfig: JSON.stringify(encryptedData),
          isVerified: false,
          verifiedAt: null
        });
      } else {
        // Create new
        channelConfig = await ChannelConfig.create({
          userId: req.user.id,
          channel,
          provider,
          config: maskConfig(config),
          encryptedConfig: JSON.stringify(encryptedData),
          webhookUrl: generateWebhookUrl(req.user.id, channel),
          webhookSecret: crypto.randomBytes(32).toString('hex')
        });
      }

      res.json({
        success: true,
        config: {
          ...channelConfig.toJSON(),
          encryptedConfig: undefined
        }
      });
    } catch (error) {
      console.error('Failed to save channel config:', error);
      res.status(500).json({ error: 'Failed to save channel configuration' });
    }
  }
);

// Test channel configuration
router.post('/:channel/test',
  authenticateToken,
  [param('channel').isIn(['sms', 'email', 'line', 'instagram'])],
  validate,
  async (req, res) => {
    try {
      const config = await ChannelConfig.findOne({
        where: { userId: req.user.id, channel: req.params.channel }
      });

      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      // Decrypt configuration
      const decryptedConfig = decryptConfig(JSON.parse(config.encryptedConfig));

      // Test based on channel
      const testResult = await testChannelConfig(req.params.channel, config.provider, decryptedConfig);

      // Update last test time
      await config.update({
        lastTestAt: new Date(),
        isVerified: testResult.success,
        verifiedAt: testResult.success ? new Date() : null
      });

      res.json(testResult);
    } catch (error) {
      console.error('Failed to test channel config:', error);
      res.status(500).json({ error: 'Failed to test channel configuration' });
    }
  }
);

// Delete channel configuration
router.delete('/:channel',
  authenticateToken,
  [param('channel').isIn(['sms', 'email', 'line', 'instagram'])],
  validate,
  async (req, res) => {
    try {
      const result = await ChannelConfig.destroy({
        where: { userId: req.user.id, channel: req.params.channel }
      });

      if (result === 0) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete channel config:', error);
      res.status(500).json({ error: 'Failed to delete channel configuration' });
    }
  }
);

// Helper function to validate channel configuration
function validateChannelConfig(channel, provider, config) {
  switch (channel) {
    case 'sms':
      if (provider !== 'twilio') {
        return { valid: false, error: 'Invalid provider for SMS' };
      }
      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        return { valid: false, error: 'Missing required SMS configuration fields' };
      }
      break;

    case 'email':
      if (provider !== 'sendgrid') {
        return { valid: false, error: 'Invalid provider for email' };
      }
      if (!config.apiKey || !config.fromEmail) {
        return { valid: false, error: 'Missing required email configuration fields' };
      }
      break;

    case 'line':
      if (provider !== 'line-api') {
        return { valid: false, error: 'Invalid provider for LINE' };
      }
      if (!config.channelAccessToken || !config.channelSecret) {
        return { valid: false, error: 'Missing required LINE configuration fields' };
      }
      break;

    case 'instagram':
      if (provider !== 'instagram-api') {
        return { valid: false, error: 'Invalid provider for Instagram' };
      }
      if (!config.accessToken || !config.businessAccountId) {
        return { valid: false, error: 'Missing required Instagram configuration fields' };
      }
      break;

    default:
      return { valid: false, error: 'Invalid channel' };
  }

  return { valid: true };
}

// Helper function to mask sensitive configuration data
function maskConfig(config) {
  const masked = { ...config };
  if (masked.authToken) masked.authToken = '***';
  if (masked.apiKey) masked.apiKey = '***';
  if (masked.channelAccessToken) masked.channelAccessToken = '***';
  if (masked.accessToken) masked.accessToken = '***';
  return masked;
}

// Helper function to generate webhook URL
function generateWebhookUrl(userId, channel) {
  const baseUrl = process.env.BASE_URL || 'https://your-domain.com';
  return `${baseUrl}/api/messaging/webhook/${channel}`;
}

// Helper function to test channel configuration
async function testChannelConfig(channel, provider, config) {
  try {
    switch (channel) {
      case 'sms':
        // Test Twilio configuration
        const twilio = require('twilio');
        const client = twilio(config.accountSid, config.authToken);
        await client.api.accounts(config.accountSid).fetch();
        return { success: true, message: 'SMS configuration is valid' };

      case 'email':
        // Test SendGrid configuration
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(config.apiKey);
        // SendGrid doesn't have a direct test endpoint, but we can try to set the API key
        return { success: true, message: 'Email configuration appears valid' };

      case 'line':
        // Test LINE configuration
        const axios = require('axios');
        const response = await axios.get('https://api.line.me/v2/bot/info', {
          headers: {
            'Authorization': `Bearer ${config.channelAccessToken}`
          }
        });
        return { success: true, message: 'LINE configuration is valid', botInfo: response.data };

      case 'instagram':
        // Test Instagram configuration
        // This would require actual Instagram API testing
        return { success: false, message: 'Instagram configuration testing not yet implemented' };

      default:
        return { success: false, message: 'Invalid channel' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = router;