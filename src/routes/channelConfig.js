const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { ChannelConfig } = require('../models');
const { body, param, validationResult } = require('express-validator');
const { encrypt, decrypt, maskSensitive, generateToken } = require('../utils/encryption');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// These functions are now handled by the encryption utility

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
      const encryptedData = encrypt(config);

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
          webhookSecret: generateToken(32)
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
      const decryptedConfig = decrypt(JSON.parse(config.encryptedConfig));

      // Test based on channel
      const testResult = await testChannelConfig(req.params.channel, config.provider, decryptedConfig);

      // Update connection status and test information
      await config.update({
        lastTestAt: new Date(),
        lastConnectionTest: new Date(),
        isVerified: testResult.success,
        verifiedAt: testResult.success ? new Date() : null,
        connectionStatus: testResult.success ? 'connected' : 'error',
        connectionError: testResult.success ? null : testResult.error,
        testAttempts: config.testAttempts + 1
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
  if (masked.authToken) masked.authToken = maskSensitive(masked.authToken);
  if (masked.apiKey) masked.apiKey = maskSensitive(masked.apiKey);
  if (masked.channelAccessToken) masked.channelAccessToken = maskSensitive(masked.channelAccessToken);
  if (masked.accessToken) masked.accessToken = maskSensitive(masked.accessToken);
  if (masked.channelSecret) masked.channelSecret = maskSensitive(masked.channelSecret);
  if (masked.webhookSecret) masked.webhookSecret = maskSensitive(masked.webhookSecret);
  return masked;
}

// Helper function to generate webhook URL
function generateWebhookUrl(userId, channel) {
  const baseUrl = process.env.BASE_URL || 'https://your-domain.com';
  return `${baseUrl}/api/messaging/webhook/${channel}`;
}

// Import the channel test service
const channelTestService = require('../services/channelTestService');

// Helper function to test channel configuration
async function testChannelConfig(channel, provider, config) {
  try {
    const result = await channelTestService.testChannel(channel, provider, config);
    return result;
  } catch (error) {
    return { 
      success: false, 
      error: 'Configuration test failed',
      details: error.message 
    };
  }
}

module.exports = router;