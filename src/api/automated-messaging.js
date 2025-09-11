const express = require('express');
const cron = require('node-cron');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory stores (in production, use Firebase/database)
let automationRules = [];
let scheduledCampaigns = [];
let messageTemplates = [];
let cronJobs = new Map();
let campaignStats = [];

/**
 * Automated Messaging System with Advanced Scheduling
 */

// Get all automation rules
router.get('/rules', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let rules = [...automationRules];
    
    if (status) {
      rules = rules.filter(rule => rule.status === status);
    }
    
    if (type) {
      rules = rules.filter(rule => rule.type === type);
    }
    
    // Add execution statistics
    const enrichedRules = rules.map(rule => ({
      ...rule,
      statistics: getCampaignStatistics(rule.id),
      nextExecution: getNextExecutionTime(rule)
    }));
    
    res.json({
      success: true,
      rules: enrichedRules,
      total: enrichedRules.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create automation rule
router.post('/rules', [
  body('name').notEmpty().isLength({ min: 3, max: 100 }),
  body('type').isIn(['appointment_reminder', 'birthday_greeting', 'follow_up', 'promotional', 'retention']),
  body('trigger').isObject(),
  body('schedule').isObject(),
  body('messageTemplate').isObject(),
  body('targetAudience').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      description,
      type,
      trigger,
      schedule,
      messageTemplate,
      targetAudience,
      channels,
      excludeCustomers = [],
      maxSendsPerCustomer = 1
    } = req.body;

    const rule = {
      id: uuidv4(),
      name,
      description: description || '',
      type,
      trigger,
      schedule,
      messageTemplate,
      targetAudience,
      channels: channels || ['sms'],
      excludeCustomers,
      maxSendsPerCustomer,
      status: 'active',
      createdAt: new Date(),
      createdBy: req.user?.userId || 'system',
      executionCount: 0,
      lastExecuted: null,
      nextExecution: calculateNextExecution(schedule)
    };

    automationRules.push(rule);
    
    // Schedule the automation
    await scheduleAutomation(rule);

    res.status(201).json({
      success: true,
      rule,
      message: 'Automation rule created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update automation rule
router.put('/rules/:ruleId', [
  body('name').optional().isLength({ min: 3, max: 100 }),
  body('status').optional().isIn(['active', 'paused', 'inactive'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { ruleId } = req.params;
    const updates = req.body;

    const ruleIndex = automationRules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Automation rule not found'
      });
    }

    const oldRule = automationRules[ruleIndex];
    
    // Update rule
    automationRules[ruleIndex] = {
      ...oldRule,
      ...updates,
      updatedAt: new Date(),
      updatedBy: req.user?.userId || 'system'
    };

    const updatedRule = automationRules[ruleIndex];

    // Reschedule if schedule changed or status changed
    if (updates.schedule || updates.status) {
      await unscheduleAutomation(ruleId);
      
      if (updatedRule.status === 'active') {
        await scheduleAutomation(updatedRule);
      }
    }

    res.json({
      success: true,
      rule: updatedRule,
      message: 'Automation rule updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete automation rule
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const ruleIndex = automationRules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Automation rule not found'
      });
    }

    // Unschedule automation
    await unscheduleAutomation(ruleId);
    
    // Remove rule
    const deletedRule = automationRules.splice(ruleIndex, 1)[0];

    res.json({
      success: true,
      rule: deletedRule,
      message: 'Automation rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test automation rule
router.post('/rules/:ruleId/test', [
  body('testCustomers').optional().isArray(),
  body('dryRun').optional().isBoolean()
], async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { testCustomers = [], dryRun = true } = req.body;

    const rule = automationRules.find(r => r.id === ruleId);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Automation rule not found'
      });
    }

    const testResults = await executeAutomationRule(rule, {
      testMode: true,
      dryRun,
      testCustomers: testCustomers.length > 0 ? testCustomers : null
    });

    res.json({
      success: true,
      testResults,
      rule: {
        id: rule.id,
        name: rule.name,
        type: rule.type
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manual execution of automation rule
router.post('/rules/:ruleId/execute', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { force = false } = req.body;

    const rule = automationRules.find(r => r.id === ruleId);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Automation rule not found'
      });
    }

    if (rule.status !== 'active' && !force) {
      return res.status(400).json({
        success: false,
        message: 'Automation rule is not active. Use force=true to execute anyway.'
      });
    }

    const executionResults = await executeAutomationRule(rule, {
      manualExecution: true,
      executedBy: req.user?.userId || 'system'
    });

    res.json({
      success: true,
      executionResults,
      message: 'Automation rule executed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Campaign management
router.post('/campaigns', [
  body('name').notEmpty(),
  body('message').notEmpty(),
  body('targetAudience').isObject(),
  body('scheduleTime').optional().isISO8601(),
  body('channels').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      description,
      message,
      targetAudience,
      scheduleTime,
      channels,
      attachments = [],
      excludeCustomers = [],
      campaignType = 'promotional'
    } = req.body;

    const campaign = {
      id: uuidv4(),
      name,
      description: description || '',
      campaignType,
      message,
      targetAudience,
      scheduleTime: scheduleTime ? new Date(scheduleTime) : new Date(),
      channels,
      attachments,
      excludeCustomers,
      status: scheduleTime ? 'scheduled' : 'pending',
      createdAt: new Date(),
      createdBy: req.user?.userId || 'system',
      estimatedRecipients: 0, // Will be calculated
      actualRecipients: 0,
      deliveryStats: {
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0
      }
    };

    // Calculate estimated recipients
    campaign.estimatedRecipients = await calculateCampaignRecipients(campaign);

    scheduledCampaigns.push(campaign);

    // Schedule campaign if needed
    if (scheduleTime) {
      scheduleCampaign(campaign);
    } else {
      // Execute immediately
      await executeCampaign(campaign);
    }

    res.status(201).json({
      success: true,
      campaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { status, type, limit = 20, offset = 0 } = req.query;
    
    let campaigns = [...scheduledCampaigns];
    
    if (status) {
      campaigns = campaigns.filter(c => c.status === status);
    }
    
    if (type) {
      campaigns = campaigns.filter(c => c.campaignType === type);
    }
    
    // Sort by creation date (newest first)
    campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const total = campaigns.length;
    campaigns = campaigns.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      success: true,
      campaigns,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get campaign analytics
router.get('/campaigns/:campaignId/analytics', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = scheduledCampaigns.find(c => c.id === campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const analytics = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.campaignType,
        status: campaign.status
      },
      performance: {
        ...campaign.deliveryStats,
        deliveryRate: campaign.deliveryStats.sent > 0 ? 
          ((campaign.deliveryStats.delivered / campaign.deliveryStats.sent) * 100).toFixed(2) : 0,
        openRate: campaign.deliveryStats.delivered > 0 ? 
          ((campaign.deliveryStats.opened / campaign.deliveryStats.delivered) * 100).toFixed(2) : 0,
        clickRate: campaign.deliveryStats.opened > 0 ? 
          ((campaign.deliveryStats.clicked / campaign.deliveryStats.opened) * 100).toFixed(2) : 0
      },
      timeline: generateCampaignTimeline(campaign),
      channelBreakdown: generateChannelBreakdown(campaign)
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Message templates for automation
router.get('/templates', async (req, res) => {
  try {
    const { category, language = 'ja' } = req.query;
    
    let templates = [...messageTemplates];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    templates = templates.filter(t => t.language === language);
    
    res.json({
      success: true,
      templates,
      total: templates.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/templates', [
  body('name').notEmpty(),
  body('content').notEmpty(),
  body('category').isIn(['appointment_reminder', 'birthday', 'follow_up', 'promotional', 'welcome', 'thank_you']),
  body('language').isIn(['ja', 'en']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      content,
      category,
      language = 'ja',
      variables = [],
      defaultVariables = {}
    } = req.body;

    const template = {
      id: uuidv4(),
      name,
      content,
      category,
      language,
      variables,
      defaultVariables,
      usageCount: 0,
      createdAt: new Date(),
      createdBy: req.user?.userId || 'system'
    };

    messageTemplates.push(template);

    res.status(201).json({
      success: true,
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Advanced scheduling and automation statistics
router.get('/statistics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const stats = {
      automationRules: {
        total: automationRules.length,
        active: automationRules.filter(r => r.status === 'active').length,
        paused: automationRules.filter(r => r.status === 'paused').length,
        totalExecutions: automationRules.reduce((sum, rule) => sum + rule.executionCount, 0)
      },
      campaigns: {
        total: scheduledCampaigns.length,
        scheduled: scheduledCampaigns.filter(c => c.status === 'scheduled').length,
        completed: scheduledCampaigns.filter(c => c.status === 'completed').length,
        totalRecipients: scheduledCampaigns.reduce((sum, campaign) => sum + campaign.actualRecipients, 0)
      },
      performance: {
        averageDeliveryRate: calculateAverageDeliveryRate(),
        averageOpenRate: calculateAverageOpenRate(),
        topPerformingTemplate: getTopPerformingTemplate(),
        totalMessagesSent: getTotalMessagesSent(period)
      },
      recentActivity: getRecentAutomationActivity(10)
    };

    res.json({
      success: true,
      statistics: stats,
      period,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Helper Functions
 */

function calculateNextExecution(schedule) {
  const now = new Date();
  
  switch (schedule.type) {
    case 'daily':
      const daily = new Date(now);
      daily.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
      if (daily <= now) daily.setDate(daily.getDate() + 1);
      return daily;
      
    case 'weekly':
      const weekly = new Date(now);
      weekly.setDate(now.getDate() + (schedule.dayOfWeek - now.getDay() + 7) % 7);
      weekly.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
      if (weekly <= now) weekly.setDate(weekly.getDate() + 7);
      return weekly;
      
    case 'monthly':
      const monthly = new Date(now.getFullYear(), now.getMonth(), schedule.dayOfMonth || 1, schedule.hour || 9, schedule.minute || 0);
      if (monthly <= now) monthly.setMonth(monthly.getMonth() + 1);
      return monthly;
      
    case 'trigger-based':
      return null; // No fixed schedule
      
    default:
      return new Date(schedule.dateTime);
  }
}

async function scheduleAutomation(rule) {
  try {
    if (rule.schedule.type === 'trigger-based') {
      // Set up event listeners for trigger-based rules
      setupTriggerListeners(rule);
      return;
    }

    const cronExpression = buildCronExpression(rule.schedule);
    
    if (cronExpression) {
      const job = cron.schedule(cronExpression, async () => {
        try {
          await executeAutomationRule(rule);
        } catch (error) {
          console.error(`Error executing automation rule ${rule.id}:`, error);
        }
      }, {
        scheduled: true,
        timezone: 'Asia/Tokyo'
      });
      
      cronJobs.set(rule.id, job);
    }
  } catch (error) {
    console.error('Error scheduling automation:', error);
  }
}

async function unscheduleAutomation(ruleId) {
  const job = cronJobs.get(ruleId);
  if (job) {
    job.destroy();
    cronJobs.delete(ruleId);
  }
}

function buildCronExpression(schedule) {
  switch (schedule.type) {
    case 'daily':
      return `${schedule.minute || 0} ${schedule.hour || 9} * * *`;
    case 'weekly':
      return `${schedule.minute || 0} ${schedule.hour || 9} * * ${schedule.dayOfWeek}`;
    case 'monthly':
      return `${schedule.minute || 0} ${schedule.hour || 9} ${schedule.dayOfMonth || 1} * *`;
    default:
      return null;
  }
}

async function executeAutomationRule(rule, options = {}) {
  try {
    const {
      testMode = false,
      dryRun = false,
      testCustomers = null,
      manualExecution = false,
      executedBy = 'system'
    } = options;

    // Get target customers based on rule criteria
    const targetCustomers = await getTargetCustomers(rule.targetAudience, testCustomers);
    
    // Filter excluded customers
    const filteredCustomers = targetCustomers.filter(customer => 
      !rule.excludeCustomers.includes(customer.id)
    );

    // Apply frequency limits
    const eligibleCustomers = await applyFrequencyLimits(filteredCustomers, rule);

    if (dryRun) {
      return {
        dryRun: true,
        targetCustomers: targetCustomers.length,
        filteredCustomers: filteredCustomers.length,
        eligibleCustomers: eligibleCustomers.length,
        estimatedCost: calculateEstimatedCost(eligibleCustomers, rule.channels)
      };
    }

    const results = [];
    
    for (const customer of eligibleCustomers) {
      if (!testMode) {
        // Process message template with customer data
        const personalizedMessage = processMessageTemplate(rule.messageTemplate, customer);
        
        // Send message through specified channels
        const messageResult = await sendAutomatedMessage({
          customer,
          message: personalizedMessage,
          channels: rule.channels,
          ruleId: rule.id,
          executionType: manualExecution ? 'manual' : 'automatic'
        });
        
        results.push(messageResult);
      }
    }

    // Update rule execution statistics
    if (!testMode && !dryRun) {
      rule.executionCount += 1;
      rule.lastExecuted = new Date();
      rule.nextExecution = calculateNextExecution(rule.schedule);
      
      // Log execution
      logAutomationExecution({
        ruleId: rule.id,
        ruleName: rule.name,
        executedAt: new Date(),
        executedBy,
        targetCount: eligibleCustomers.length,
        results
      });
    }

    return {
      success: true,
      targetCustomers: eligibleCustomers.length,
      results,
      executionId: uuidv4(),
      executedAt: new Date()
    };
  } catch (error) {
    console.error('Automation execution error:', error);
    throw error;
  }
}

async function getTargetCustomers(criteria, testCustomers = null) {
  // Mock customer data - in production, query from database
  const allCustomers = [
    { id: 1, name: '田中 花子', email: 'tanaka@example.com', lastVisit: '2025-09-01', birthday: '1985-05-20' },
    { id: 2, name: '佐藤 美香', email: 'sato@example.com', lastVisit: '2025-09-02', birthday: '1990-12-03' },
    // Add more customers...
  ];

  if (testCustomers) {
    return allCustomers.filter(c => testCustomers.includes(c.id));
  }

  // Apply targeting criteria
  let customers = [...allCustomers];

  if (criteria.lastVisitDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - criteria.lastVisitDays);
    customers = customers.filter(c => new Date(c.lastVisit) >= cutoffDate);
  }

  if (criteria.birthdayRange) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + criteria.birthdayRange.start);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + criteria.birthdayRange.end);

    customers = customers.filter(c => {
      const birthday = new Date(c.birthday);
      birthday.setFullYear(today.getFullYear());
      return birthday >= startDate && birthday <= endDate;
    });
  }

  return customers;
}

async function applyFrequencyLimits(customers, rule) {
  // Check how many times each customer has received messages from this rule
  // In production, query from message log database
  return customers; // Simplified for demo
}

function processMessageTemplate(template, customer) {
  let message = template.content;
  
  // Replace placeholders with customer data
  message = message.replace(/\{customerName\}/g, customer.name);
  message = message.replace(/\{firstName\}/g, customer.name.split(' ')[1] || customer.name);
  message = message.replace(/\{lastName\}/g, customer.name.split(' ')[0] || '');
  
  return message;
}

async function sendAutomatedMessage(messageData) {
  // Integrate with multi-channel messaging API
  // This would call the messaging API we created earlier
  return {
    customerId: messageData.customer.id,
    channels: messageData.channels,
    status: 'sent',
    messageId: uuidv4(),
    sentAt: new Date()
  };
}

function calculateEstimatedCost(customers, channels) {
  const costs = {
    sms: 10, // 10 yen per SMS
    email: 1, // 1 yen per email
    line: 0, // Free
    push: 0 // Free
  };
  
  return customers.length * channels.reduce((sum, channel) => sum + (costs[channel] || 0), 0);
}

async function calculateCampaignRecipients(campaign) {
  const customers = await getTargetCustomers(campaign.targetAudience);
  return customers.filter(c => !campaign.excludeCustomers.includes(c.id)).length;
}

async function executeCampaign(campaign) {
  // Execute campaign logic - similar to automation rules
  campaign.status = 'executing';
  // ... implementation
  campaign.status = 'completed';
}

function scheduleCampaign(campaign) {
  const executeTime = new Date(campaign.scheduleTime);
  const delay = executeTime.getTime() - Date.now();
  
  if (delay > 0) {
    setTimeout(async () => {
      try {
        await executeCampaign(campaign);
      } catch (error) {
        console.error(`Campaign execution error:`, error);
      }
    }, delay);
  }
}

function getCampaignStatistics(ruleId) {
  return {
    totalExecutions: 0,
    successRate: 100,
    averageRecipients: 0,
    lastExecuted: null
  };
}

function getNextExecutionTime(rule) {
  return calculateNextExecution(rule.schedule);
}

function logAutomationExecution(executionLog) {
  // Log to database/monitoring system
  console.log('Automation executed:', executionLog);
}

function setupTriggerListeners(rule) {
  // Set up event listeners for trigger-based automations
  // e.g., appointment created, customer birthday, etc.
}

function generateCampaignTimeline(campaign) {
  return [
    { event: 'created', timestamp: campaign.createdAt },
    { event: 'scheduled', timestamp: campaign.scheduleTime }
  ];
}

function generateChannelBreakdown(campaign) {
  return campaign.channels.map(channel => ({
    channel,
    sent: 0,
    delivered: 0,
    failed: 0
  }));
}

function calculateAverageDeliveryRate() {
  return 95.5; // Mock average
}

function calculateAverageOpenRate() {
  return 25.3; // Mock average
}

function getTopPerformingTemplate() {
  return messageTemplates.length > 0 ? messageTemplates[0] : null;
}

function getTotalMessagesSent(period) {
  return 1250; // Mock total
}

function getRecentAutomationActivity(limit) {
  return [
    {
      type: 'rule_executed',
      ruleName: 'Birthday Greetings',
      timestamp: new Date(),
      recipients: 5
    }
  ].slice(0, limit);
}

module.exports = router;