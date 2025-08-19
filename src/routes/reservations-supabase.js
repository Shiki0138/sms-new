const express = require('express');
const router = express.Router();
const { reservationService, customerService, staffService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { 
  validateReservationCreate, 
  validateReservationUpdate 
} = require('../middleware/validation');
const moment = require('moment');

/**
 * @route   GET /api/reservations
 * @desc    Get reservations with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      staffId, 
      customerId,
      page = 1, 
      limit = 20 
    } = req.query;

    // Default date range if not provided
    const start = startDate || moment().startOf('month').toISOString();
    const end = endDate || moment().endOf('month').toISOString();

    const options = {
      tenantId: req.user.tenantId,
      select: '*, customers(*), staff(*), services(*)',
      filters: {}
    };

    if (status) {
      options.filters.status = status;
    }
    if (staffId) {
      options.filters.staff_id = staffId;
    }
    if (customerId) {
      options.filters.customer_id = customerId;
    }

    const reservations = await reservationService.findByDateRange(
      start, 
      end, 
      req.user.tenantId,
      options
    );

    res.json({
      data: reservations,
      startDate: start,
      endDate: end,
      total: reservations.length
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

/**
 * @route   GET /api/reservations/:id
 * @desc    Get single reservation
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const reservation = await reservationService.findById(req.params.id, {
      tenantId: req.user.tenantId,
      select: '*, customers(*), staff(*), services(*)'
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

/**
 * @route   POST /api/reservations
 * @desc    Create new reservation
 * @access  Private
 */
router.post('/', validateReservationCreate, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      customerId, 
      staffId, 
      serviceId, 
      startTime, 
      duration,
      notes,
      price 
    } = req.body;

    // Calculate end time
    const start = moment(startTime);
    const end = start.clone().add(duration || 60, 'minutes');

    // Check staff availability
    if (staffId) {
      const isAvailable = await reservationService.checkAvailability({
        staffId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });

      if (!isAvailable) {
        return res.status(409).json({ 
          error: 'Staff member is not available at this time' 
        });
      }
    }

    // Create reservation
    const reservationData = {
      tenant_id: req.user.tenantId,
      customer_id: customerId,
      staff_id: staffId,
      service_id: serviceId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'confirmed',
      notes,
      price
    };

    const reservation = await reservationService.create(reservationData);

    // Update customer visit stats
    await customerService.updateVisitStats(customerId, { amount: price || 0 });

    res.status(201).json({
      message: 'Reservation created successfully',
      reservation
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * @route   PUT /api/reservations/:id
 * @desc    Update reservation
 * @access  Private
 */
router.put('/:id', validateReservationUpdate, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if reservation exists
    const existing = await reservationService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const updates = req.body;

    // If changing time, check availability
    if (updates.startTime || updates.staffId) {
      const staffId = updates.staffId || existing.staff_id;
      const startTime = updates.startTime || existing.start_time;
      const duration = updates.duration || 
        moment(existing.end_time).diff(moment(existing.start_time), 'minutes');
      
      const endTime = moment(startTime).add(duration, 'minutes').toISOString();

      const isAvailable = await reservationService.checkAvailability({
        staffId,
        startTime,
        endTime,
        excludeReservationId: req.params.id
      });

      if (!isAvailable) {
        return res.status(409).json({ 
          error: 'Staff member is not available at this time' 
        });
      }

      updates.start_time = startTime;
      updates.end_time = endTime;
    }

    const reservation = await reservationService.update(req.params.id, updates, {
      tenantId: req.user.tenantId
    });

    res.json({
      message: 'Reservation updated successfully',
      reservation
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

/**
 * @route   POST /api/reservations/:id/cancel
 * @desc    Cancel reservation
 * @access  Private
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;

    // Check if reservation exists
    const existing = await reservationService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!existing) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Reservation is already cancelled' });
    }

    const updates = {
      status: 'cancelled',
      notes: existing.notes ? `${existing.notes}\nCancelled: ${reason || 'No reason provided'}` : `Cancelled: ${reason || 'No reason provided'}`
    };

    const reservation = await reservationService.update(req.params.id, updates, {
      tenantId: req.user.tenantId
    });

    res.json({
      message: 'Reservation cancelled successfully',
      reservation
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

/**
 * @route   POST /api/reservations/:id/complete
 * @desc    Mark reservation as completed
 * @access  Private
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { actualPrice, notes } = req.body;

    const updates = {
      status: 'completed',
      price: actualPrice || undefined,
      notes: notes || undefined
    };

    const reservation = await reservationService.update(req.params.id, updates, {
      tenantId: req.user.tenantId
    });

    res.json({
      message: 'Reservation completed successfully',
      reservation
    });
  } catch (error) {
    console.error('Complete reservation error:', error);
    res.status(500).json({ error: 'Failed to complete reservation' });
  }
});

/**
 * @route   POST /api/reservations/:id/no-show
 * @desc    Mark reservation as no-show
 * @access  Private
 */
router.post('/:id/no-show', async (req, res) => {
  try {
    const reservation = await reservationService.updateStatus(req.params.id, 'no_show');

    res.json({
      message: 'Reservation marked as no-show',
      reservation
    });
  } catch (error) {
    console.error('No-show reservation error:', error);
    res.status(500).json({ error: 'Failed to mark reservation as no-show' });
  }
});

/**
 * @route   GET /api/reservations/available-slots
 * @desc    Get available time slots
 * @access  Private
 */
router.get('/available-slots', async (req, res) => {
  try {
    const { date, staffId, serviceId } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({ 
        error: 'Date and service ID are required' 
      });
    }

    const slots = await reservationService.getAvailableSlots({
      date,
      staffId,
      serviceId,
      tenantId: req.user.tenantId
    });

    res.json(slots);
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

/**
 * @route   GET /api/reservations/upcoming
 * @desc    Get upcoming reservations
 * @access  Private
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const startDate = moment().toISOString();
    const endDate = moment().add(parseInt(days), 'days').toISOString();

    const reservations = await reservationService.findByDateRange(
      startDate,
      endDate,
      req.user.tenantId,
      {
        select: '*, customers(name, phone_number), staff(name), services(name)',
        filters: {
          status: ['pending', 'confirmed']
        }
      }
    );

    res.json(reservations);
  } catch (error) {
    console.error('Get upcoming reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming reservations' });
  }
});

/**
 * @route   GET /api/reservations/calendar
 * @desc    Get calendar view of reservations
 * @access  Private
 */
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;

    const startDate = moment()
      .year(year || moment().year())
      .month(month ? month - 1 : moment().month())
      .startOf('month')
      .toISOString();

    const endDate = moment(startDate)
      .endOf('month')
      .toISOString();

    const reservations = await reservationService.findByDateRange(
      startDate,
      endDate,
      req.user.tenantId,
      {
        select: 'id, start_time, end_time, status, customers(name), staff(name, color), services(name)'
      }
    );

    // Group by date for calendar view
    const calendar = {};
    reservations.forEach(reservation => {
      const date = moment(reservation.start_time).format('YYYY-MM-DD');
      if (!calendar[date]) {
        calendar[date] = [];
      }
      calendar[date].push(reservation);
    });

    res.json({
      month: moment(startDate).format('YYYY-MM'),
      reservations: calendar
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

/**
 * @route   GET /api/reservations/stats
 * @desc    Get reservation statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const stats = await reservationService.getStatistics(req.user.tenantId, period);

    res.json(stats);
  } catch (error) {
    console.error('Get reservation stats error:', error);
    res.status(500).json({ error: 'Failed to fetch reservation statistics' });
  }
});

module.exports = router;