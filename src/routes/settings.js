const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { Setting } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const { validate } = require('../middleware/validation');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user settings
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    // Create default settings if not exist
    if (!setting) {
      setting = await Setting.create({ userId: req.user.id });
    }

    res.json({ setting });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to get settings' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    if (!setting) {
      setting = await Setting.create({ userId: req.user.id });
    }

    await setting.update(req.body);
    res.json({
      message: 'Settings updated successfully',
      setting
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// Update business hours
router.put('/business-hours', [
  body('businessHours').isObject(),
  validate
], async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    if (!setting) {
      setting = await Setting.create({ userId: req.user.id });
    }

    await setting.update({ businessHours: req.body.businessHours });
    res.json({
      message: 'Business hours updated successfully',
      businessHours: setting.businessHours
    });
  } catch (error) {
    console.error('Update business hours error:', error);
    res.status(500).json({ message: 'Failed to update business hours' });
  }
});

// Update services
router.put('/services', [
  body('services').isArray(),
  validate
], async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    if (!setting) {
      setting = await Setting.create({ userId: req.user.id });
    }

    await setting.update({ services: req.body.services });
    res.json({
      message: 'Services updated successfully',
      services: setting.services
    });
  } catch (error) {
    console.error('Update services error:', error);
    res.status(500).json({ message: 'Failed to update services' });
  }
});

// Add service
router.post('/services', [
  body('name').notEmpty().trim(),
  body('duration').isInt({ min: 15 }),
  body('price').isFloat({ min: 0 }),
  validate
], async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    if (!setting) {
      setting = await Setting.create({ userId: req.user.id });
    }

    const newService = {
      id: Date.now().toString(),
      name: req.body.name,
      duration: req.body.duration,
      price: req.body.price,
      description: req.body.description || ''
    };

    const services = [...(setting.services || []), newService];
    await setting.update({ services });

    res.json({
      message: 'Service added successfully',
      service: newService,
      services
    });
  } catch (error) {
    console.error('Add service error:', error);
    res.status(500).json({ message: 'Failed to add service' });
  }
});

// Update service
router.put('/services/:serviceId', [
  body('name').optional().trim(),
  body('duration').optional().isInt({ min: 15 }),
  body('price').optional().isFloat({ min: 0 }),
  validate
], async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    if (!setting) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const services = setting.services.map(service => {
      if (service.id === req.params.serviceId) {
        return { ...service, ...req.body };
      }
      return service;
    });

    await setting.update({ services });
    res.json({
      message: 'Service updated successfully',
      services
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Failed to update service' });
  }
});

// Delete service
router.delete('/services/:serviceId', async (req, res) => {
  try {
    let setting = await Setting.findOne({ where: { userId: req.user.id } });
    
    if (!setting) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const services = setting.services.filter(service => 
      service.id !== req.params.serviceId
    );

    await setting.update({ services });
    res.json({
      message: 'Service deleted successfully',
      services
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Failed to delete service' });
  }
});

module.exports = router;