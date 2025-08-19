const express = require('express');
const { v4: uuidv4 } = require('uuid');
const smsBlastService = require('../services/smsBlastService');
// const SmsTemplate = require('../models/SmsTemplate');
// const SmsSegment = require('../models/SmsSegment');
// const SmsAnalytics = require('../models/SmsAnalytics');
const logger = require('../utils/logger');

const router = express.Router();

// In-memory storage for MVP (should be replaced with database)
const storage = {
  campaigns: [],
  templates: [],
  segments: [],
  analytics: []
};

/**
 * SMS CAMPAIGN MANAGEMENT ROUTES
 */

// Get all campaigns for user
router.get('/campaigns', async (req, res) => {
  try {
    const userCampaigns = storage.campaigns.filter(c => c.userId === req.user.id);
    
    res.json({
      success: true,
      campaigns: userCampaigns,
      total: userCampaigns.length
    });
  } catch (error) {
    logger.error('Failed to fetch campaigns', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message
    });
  }
});

// Create new campaign
router.post('/campaigns', async (req, res) => {
  try {
    const campaignData = {
      id: uuidv4(),
      userId: req.user.id,
      name: req.body.name,
      description: req.body.description || '',
      type: req.body.type || 'campaign',
      status: 'draft',
      templateId: req.body.templateId || null,
      segmentId: req.body.segmentId || null,
      messageContent: req.body.messageContent || '',
      scheduledAt: req.body.scheduledAt || null,
      settings: {
        enableTracking: req.body.settings?.enableTracking !== false,
        allowOptOut: req.body.settings?.allowOptOut !== false,
        sendRate: req.body.settings?.sendRate || 1,
        timeWindow: req.body.settings?.timeWindow || {
          start: '09:00',
          end: '18:00',
          timezone: 'Asia/Tokyo'
        }
      },
      targetCriteria: req.body.targetCriteria || {},
      stats: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        optedOut: 0,
        clicked: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate required fields
    if (!campaignData.name || campaignData.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name is required'
      });
    }

    if (!campaignData.messageContent || campaignData.messageContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    storage.campaigns.push(campaignData);

    logger.info('Campaign created', {
      campaignId: campaignData.id,
      userId: req.user.id,
      name: campaignData.name
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: campaignData
    });
  } catch (error) {
    logger.error('Failed to create campaign', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
});

/**
 * SMS TEMPLATE MANAGEMENT ROUTES
 */

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const userTemplates = storage.templates.filter(t => 
      t.userId === req.user.id && t.isActive
    );

    res.json({
      success: true,
      templates: userTemplates,
      total: userTemplates.length
    });
  } catch (error) {
    logger.error('Failed to fetch templates', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    // Simple template creation for MVP
    const template = {
      id: uuidv4(),
      userId: req.user.id,
      name: req.body.name,
      description: req.body.description || '',
      category: req.body.category || 'general',
      content: req.body.content,
      isActive: true,
      usageCount: 0,
      variables: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Basic validation
    if (!template.name || !template.content) {
      return res.status(400).json({
        success: false,
        message: 'Template name and content are required'
      });
    }

    // Extract variables from content
    const variableRegex = /{{(\w+)}}/g;
    const matches = [];
    let match;
    while ((match = variableRegex.exec(template.content)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    template.variables = matches;

    storage.templates.push(template);

    logger.info('Template created', {
      templateId: template.id,
      userId: req.user.id,
      name: template.name
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: template
    });
  } catch (error) {
    logger.error('Failed to create template', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
});

// Get service status
router.get('/status', async (req, res) => {
  try {
    const status = smsBlastService.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Failed to get service status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get service status',
      error: error.message
    });
  }
});

module.exports = router;