const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Role definitions and permissions
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  RECEPTIONIST: 'receptionist',
  READ_ONLY: 'read_only'
};

const PERMISSIONS = {
  // Customer management
  'customers:read': 'Read customer information',
  'customers:create': 'Create new customers',
  'customers:update': 'Update customer information',
  'customers:delete': 'Delete customers',
  
  // Medical records
  'medical_records:read': 'Read medical records',
  'medical_records:create': 'Create medical records',
  'medical_records:update': 'Update medical records',
  'medical_records:delete': 'Delete medical records',
  'medical_photos:view': 'View medical photos',
  'medical_photos:upload': 'Upload medical photos',
  'medical_photos:delete': 'Delete medical photos',
  
  // Appointments
  'appointments:read': 'Read appointments',
  'appointments:create': 'Create appointments',
  'appointments:update': 'Update appointments',
  'appointments:delete': 'Delete appointments',
  
  // Messaging
  'messages:read': 'Read messages',
  'messages:send': 'Send messages',
  'messages:bulk_send': 'Send bulk messages',
  'messages:automation': 'Manage message automation',
  'messages:templates': 'Manage message templates',
  
  // Staff management
  'staff:read': 'Read staff information',
  'staff:create': 'Create staff accounts',
  'staff:update': 'Update staff information',
  'staff:delete': 'Delete staff accounts',
  
  // Services
  'services:read': 'Read services',
  'services:create': 'Create services',
  'services:update': 'Update services',
  'services:delete': 'Delete services',
  
  // Reports and analytics
  'reports:read': 'View reports',
  'reports:export': 'Export reports',
  'analytics:view': 'View analytics',
  
  // System administration
  'system:settings': 'Manage system settings',
  'system:users': 'Manage user accounts',
  'system:backups': 'Manage backups',
  'system:logs': 'View system logs',
  
  // Financial
  'payments:read': 'Read payment information',
  'payments:process': 'Process payments',
  'finance:reports': 'View financial reports'
};

// Role permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.keys(PERMISSIONS), // All permissions
  
  [ROLES.ADMIN]: [
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'medical_records:read', 'medical_records:create', 'medical_records:update',
    'medical_photos:view', 'medical_photos:upload', 'medical_photos:delete',
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete',
    'messages:read', 'messages:send', 'messages:bulk_send', 'messages:automation', 'messages:templates',
    'staff:read', 'staff:create', 'staff:update',
    'services:read', 'services:create', 'services:update', 'services:delete',
    'reports:read', 'reports:export', 'analytics:view',
    'payments:read', 'payments:process', 'finance:reports'
  ],
  
  [ROLES.MANAGER]: [
    'customers:read', 'customers:create', 'customers:update',
    'medical_records:read', 'medical_records:create', 'medical_records:update',
    'medical_photos:view', 'medical_photos:upload',
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete',
    'messages:read', 'messages:send', 'messages:bulk_send', 'messages:templates',
    'staff:read',
    'services:read', 'services:create', 'services:update',
    'reports:read', 'analytics:view',
    'payments:read', 'payments:process'
  ],
  
  [ROLES.STAFF]: [
    'customers:read', 'customers:update',
    'medical_records:read', 'medical_records:create', 'medical_records:update',
    'medical_photos:view', 'medical_photos:upload',
    'appointments:read', 'appointments:create', 'appointments:update',
    'messages:read', 'messages:send',
    'services:read',
    'payments:read'
  ],
  
  [ROLES.RECEPTIONIST]: [
    'customers:read', 'customers:create', 'customers:update',
    'appointments:read', 'appointments:create', 'appointments:update',
    'messages:read', 'messages:send',
    'services:read',
    'payments:read', 'payments:process'
  ],
  
  [ROLES.READ_ONLY]: [
    'customers:read',
    'appointments:read',
    'messages:read',
    'services:read',
    'reports:read'
  ]
};

// Data access restrictions based on role
const DATA_ACCESS_RULES = {
  [ROLES.SUPER_ADMIN]: {
    customers: 'all',
    medical_records: 'all',
    appointments: 'all',
    messages: 'all',
    staff: 'all'
  },
  
  [ROLES.ADMIN]: {
    customers: 'all',
    medical_records: 'all',
    appointments: 'all',
    messages: 'all',
    staff: 'all_except_super_admin'
  },
  
  [ROLES.MANAGER]: {
    customers: 'all',
    medical_records: 'assigned_customers',
    appointments: 'all',
    messages: 'department',
    staff: 'department'
  },
  
  [ROLES.STAFF]: {
    customers: 'assigned_only',
    medical_records: 'assigned_customers',
    appointments: 'own_and_assigned',
    messages: 'own_customers',
    staff: 'read_only'
  },
  
  [ROLES.RECEPTIONIST]: {
    customers: 'all',
    medical_records: 'none',
    appointments: 'all',
    messages: 'customer_service',
    staff: 'none'
  },
  
  [ROLES.READ_ONLY]: {
    customers: 'limited_info',
    medical_records: 'none',
    appointments: 'read_only',
    messages: 'none',
    staff: 'none'
  }
};

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '認証トークンが必要です',
        code: 'TOKEN_REQUIRED'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: '無効なトークンです',
          code: 'INVALID_TOKEN'
        });
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || ROLES.READ_ONLY,
        permissions: ROLE_PERMISSIONS[decoded.role] || ROLE_PERMISSIONS[ROLES.READ_ONLY],
        department: decoded.department,
        assignedCustomers: decoded.assignedCustomers || []
      };

      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '認証エラーが発生しました',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Authorization middleware - checks if user has required permission
 */
const authorize = (requiredPermission, options = {}) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '認証が必要です',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Check if user has the required permission
      if (!req.user.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: 'この操作を実行する権限がありません',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermission,
          userRole: req.user.role
        });
      }

      // Additional resource-specific checks
      if (options.resourceCheck) {
        const hasAccess = options.resourceCheck(req, req.user);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'このリソースにアクセスする権限がありません',
            code: 'RESOURCE_ACCESS_DENIED'
          });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '認可エラーが発生しました',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Data filtering middleware - filters data based on user's access level
 */
const filterData = (dataType) => {
  return (req, res, next) => {
    req.dataFilter = {
      type: dataType,
      rules: DATA_ACCESS_RULES[req.user.role] || DATA_ACCESS_RULES[ROLES.READ_ONLY],
      userId: req.user.userId,
      role: req.user.role,
      assignedCustomers: req.user.assignedCustomers || [],
      department: req.user.department
    };
    next();
  };
};

/**
 * Apply data filtering based on user role and access rules
 */
const applyDataFilter = (data, filter) => {
  const accessRule = filter.rules[filter.type];
  
  if (!accessRule || accessRule === 'none') {
    return [];
  }
  
  if (accessRule === 'all') {
    return data;
  }
  
  switch (accessRule) {
    case 'assigned_only':
      return data.filter(item => 
        filter.assignedCustomers.includes(item.customerId) || 
        item.staffId === filter.userId
      );
      
    case 'assigned_customers':
      return data.filter(item => 
        filter.assignedCustomers.includes(item.customerId)
      );
      
    case 'own_and_assigned':
      return data.filter(item => 
        item.staffId === filter.userId || 
        filter.assignedCustomers.includes(item.customerId)
      );
      
    case 'department':
      return data.filter(item => 
        item.department === filter.department
      );
      
    case 'own_customers':
      return data.filter(item => 
        item.handledBy === filter.userId || 
        filter.assignedCustomers.includes(item.customerId)
      );
      
    case 'customer_service':
      return data.filter(item => 
        item.type === 'customer_inquiry' || 
        item.channel === 'reception'
      );
      
    case 'limited_info':
      return data.map(item => ({
        id: item.id,
        name: item.name,
        phone: item.phone?.replace(/(\d{3})-\d{4}-(\d{4})/, '$1-****-$2'),
        lastVisit: item.lastVisit
      }));
      
    case 'read_only':
      return data.map(item => ({ ...item, _readonly: true }));
      
    default:
      return data;
  }
};

/**
 * Medical records access control
 */
const medicalRecordsAccess = (req, res, next) => {
  const customerId = parseInt(req.params.customerId);
  
  // Super admin and admin have full access
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
    return next();
  }
  
  // Staff can only access assigned customers' records
  if (req.user.role === ROLES.STAFF) {
    if (!req.user.assignedCustomers.includes(customerId)) {
      return res.status(403).json({
        success: false,
        message: '割り当てられていない顧客の医療記録にはアクセスできません',
        code: 'CUSTOMER_NOT_ASSIGNED'
      });
    }
  }
  
  // Receptionist has no access to medical records
  if (req.user.role === ROLES.RECEPTIONIST || req.user.role === ROLES.READ_ONLY) {
    return res.status(403).json({
      success: false,
      message: '医療記録へのアクセス権限がありません',
      code: 'MEDICAL_RECORDS_ACCESS_DENIED'
    });
  }
  
  next();
};

/**
 * Sensitive data masking
 */
const maskSensitiveData = (data, userRole) => {
  if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, userRole));
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked = { ...data };
    
    // Mask sensitive fields based on role
    if (userRole === ROLES.RECEPTIONIST || userRole === ROLES.READ_ONLY) {
      if (masked.email) {
        masked.email = masked.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      }
      if (masked.phone) {
        masked.phone = masked.phone.replace(/(\d{3})-\d{4}-(\d{4})/, '$1-****-$2');
      }
      delete masked.medicalHistory;
      delete masked.allergies;
      delete masked.medications;
    }
    
    if (userRole === ROLES.STAFF) {
      // Staff can see medical info but not personal financial info
      delete masked.paymentMethods;
      delete masked.billingAddress;
    }
    
    return masked;
  }
  
  return data;
};

/**
 * Audit logging middleware
 */
const auditLog = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action
      logUserAction({
        userId: req.user?.userId,
        userRole: req.user?.role,
        action,
        resource: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        success: res.statusCode < 400,
        statusCode: res.statusCode
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Rate limiting based on role
 */
const roleBasedRateLimit = (req, res, next) => {
  const limits = {
    [ROLES.SUPER_ADMIN]: 1000,
    [ROLES.ADMIN]: 500,
    [ROLES.MANAGER]: 300,
    [ROLES.STAFF]: 200,
    [ROLES.RECEPTIONIST]: 150,
    [ROLES.READ_ONLY]: 100
  };
  
  const userLimit = limits[req.user?.role] || limits[ROLES.READ_ONLY];
  
  // Implement rate limiting logic here
  // This would integrate with express-rate-limit or similar
  next();
};

/**
 * Helper function to log user actions
 */
function logUserAction(actionData) {
  // In production, this would write to a secure audit log
  console.log('AUDIT LOG:', JSON.stringify(actionData, null, 2));
}

/**
 * Check if user can access specific customer data
 */
function canAccessCustomer(userId, userRole, assignedCustomers, customerId) {
  if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
    return true;
  }
  
  if (userRole === ROLES.MANAGER) {
    // Managers can access all customers in their department
    return true;
  }
  
  if (userRole === ROLES.STAFF) {
    return assignedCustomers.includes(customerId);
  }
  
  if (userRole === ROLES.RECEPTIONIST) {
    return true; // Receptionists can access customer contact info
  }
  
  return false;
}

/**
 * Middleware to check customer access
 */
const checkCustomerAccess = (req, res, next) => {
  const customerId = parseInt(req.params.customerId);
  
  if (!canAccessCustomer(
    req.user.userId,
    req.user.role,
    req.user.assignedCustomers,
    customerId
  )) {
    return res.status(403).json({
      success: false,
      message: 'この顧客の情報にアクセスする権限がありません',
      code: 'CUSTOMER_ACCESS_DENIED'
    });
  }
  
  next();
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  DATA_ACCESS_RULES,
  authenticate,
  authorize,
  filterData,
  applyDataFilter,
  medicalRecordsAccess,
  maskSensitiveData,
  auditLog,
  roleBasedRateLimit,
  checkCustomerAccess,
  canAccessCustomer
};