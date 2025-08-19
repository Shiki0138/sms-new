const express = require('express');
const router = express.Router();
const { serviceService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { 
  validateServiceCreate, 
  validateServiceUpdate 
} = require('../middleware/validation');
const { requireRole } = require('../middleware/supabase-auth');

/**
 * @route   GET /api/services
 * @desc    Get all services
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { category, active = 'true' } = req.query;

    const options = {
      tenantId: req.user.tenantId,
      orderBy: 'category',
      orderDirection: 'asc'
    };

    if (active === 'true') {
      options.filters = { is_active: true };
    }

    let services;
    if (category) {
      services = await serviceService.findByCategory(category, req.user.tenantId);
    } else {
      const result = await serviceService.findAll(options);
      services = result.data;
    }

    // Group by category
    const grouped = services.reduce((acc, service) => {
      const cat = service.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {});

    res.json({
      services,
      grouped,
      total: services.length
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

/**
 * @route   GET /api/services/categories
 * @desc    Get service categories
 * @access  Private
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await serviceService.getCategories(req.user.tenantId);

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * @route   GET /api/services/popular
 * @desc    Get popular services
 * @access  Private
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularServices = await serviceService.getPopularServices(
      req.user.tenantId,
      parseInt(limit)
    );

    res.json(popularServices);
  } catch (error) {
    console.error('Get popular services error:', error);
    res.status(500).json({ error: 'Failed to fetch popular services' });
  }
});

/**
 * @route   GET /api/services/search
 * @desc    Search services
 * @access  Private
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ 
        error: 'Search term must be at least 2 characters' 
      });
    }

    const services = await serviceService.search(q, req.user.tenantId);

    res.json(services);
  } catch (error) {
    console.error('Search services error:', error);
    res.status(500).json({ error: 'Failed to search services' });
  }
});

/**
 * @route   GET /api/services/:id
 * @desc    Get single service
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const service = await serviceService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get service statistics
    const stats = await serviceService.getServiceStats(req.params.id);

    res.json({
      ...service,
      stats
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

/**
 * @route   POST /api/services
 * @desc    Create new service
 * @access  Private (Owner/Admin only)
 */
router.post('/', 
  requireRole(['owner', 'admin']), 
  validateServiceCreate, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const serviceData = {
        ...req.body,
        tenant_id: req.user.tenantId
      };

      const service = await serviceService.create(serviceData);

      res.status(201).json({
        message: 'Service created successfully',
        service
      });
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
});

/**
 * @route   PUT /api/services/:id
 * @desc    Update service
 * @access  Private (Owner/Admin only)
 */
router.put('/:id', 
  requireRole(['owner', 'admin']), 
  validateServiceUpdate, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if service exists
      const existing = await serviceService.findById(req.params.id, {
        tenantId: req.user.tenantId
      });

      if (!existing) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const service = await serviceService.update(req.params.id, req.body, {
        tenantId: req.user.tenantId
      });

      res.json({
        message: 'Service updated successfully',
        service
      });
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ error: 'Failed to update service' });
    }
});

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service (soft delete by deactivating)
 * @access  Private (Owner only)
 */
router.delete('/:id', requireRole('owner'), async (req, res) => {
  try {
    // Soft delete by deactivating
    const service = await serviceService.setActiveStatus(req.params.id, false);

    res.json({
      message: 'Service deactivated successfully',
      service
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

/**
 * @route   PUT /api/services/:id/activate
 * @desc    Activate service
 * @access  Private (Owner/Admin only)
 */
router.put('/:id/activate', 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
    try {
      const service = await serviceService.setActiveStatus(req.params.id, true);

      res.json({
        message: 'Service activated successfully',
        service
      });
    } catch (error) {
      console.error('Activate service error:', error);
      res.status(500).json({ error: 'Failed to activate service' });
    }
});

/**
 * @route   PUT /api/services/:id/price
 * @desc    Update service price
 * @access  Private (Owner/Admin only)
 */
router.put('/:id/price', 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
    try {
      const { price } = req.body;

      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Invalid price' });
      }

      const service = await serviceService.updatePrice(req.params.id, price);

      res.json({
        message: 'Price updated successfully',
        service
      });
    } catch (error) {
      console.error('Update price error:', error);
      res.status(500).json({ error: 'Failed to update price' });
    }
});

/**
 * @route   POST /api/services/package
 * @desc    Create service package
 * @access  Private (Owner/Admin only)
 */
router.post('/package', 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
    try {
      const { name, description, services, totalPrice } = req.body;

      if (!name || !services || !Array.isArray(services) || services.length < 2) {
        return res.status(400).json({ 
          error: 'Package must have a name and at least 2 services' 
        });
      }

      const packageData = {
        name,
        description,
        services,
        totalPrice,
        tenantId: req.user.tenantId
      };

      const package = await serviceService.createPackage(packageData);

      res.status(201).json({
        message: 'Service package created successfully',
        package
      });
    } catch (error) {
      console.error('Create package error:', error);
      res.status(500).json({ error: 'Failed to create package' });
    }
});

/**
 * @route   GET /api/services/:id/price-history
 * @desc    Get service price history
 * @access  Private
 */
router.get('/:id/price-history', async (req, res) => {
  try {
    const history = await serviceService.getPriceHistory(req.params.id);

    res.json(history);
  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

/**
 * @route   GET /api/services/:id/stats
 * @desc    Get service statistics
 * @access  Private
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await serviceService.getServiceStats(req.params.id);

    res.json(stats);
  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({ error: 'Failed to fetch service statistics' });
  }
});

module.exports = router;