const express = require('express');
const router = express.Router();
const { customerService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { 
  validateCustomerCreate, 
  validateCustomerUpdate 
} = require('../middleware/validation');
const { requireRole, verifyTenantAccess } = require('../middleware/supabase-auth');

/**
 * @route   GET /api/customers
 * @desc    Get all customers for tenant
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tags, orderBy = 'name' } = req.query;
    
    const options = {
      tenantId: req.user.tenantId,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      orderBy,
      orderDirection: 'asc'
    };

    // Add filters if provided
    if (search) {
      // Use search method for text search
      const customers = await customerService.search(search, req.user.tenantId, options);
      return res.json({
        data: customers,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      options.filters = { tags: tagArray };
    }

    const result = await customerService.findAll(options);

    res.json({
      data: result.data,
      total: result.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(result.count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * @route   GET /api/customers/:id
 * @desc    Get single customer
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const customer = await customerService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get additional stats
    const stats = await customerService.getCustomerStats(req.params.id);

    res.json({
      ...customer,
      stats
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private
 */
router.post('/', validateCustomerCreate, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerData = {
      ...req.body,
      tenant_id: req.user.tenantId
    };

    const customer = await customerService.create(customerData);

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    
    if (error.message.includes('DUPLICATE_ENTRY')) {
      return res.status(409).json({ error: 'Customer with this email or phone already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id', validateCustomerUpdate, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if customer exists and belongs to tenant
    const existing = await customerService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await customerService.update(req.params.id, req.body, {
      tenantId: req.user.tenantId
    });

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer
 * @access  Private (Owner/Admin only)
 */
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    // Check if customer exists and belongs to tenant
    const existing = await customerService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customerService.delete(req.params.id, {
      tenantId: req.user.tenantId
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

/**
 * @route   POST /api/customers/:id/tags
 * @desc    Add tags to customer
 * @access  Private
 */
router.post('/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const customer = await customerService.addTags(req.params.id, tags);

    res.json({
      message: 'Tags added successfully',
      customer
    });
  } catch (error) {
    console.error('Add tags error:', error);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

/**
 * @route   DELETE /api/customers/:id/tags
 * @desc    Remove tags from customer
 * @access  Private
 */
router.delete('/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const customer = await customerService.removeTags(req.params.id, tags);

    res.json({
      message: 'Tags removed successfully',
      customer
    });
  } catch (error) {
    console.error('Remove tags error:', error);
    res.status(500).json({ error: 'Failed to remove tags' });
  }
});

/**
 * @route   GET /api/customers/search
 * @desc    Search customers
 * @access  Private
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search term must be at least 2 characters' });
    }

    const customers = await customerService.search(q, req.user.tenantId, {
      limit: parseInt(limit)
    });

    res.json(customers);
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

/**
 * @route   GET /api/customers/birthday
 * @desc    Get customers with birthdays in specific month
 * @access  Private
 */
router.get('/birthday/:month', async (req, res) => {
  try {
    const month = parseInt(req.params.month);

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const customers = await customerService.findByBirthMonth(month, req.user.tenantId);

    res.json(customers);
  } catch (error) {
    console.error('Get birthday customers error:', error);
    res.status(500).json({ error: 'Failed to fetch birthday customers' });
  }
});

/**
 * @route   POST /api/customers/segment
 * @desc    Get customer segment for bulk messaging
 * @access  Private
 */
router.post('/segment', async (req, res) => {
  try {
    const criteria = req.body;

    const customers = await customerService.getSegment(criteria, req.user.tenantId);

    res.json({
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Get customer segment error:', error);
    res.status(500).json({ error: 'Failed to fetch customer segment' });
  }
});

/**
 * @route   GET /api/customers/:id/channels
 * @desc    Get customer's available communication channels
 * @access  Private
 */
router.get('/:id/channels', async (req, res) => {
  try {
    const channels = await customerService.getAvailableChannels(req.params.id);

    res.json(channels);
  } catch (error) {
    console.error('Get customer channels error:', error);
    res.status(500).json({ error: 'Failed to fetch customer channels' });
  }
});

/**
 * @route   POST /api/customers/:id/visit
 * @desc    Record customer visit
 * @access  Private
 */
router.post('/:id/visit', async (req, res) => {
  try {
    const { amount = 0 } = req.body;

    const customer = await customerService.updateVisitStats(req.params.id, {
      amount
    });

    res.json({
      message: 'Visit recorded successfully',
      customer
    });
  } catch (error) {
    console.error('Record visit error:', error);
    res.status(500).json({ error: 'Failed to record visit' });
  }
});

module.exports = router;