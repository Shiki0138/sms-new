const express = require('express');
const router = express.Router();
const { Customer, Appointment, Sale } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const { Op } = require('sequelize');
const moment = require('moment');
const sequelize = require('../config/database');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'day').startOf('day');
    const thisMonth = moment().startOf('month');
    const nextMonth = moment().add(1, 'month').startOf('month');

    // Today's appointments
    const todayAppointments = await Appointment.findAll({
      where: {
        userId: req.user.id,
        appointmentDate: today.format('YYYY-MM-DD'),
        status: { [Op.notIn]: ['cancelled'] }
      },
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['firstName', 'lastName', 'phoneNumber']
      }],
      order: [['startTime', 'ASC']]
    });

    // Tomorrow's appointments
    const tomorrowAppointments = await Appointment.count({
      where: {
        userId: req.user.id,
        appointmentDate: tomorrow.format('YYYY-MM-DD'),
        status: { [Op.notIn]: ['cancelled'] }
      }
    });

    // Today's sales
    const todaySales = await Sale.findAll({
      where: {
        userId: req.user.id,
        saleDate: today.format('YYYY-MM-DD')
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']
      ]
    });

    // This month's sales
    const monthSales = await Sale.findAll({
      where: {
        userId: req.user.id,
        saleDate: {
          [Op.between]: [thisMonth.toDate(), nextMonth.toDate()]
        }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']
      ]
    });

    // Customer statistics
    const customerStats = await Customer.findAll({
      where: { userId: req.user.id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN "createdAt" >= '${thisMonth.format('YYYY-MM-DD')}'::date THEN 1 END`)), 'newThisMonth']
      ]
    });

    // Recent customers
    const recentCustomers = await Customer.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'firstName', 'lastName', 'createdAt']
    });

    res.json({
      today: {
        appointments: todayAppointments,
        appointmentCount: todayAppointments.length,
        sales: todaySales[0] || { count: 0, total: 0 }
      },
      tomorrow: {
        appointmentCount: tomorrowAppointments
      },
      thisMonth: {
        sales: monthSales[0] || { count: 0, total: 0 }
      },
      customers: {
        total: customerStats[0]?.total || 0,
        newThisMonth: customerStats[0]?.newThisMonth || 0,
        recent: recentCustomers
      }
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ message: 'Failed to get dashboard data' });
  }
});

// Get performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const { period = '7days' } = req.query;
    let startDate, endDate;

    switch (period) {
      case '7days':
        startDate = moment().subtract(7, 'days').startOf('day');
        endDate = moment().endOf('day');
        break;
      case '30days':
        startDate = moment().subtract(30, 'days').startOf('day');
        endDate = moment().endOf('day');
        break;
      case 'thisMonth':
        startDate = moment().startOf('month');
        endDate = moment().endOf('month');
        break;
      case 'lastMonth':
        startDate = moment().subtract(1, 'month').startOf('month');
        endDate = moment().subtract(1, 'month').endOf('month');
        break;
    }

    // Sales trend
    const salesTrend = await Sale.findAll({
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

    // Appointment trend
    const appointmentTrend = await Appointment.findAll({
      where: {
        userId: req.user.id,
        appointmentDate: {
          [Op.between]: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
        }
      },
      attributes: [
        'appointmentDate',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'completed' THEN 1 END`)), 'completed'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelled'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN status = 'no_show' THEN 1 END`)), 'noShow']
      ],
      group: ['appointmentDate'],
      order: [['appointmentDate', 'ASC']]
    });

    // Customer acquisition
    const customerAcquisition = await Customer.findAll({
      where: {
        userId: req.user.id,
        createdAt: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    res.json({
      period: {
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD')
      },
      salesTrend,
      appointmentTrend,
      customerAcquisition
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ message: 'Failed to get metrics' });
  }
});

// Get upcoming appointments
router.get('/appointments/upcoming', async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: {
        userId: req.user.id,
        appointmentDate: {
          [Op.gte]: moment().format('YYYY-MM-DD')
        },
        status: { [Op.notIn]: ['cancelled', 'completed'] }
      },
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
      }],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
      limit: 10
    });

    res.json({ appointments });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ message: 'Failed to get upcoming appointments' });
  }
});

module.exports = router;