const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { Sale, Customer, Appointment } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const { validate } = require('../middleware/validation');
const { Op } = require('sequelize');
const moment = require('moment');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get sales
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, customerId, paymentStatus } = req.query;
    const where = { userId: req.user.id };

    if (startDate && endDate) {
      where.saleDate = {
        [Op.between]: [moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()]
      };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const sales = await Sale.findAll({
      where,
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['saleDate', 'DESC']]
    });

    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);

    res.json({
      sales,
      summary: {
        totalSales: sales.length,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ message: 'Failed to get sales' });
  }
});

// Get sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: ['customer', 'appointment']
    });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json({ sale });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ message: 'Failed to get sale' });
  }
});

// Create sale
router.post('/', [
  body('customerId').optional().isUUID(),
  body('appointmentId').optional().isUUID(),
  body('items').isArray().notEmpty(),
  body('paymentMethod').isIn(['cash', 'credit_card', 'debit_card', 'electronic_money', 'bank_transfer', 'other']),
  validate
], async (req, res) => {
  try {
    // Verify customer if provided
    if (req.body.customerId) {
      const customer = await Customer.findOne({
        where: {
          id: req.body.customerId,
          userId: req.user.id
        }
      });

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
    }

    // Calculate amounts
    const subtotal = req.body.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const taxAmount = req.body.taxAmount || (subtotal * 0.1); // 10% default tax
    const discountAmount = req.body.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const sale = await Sale.create({
      ...req.body,
      userId: req.user.id,
      subtotal,
      taxAmount,
      totalAmount,
      saleDate: req.body.saleDate || new Date()
    });

    // Update customer statistics
    if (req.body.customerId) {
      const customer = await Customer.findByPk(req.body.customerId);
      const totalSales = await Sale.sum('totalAmount', {
        where: { customerId: req.body.customerId }
      });
      const salesCount = await Sale.count({
        where: { customerId: req.body.customerId }
      });

      await customer.update({
        totalSales,
        averageSpending: totalSales / salesCount,
        lastVisitDate: new Date()
      });
    }

    // Update appointment if linked
    if (req.body.appointmentId) {
      await Appointment.update(
        { status: 'completed' },
        { where: { id: req.body.appointmentId } }
      );
    }

    res.status(201).json({
      message: 'Sale created successfully',
      sale
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ message: 'Failed to create sale' });
  }
});

// Update sale
router.put('/:id', [
  body('paymentStatus').optional().isIn(['paid', 'pending', 'partial', 'refunded']),
  validate
], async (req, res) => {
  try {
    const sale = await Sale.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    await sale.update(req.body);
    res.json({
      message: 'Sale updated successfully',
      sale
    });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ message: 'Failed to update sale' });
  }
});

// Get sales report
router.get('/report/summary', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = moment();
    let startDate, endDate;

    switch (period) {
      case 'day':
        startDate = now.clone().startOf('day');
        endDate = now.clone().endOf('day');
        break;
      case 'week':
        startDate = now.clone().startOf('week');
        endDate = now.clone().endOf('week');
        break;
      case 'month':
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
        break;
      case 'year':
        startDate = now.clone().startOf('year');
        endDate = now.clone().endOf('year');
        break;
      default:
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
    }

    const sales = await Sale.findAll({
      where: {
        userId: req.user.id,
        saleDate: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'average']
      ]
    });

    // Get daily breakdown for the period
    const dailyBreakdown = await Sale.findAll({
      where: {
        userId: req.user.id,
        saleDate: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        }
      },
      attributes: [
        'saleDate',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']
      ],
      group: ['saleDate'],
      order: [['saleDate', 'ASC']]
    });

    // Get top services
    const topServices = await Sale.findAll({
      where: {
        userId: req.user.id,
        saleDate: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        }
      },
      attributes: [],
      include: [{
        model: sequelize.literal(`
          (SELECT json_array_elements(items) as item)
        `),
        attributes: [
          [sequelize.literal(`item->>'name'`), 'serviceName'],
          [sequelize.fn('COUNT', '*'), 'count'],
          [sequelize.fn('SUM', sequelize.literal(`(item->>'price')::numeric`)), 'total']
        ]
      }],
      group: ['serviceName'],
      order: [[sequelize.literal('total'), 'DESC']],
      limit: 10
    });

    res.json({
      period: {
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD')
      },
      summary: sales[0] || { count: 0, total: 0, average: 0 },
      dailyBreakdown,
      topServices
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ message: 'Failed to get sales report' });
  }
});

module.exports = router;