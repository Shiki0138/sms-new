const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { Customer } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const { validate } = require('../middleware/validation');
const { Op } = require('sequelize');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { firstNameKana: { [Op.iLike]: `%${search}%` } },
        { lastNameKana: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    res.json({
      customers: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Failed to get customers' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: ['appointments', 'sales', 'medicalRecords']
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Failed to get customer' });
  }
});

// Create customer
router.post('/', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phoneNumber').notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  validate
], async (req, res) => {
  try {
    // Check customer limit for light plan
    if (req.user.planType === 'light') {
      const customerCount = await Customer.count({ where: { userId: req.user.id } });
      if (customerCount >= 300) {
        return res.status(403).json({ 
          message: 'Customer limit reached. Please upgrade your plan.' 
        });
      }
    }

    const customerData = {
      ...req.body,
      userId: req.user.id
    };

    const customer = await Customer.create(customerData);
    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('phoneNumber').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  validate
], async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.update(req.body);
    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Soft delete by marking as inactive
    await customer.update({ isActive: false });
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// Get customer statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: ['appointments', 'sales']
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const stats = {
      totalVisits: customer.visitCount,
      totalSpending: customer.totalSales,
      averageSpending: customer.averageSpending,
      lastVisit: customer.lastVisitDate,
      upcomingAppointments: customer.appointments?.filter(a => 
        a.status === 'scheduled' && new Date(a.appointmentDate) > new Date()
      ).length || 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ message: 'Failed to get customer statistics' });
  }
});

module.exports = router;