const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorMiddleware');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createAppointment,
  findAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAppointments,
  getAvailableSlots,
  getAppointmentStats,
  getAllServices,
  getAllStaff
} = require('../models/appointmentModel');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const createAppointmentValidation = [
  body('customerId').isUUID(4).withMessage('Valid customer ID is required'),
  body('staffId').isUUID(4).withMessage('Valid staff ID is required'),
  body('serviceIds').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('serviceIds.*').isUUID(4).withMessage('All service IDs must be valid UUIDs'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('notes').optional().trim()
];

const updateAppointmentValidation = [
  body('staffId').optional().isUUID(4).withMessage('Valid staff ID is required'),
  body('serviceIds').optional().isArray({ min: 1 }).withMessage('At least one service is required'),
  body('serviceIds.*').optional().isUUID(4).withMessage('All service IDs must be valid UUIDs'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status'),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'refunded']).withMessage('Invalid payment status'),
  body('notes').optional().trim()
];

const appointmentIdValidation = [
  param('id').isUUID(4).withMessage('Valid appointment ID is required')
];

const availabilityValidation = [
  param('staffId').isUUID(4).withMessage('Valid staff ID is required'),
  param('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  query('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes')
];

/**
 * @route   GET /api/appointments/services
 * @desc    Get all available services
 * @access  Private
 */
router.get('/services', asyncHandler(async (req, res) => {
  const services = await getAllServices();
  
  res.json({
    services
  });
}));

/**
 * @route   GET /api/appointments/staff
 * @desc    Get all active staff members
 * @access  Private
 */
router.get('/staff', asyncHandler(async (req, res) => {
  const staff = await getAllStaff();
  
  res.json({
    staff
  });
}));

/**
 * @route   GET /api/appointments/availability/:staffId/:date
 * @desc    Get available time slots for a staff member on a specific date
 * @access  Private
 */
router.get('/availability/:staffId/:date',
  availabilityValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const { staffId, date } = req.params;
    const { duration = 60 } = req.query;

    const slots = await getAvailableSlots(staffId, date, parseInt(duration));

    res.json({
      staffId,
      date,
      duration: parseInt(duration),
      availableSlots: slots
    });
  })
);

/**
 * @route   GET /api/appointments/stats
 * @desc    Get appointment statistics
 * @access  Private (Staff, Admin)
 */
router.get('/stats',
  authorizeRoles(['staff', 'admin']),
  asyncHandler(async (req, res) => {
    const stats = await getAppointmentStats();
    
    res.json({
      stats
    });
  })
);

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment
 * @access  Private (Staff, Admin)
 */
router.post('/',
  authorizeRoles(['staff', 'admin']),
  createAppointmentValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const appointment = await createAppointment(req.body);

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  })
);

/**
 * @route   GET /api/appointments
 * @desc    Get appointments with filters and pagination
 * @access  Private
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('customerId').optional().isUUID(4).withMessage('Valid customer ID is required'),
    query('staffId').optional().isUUID(4).withMessage('Valid staff ID is required'),
    query('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
    query('sortBy').optional().isIn(['startTime', 'createdAt', 'totalPrice']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const {
      page = 1,
      limit = 20,
      customerId,
      staffId,
      status,
      startDate,
      endDate,
      sortBy = 'startTime',
      sortOrder = 'asc',
      search
    } = req.query;

    // For customers, only show their own appointments
    let filters = {
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      customerId: req.user.role === 'customer' ? req.user.userId : customerId,
      staffId,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      search
    };

    const appointments = await getAppointments(filters);

    res.json({
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: appointments.length === parseInt(limit)
      },
      filters: {
        customerId: filters.customerId,
        staffId,
        status,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });
  })
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private (Staff, Admin, or appointment owner)
 */
router.get('/:id',
  appointmentIdValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Check permissions - customers can only view their own appointments
    if (req.user.role === 'customer' && appointment.customerId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied - not authorized to view this appointment',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      appointment
    });
  })
);

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment
 * @access  Private (Staff, Admin)
 */
router.put('/:id',
  authorizeRoles(['staff', 'admin']),
  appointmentIdValidation,
  updateAppointmentValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const appointment = await updateAppointment(req.params.id, req.body);

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  })
);

/**
 * @route   PUT /api/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private (Staff, Admin)
 */
router.put('/:id/status',
  authorizeRoles(['staff', 'admin']),
  appointmentIdValidation,
  [
    body('status').isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status'),
    body('notes').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const { status, notes } = req.body;
    const updateData = { status };
    
    if (notes) {
      updateData.notes = notes;
    }

    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
    }

    const appointment = await updateAppointment(req.params.id, updateData);

    res.json({
      message: `Appointment ${status} successfully`,
      appointment: {
        id: appointment.id,
        status: appointment.status,
        startTime: appointment.startTime,
        totalPrice: appointment.totalPrice
      }
    });
  })
);

/**
 * @route   PUT /api/appointments/:id/cancel
 * @desc    Cancel appointment
 * @access  Private (Staff, Admin, or appointment owner)
 */
router.put('/:id/cancel',
  appointmentIdValidation,
  [
    body('reason').optional().isString().withMessage('Cancellation reason must be a string')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const appointment = await findAppointmentById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Check permissions - customers can only cancel their own appointments
    if (req.user.role === 'customer' && appointment.customerId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied - not authorized to cancel this appointment',
        code: 'ACCESS_DENIED'
      });
    }

    const { reason = 'Cancelled by user' } = req.body;
    const cancelledAppointment = await cancelAppointment(req.params.id, reason);

    res.json({
      message: 'Appointment cancelled successfully',
      appointment: {
        id: cancelledAppointment.id,
        status: cancelledAppointment.status,
        cancelledAt: cancelledAppointment.cancelledAt,
        cancellationReason: cancelledAppointment.cancellationReason
      }
    });
  })
);

/**
 * @route   GET /api/appointments/customer/:customerId
 * @desc    Get appointments for a specific customer
 * @access  Private (Staff, Admin, or customer themselves)
 */
router.get('/customer/:customerId',
  [
    param('customerId').isUUID(4).withMessage('Valid customer ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const { customerId } = req.params;
    const { limit = 20, status } = req.query;

    // Check permissions - customers can only view their own appointments
    if (req.user.role === 'customer' && customerId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied - not authorized to view these appointments',
        code: 'ACCESS_DENIED'
      });
    }

    const appointments = await getAppointments({
      customerId,
      status,
      limit: parseInt(limit),
      sortBy: 'startTime',
      sortOrder: 'desc'
    });

    res.json({
      customerId,
      appointments: appointments.map(apt => ({
        id: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        services: apt.services.map(s => s.name),
        totalPrice: apt.totalPrice,
        status: apt.status,
        staff: apt.staffId
      }))
    });
  })
);

module.exports = router;