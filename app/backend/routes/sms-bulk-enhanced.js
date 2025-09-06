const express = require('express');
const { v4: uuidv4 } = require('uuid');
const smsBlastService = require('../services/smsBlastService');
const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Enhanced SMS Bulk Endpoint
 * Maintains backward compatibility while adding campaign features
 */

// Enhanced bulk SMS endpoint with campaign support
router.post('/bulk', async (req, res) => {
  try {
    const {
      recipients,
      message,
      campaignName,
      enableTracking = true,
      scheduledAt,
      settings = {}
    } = req.body;

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required and must not be empty'
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Normalize recipients format
    const normalizedRecipients = recipients.map(r => {
      if (typeof r === 'string') {
        return {
          id: uuidv4(),
          phone: r,
          phoneNumber: r
        };
      }
      return {
        id: r.id || uuidv4(),
        phone: r.phone || r.phoneNumber,
        phoneNumber: r.phone || r.phoneNumber,
        firstName: r.firstName || '',
        lastName: r.lastName || '',
        ...r
      };
    });

    // Use simple bulk send (backward compatibility)
    const bulkRecipients = normalizedRecipients.map(r => ({
      phone: r.phoneNumber,
      message: smsBlastService.personalizeMessage(message, r)
    }));

    const results = await twilioService.sendBulkSMS(bulkRecipients);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info('Simple bulk SMS sent', {
      userId: req.user.id,
      recipientCount: bulkRecipients.length,
      successCount,
      failureCount
    });

    res.json({
      success: true,
      message: 'Bulk SMS sent successfully',
      totalRecipients: bulkRecipients.length,
      sent: successCount,
      failed: failureCount,
      estimatedCost: smsBlastService.calculateCost(bulkRecipients.length),
      results: results.map(r => ({
        phone: r.phone,
        success: r.success,
        messageId: r.messageId,
        error: r.error
      }))
    });
  } catch (error) {
    logger.error('Bulk SMS failed', {
      error: error.message,
      userId: req.user?.id,
      recipientCount: req.body?.recipients?.length
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send bulk SMS',
      error: error.message
    });
  }
});

// Validate phone numbers
router.post('/validate-phones', async (req, res) => {
  try {
    const { phoneNumbers } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({
        success: false,
        message: 'Phone numbers array is required'
      });
    }

    const validationResults = phoneNumbers.map(phone => {
      const result = smsBlastService.validatePhoneNumber(phone);
      return {
        original: phone,
        isValid: result.isValid,
        formatted: result.formatted || null,
        error: result.error || null
      };
    });

    const validCount = validationResults.filter(r => r.isValid).length;
    const invalidCount = validationResults.filter(r => !r.isValid).length;

    res.json({
      success: true,
      validationResults,
      summary: {
        total: phoneNumbers.length,
        valid: validCount,
        invalid: invalidCount,
        validPercentage: Math.round((validCount / phoneNumbers.length) * 100)
      }
    });
  } catch (error) {
    logger.error('Phone validation failed', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to validate phone numbers',
      error: error.message
    });
  }
});

// Get service health and configuration
router.get('/health', async (req, res) => {
  try {
    const status = smsBlastService.getStatus();
    
    res.json({
      success: true,
      service: 'SMS Bulk Enhanced',
      version: '1.0.0',
      status: {
        ...status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Service health check failed',
      error: error.message
    });
  }
});

module.exports = router;