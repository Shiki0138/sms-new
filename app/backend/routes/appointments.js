const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { Appointment, Customer, Setting } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const { validate } = require('../middleware/validation');
const { Op } = require('sequelize');
const moment = require('moment');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get appointments
router.get('/', async (req, res) => {
  try {
    const { date, startDate, endDate, status, customerId } = req.query;
    const where = { userId: req.user.id };

    if (date) {
      where.appointmentDate = moment(date).format('YYYY-MM-DD');
    } else if (startDate && endDate) {
      where.appointmentDate = {
        [Op.between]: [moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()]
      };
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'phoneNumber']
      }],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']]
    });

    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Failed to get appointments' });
  }
});

// Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: ['customer', 'sale', 'medicalRecord']
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Failed to get appointment' });
  }
});

// Create appointment
router.post('/', [
  body('customerId').notEmpty().isUUID(),
  body('appointmentDate').isISO8601(),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('services').isArray(),
  validate
], async (req, res) => {
  try {
    // Verify customer belongs to user
    const customer = await Customer.findOne({
      where: {
        id: req.body.customerId,
        userId: req.user.id
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check for time conflicts
    const appointmentDate = moment(req.body.appointmentDate).format('YYYY-MM-DD');
    const conflict = await Appointment.findOne({
      where: {
        userId: req.user.id,
        appointmentDate,
        status: { [Op.notIn]: ['cancelled'] },
        [Op.or]: [
          {
            startTime: { [Op.lt]: req.body.endTime },
            endTime: { [Op.gt]: req.body.startTime }
          }
        ]
      }
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    // Calculate total amount
    const totalAmount = req.body.services.reduce((sum, service) => 
      sum + (service.price || 0), 0
    );

    const appointment = await Appointment.create({
      ...req.body,
      userId: req.user.id,
      totalAmount,
      status: 'scheduled'
    });

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Failed to create appointment' });
  }
});

// Update appointment
router.put('/:id', [
  body('appointmentDate').optional().isISO8601(),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  validate
], async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // If rescheduling, check for conflicts
    if (req.body.appointmentDate || req.body.startTime || req.body.endTime) {
      const appointmentDate = req.body.appointmentDate || appointment.appointmentDate;
      const startTime = req.body.startTime || appointment.startTime;
      const endTime = req.body.endTime || appointment.endTime;

      const conflict = await Appointment.findOne({
        where: {
          userId: req.user.id,
          id: { [Op.ne]: req.params.id },
          appointmentDate: moment(appointmentDate).format('YYYY-MM-DD'),
          status: { [Op.notIn]: ['cancelled'] },
          [Op.or]: [
            {
              startTime: { [Op.lt]: endTime },
              endTime: { [Op.gt]: startTime }
            }
          ]
        }
      });

      if (conflict) {
        return res.status(400).json({ message: 'Time slot is already booked' });
      }
    }

    // Handle cancellation
    if (req.body.status === 'cancelled') {
      req.body.cancelledAt = new Date();
    }

    await appointment.update(req.body);
    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appointment.destroy();
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Failed to delete appointment' });
  }
});

// Get available time slots
router.get('/slots/available', [
  query('date').isISO8601(),
  validate
], async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { userId: req.user.id } });
    const date = moment(req.query.date);
    const dayOfWeek = date.format('dddd').toLowerCase();
    const businessHours = setting?.businessHours[dayOfWeek];

    if (!businessHours?.isOpen) {
      return res.json({ slots: [] });
    }

    // Get existing appointments for the date
    const appointments = await Appointment.findAll({
      where: {
        userId: req.user.id,
        appointmentDate: date.format('YYYY-MM-DD'),
        status: { [Op.notIn]: ['cancelled'] }
      }
    });

    // Generate available slots
    const slots = [];
    const openTime = moment(businessHours.open, 'HH:mm');
    const closeTime = moment(businessHours.close, 'HH:mm');
    const duration = setting?.appointmentDuration || 60;
    const bufferTime = setting?.bufferTime || 15;

    let current = openTime.clone();
    while (current.add(duration, 'minutes').isSameOrBefore(closeTime)) {
      const startTime = current.format('HH:mm');
      const endTime = current.clone().add(duration, 'minutes').format('HH:mm');

      // Check if slot is available
      const isBooked = appointments.some(apt => {
        const aptStart = moment(apt.startTime, 'HH:mm');
        const aptEnd = moment(apt.endTime, 'HH:mm');
        return current.isBefore(aptEnd) && current.clone().add(duration, 'minutes').isAfter(aptStart);
      });

      if (!isBooked) {
        slots.push({ startTime, endTime });
      }

      current.add(bufferTime, 'minutes');
    }

    res.json({ slots });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ message: 'Failed to get available slots' });
  }
});

module.exports = router;