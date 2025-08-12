const express = require('express');
const Joi = require('joi');
const { tenantService } = require('../services/tenant-service');
const { providerFactory } = require('../providers/provider-factory');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createTenantSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  plan: Joi.string().valid('basic', 'premium', 'enterprise').default('basic'),
  settings: Joi.object().optional(),
  customQuotas: Joi.object({
    dailyLimit: Joi.number().integer().min(1),
    monthlyLimit: Joi.number().integer().min(1),
    rateLimit: Joi.number().integer().min(1),
    bulkSizeLimit: Joi.number().integer().min(1),
    providerOptions: Joi.array().items(Joi.string().valid('twilio', 'aws-sns'))
  }).optional()
});

const updateTenantSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  status: Joi.string().valid('active', 'suspended', 'trial').optional(),
  plan: Joi.string().valid('basic', 'premium', 'enterprise').optional(),
  settings: Joi.object().optional(),
  quotas: Joi.object({
    dailyLimit: Joi.number().integer().min(1),
    monthlyLimit: Joi.number().integer().min(1),
    rateLimit: Joi.number().integer().min(1),
    bulkSizeLimit: Joi.number().integer().min(1),
    providerOptions: Joi.array().items(Joi.string().valid('twilio', 'aws-sns'))
  }).optional()
});

// Apply admin authentication to all routes
router.use(authenticateAdmin);

/**
 * @route POST /api/admin/tenants
 * @desc Create a new tenant
 * @access Admin
 */
router.post('/tenants', async (req, res) => {
  try {
    const { error, value } = createTenantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await tenantService.createTenant(value);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tenant',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/tenants
 * @desc List all tenants
 * @access Admin
 */
router.get('/tenants', async (req, res) => {
  try {
    const { status, plan, limit = 50, offset = 0 } = req.query;
    
    const options = {
      status,
      plan,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await tenantService.listTenants(options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list tenants',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/tenants/:tenantId
 * @desc Get tenant details
 * @access Admin
 */
router.get('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await tenantService.getTenant(tenantId);
    
    res.json({
      success: true,
      tenant: tenant.toJSON()
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant',
      details: error.message
    });
  }
});

/**
 * @route PUT /api/admin/tenants/:tenantId
 * @desc Update tenant
 * @access Admin
 */
router.put('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const { error, value } = updateTenantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await tenantService.updateTenant(tenantId, value);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tenant',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/admin/tenants/:tenantId
 * @desc Delete tenant
 * @access Admin
 */
router.delete('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await tenantService.deleteTenant(tenantId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tenant',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/tenants/:tenantId/usage
 * @desc Get tenant usage statistics
 * @access Admin
 */
router.get('/tenants/:tenantId/usage', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const usage = await tenantService.getTenantUsage(tenantId);
    
    res.json({
      success: true,
      ...usage
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Get tenant usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant usage',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/tenants/:tenantId/usage/reset
 * @desc Reset tenant usage
 * @access Admin
 */
router.post('/tenants/:tenantId/usage/reset', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { type = 'both' } = req.body;
    
    if (!['daily', 'monthly', 'both'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset type. Must be "daily", "monthly", or "both"'
      });
    }

    const result = await tenantService.resetTenantUsage(tenantId, type);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Reset tenant usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset tenant usage',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/tenants/:tenantId/plan
 * @desc Change tenant plan
 * @access Admin
 */
router.post('/tenants/:tenantId/plan', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan } = req.body;
    
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Plan is required'
      });
    }

    const result = await tenantService.changeTenantPlan(tenantId, plan);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Change tenant plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change tenant plan',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/tenants/:tenantId/status
 * @desc Change tenant status
 * @access Admin
 */
router.post('/tenants/:tenantId/status', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const result = await tenantService.changeTenantStatus(tenantId, status);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Change tenant status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change tenant status',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/stats
 * @desc Get service statistics
 * @access Admin
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantStats = await tenantService.getServiceStats();
    const providerStats = await providerFactory.getProvidersStats();
    
    res.json({
      success: true,
      stats: {
        tenants: tenantStats,
        providers: providerStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/providers
 * @desc Get all provider information
 * @access Admin
 */
router.get('/providers', async (req, res) => {
  try {
    const stats = await providerFactory.getProvidersStats();
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider information',
      details: error.message
    });
  }
});

/**
 * @route POST /api/admin/providers/:providerName/test
 * @desc Test provider connectivity
 * @access Admin
 */
router.post('/providers/:providerName/test', async (req, res) => {
  try {
    const { providerName } = req.params;
    const result = await providerFactory.testProvider(providerName);
    
    res.json({
      success: true,
      test: result
    });
  } catch (error) {
    console.error('Test provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test provider',
      details: error.message
    });
  }
});

module.exports = router;