const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorMiddleware');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createCustomer,
  findCustomerById,
  findCustomerByEmail,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerStats,
  updateCustomerVisitStats
} = require('../models/customerModel');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const createCustomerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('preferences.communicationMethod').optional().isIn(['email', 'sms', 'phone']).withMessage('Invalid communication method'),
  body('preferences.allergies').optional().isArray().withMessage('Allergies must be an array'),
  body('notes').optional().trim()
];

const updateCustomerValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('preferences.communicationMethod').optional().isIn(['email', 'sms', 'phone']).withMessage('Invalid communication method'),
  body('preferences.allergies').optional().isArray().withMessage('Allergies must be an array'),
  body('notes').optional().trim()
];

const customerIdValidation = [
  param('id').isUUID(4).withMessage('Valid customer ID is required')
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('sortBy').optional().isIn(['firstName', 'lastName', 'email', 'createdAt', 'lastVisit', 'totalSpent']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

/**
 * @route   POST /api/customers
 * @desc    Create a new customer
 * @access  Private (Staff, Admin)
 */
router.post('/', 
  authorizeRoles(['staff', 'admin']),
  createCustomerValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const customer = await createCustomer(req.body);

    res.status(201).json({
      message: 'Customer created successfully',
      customer
    });
  })
);

/**
 * @route   GET /api/customers
 * @desc    Get all customers with filters and pagination
 * @access  Private (Staff, Admin)
 */
router.get('/',
  authorizeRoles(['staff', 'admin']),
  queryValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const filters = {
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      sortBy,
      sortOrder,
      startDate,
      endDate
    };

    const customers = await getAllCustomers(filters);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: customers.length === parseInt(limit)
      },
      filters: {
        search,
        isActive: filters.isActive,
        sortBy,
        sortOrder
      }
    });
  })
);

/**
 * @route   GET /api/customers/stats
 * @desc    Get customer statistics
 * @access  Private (Staff, Admin)
 */
router.get('/stats',
  authorizeRoles(['staff', 'admin']),
  asyncHandler(async (req, res) => {
    const stats = await getCustomerStats();
    
    res.json({
      stats
    });
  })
);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private (Staff, Admin, or own record for customers)
 */
router.get('/:id',
  customerIdValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const customer = await findCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Check permissions - customers can only view their own record
    if (req.user.role === 'customer' && customer.email !== req.user.email) {
      return res.status(403).json({
        error: 'Access denied - not authorized to view this customer',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      customer
    });
  })
);

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private (Staff, Admin)
 */
router.put('/:id',
  authorizeRoles(['staff', 'admin']),
  customerIdValidation,
  updateCustomerValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const customer = await updateCustomer(req.params.id, req.body);

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  })
);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id',
  authorizeRoles(['admin']),
  customerIdValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    await deleteCustomer(req.params.id);

    res.json({
      message: 'Customer deleted successfully'
    });
  })
);

/**
 * @route   POST /api/customers/:id/visit
 * @desc    Update customer visit statistics
 * @access  Private (Staff, Admin)
 */
router.post('/:id/visit',
  authorizeRoles(['staff', 'admin']),
  customerIdValidation,
  [
    body('amountSpent').optional().isFloat({ min: 0 }).withMessage('Amount spent must be a positive number')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const { amountSpent = 0 } = req.body;
    
    const customer = await updateCustomerVisitStats(req.params.id, amountSpent);

    res.json({
      message: 'Customer visit recorded successfully',
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        totalVisits: customer.totalVisits,
        totalSpent: customer.totalSpent,
        lastVisit: customer.lastVisit
      }
    });
  })
);

/**
 * @route   GET /api/customers/search/:query
 * @desc    Search customers by name, email, or phone
 * @access  Private (Staff, Admin)
 */
router.get('/search/:query',
  authorizeRoles(['staff', 'admin']),
  [
    param('query').trim().notEmpty().withMessage('Search query is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const { query } = req.params;
    const { limit = 10 } = req.query;

    const customers = await getAllCustomers({
      search: query,
      limit: parseInt(limit),
      isActive: true
    });

    res.json({
      query,
      customers: customers.map(customer => ({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        totalVisits: customer.totalVisits,
        lastVisit: customer.lastVisit
      }))
    });
  })
);

/**
 * @route   GET /api/customers/email/:email
 * @desc    Find customer by email
 * @access  Private (Staff, Admin)
 */
router.get('/email/:email',
  authorizeRoles(['staff', 'admin']),
  [
    param('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw handleValidationErrors(errors.array());
    }

    const customer = await findCustomerByEmail(req.params.email);
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
    }

    res.json({
      customer
    });
  })
);

module.exports = router;