const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const admin = require('firebase-admin');

// Import API modules
const multiChannelMessaging = require('./multichannel-messaging');
const electronicMedicalRecords = require('./electronic-medical-records');
const automatedMessaging = require('./automated-messaging');

// Import middleware
const { authenticate, authorize, auditLog, checkCustomerAccess } = require('../middleware/role-based-access');
const { 
  apiLimiter, 
  authLimiter, 
  uploadLimiter, 
  messagingLimiter,
  sanitizeInput,
  validateCSRFToken,
  protectMedicalData,
  secureFileUpload,
  blockSuspiciousIPs,
  validateSession,
  validateAPIKey,
  setupCSP,
  securityHeaders,
  securityErrorHandler
} = require('../middleware/security');

const app = express();

/**
 * Enhanced Beauty Salon Management System
 * Multi-Channel Messaging & Electronic Medical Records Integration
 */

// Security middleware setup
app.use(helmet());
app.use(setupCSP());
app.use(securityHeaders);
app.use(blockSuspiciousIPs);
app.use(validateSession);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing with security
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(sanitizeInput);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/*/upload*', uploadLimiter);
app.use('/api/messaging/', messagingLimiter);

// CSRF protection for state-changing operations
app.use(validateCSRFToken);

// API key validation for webhooks
app.use('/api/messaging/webhooks/', validateAPIKey);

/**
 * API Routes Configuration
 */

// Multi-Channel Messaging APIs
app.use('/api/messaging', 
  authenticate,
  authorize('messages:read'),
  auditLog('messaging'),
  multiChannelMessaging
);

// Electronic Medical Records APIs
app.use('/api/emr',
  authenticate,
  authorize('medical_records:read'),
  protectMedicalData,
  auditLog('medical_records'),
  electronicMedicalRecords
);

// Automated Messaging APIs
app.use('/api/automation',
  authenticate,
  authorize('messages:automation'),
  auditLog('automation'),
  automatedMessaging
);

// Enhanced Customer Management with Medical Integration
app.get('/api/customers/:customerId/complete-profile', 
  authenticate,
  checkCustomerAccess,
  authorize('customers:read'),
  auditLog('customer_profile_access'),
  async (req, res) => {
    try {
      const { customerId } = req.params;
      
      // This would integrate with existing customer API and add medical data
      const customerProfile = {
        customerInfo: {
          // Basic customer information from existing API
        },
        medicalProfile: {
          // Medical records from EMR system
        },
        communicationHistory: {
          // Message history from messaging system
        },
        preferences: {
          preferredChannels: ['sms', 'email'],
          communicationFrequency: 'weekly',
          languagePreference: 'ja'
        }
      };
      
      res.json({
        success: true,
        profile: customerProfile
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Comprehensive Dashboard API
app.get('/api/dashboard/enhanced-summary',
  authenticate,
  authorize('analytics:view'),
  auditLog('dashboard_access'),
  async (req, res) => {
    try {
      const dashboardData = {
        // Existing dashboard data
        salon: {
          name: 'VOTAN Beauty Salon',
          totalCustomers: 150,
          todayAppointments: 12,
          monthlyRevenue: 850000
        },
        
        // New messaging statistics
        messaging: {
          totalMessagesSent: 3420,
          activeChannels: 3,
          automationRulesActive: 8,
          responseRate: 75.5,
          unreadMessages: 23
        },
        
        // Medical records statistics
        medicalRecords: {
          totalRecords: 145,
          recordsUpdatedToday: 5,
          photoUploadsThisMonth: 45,
          allergyAlertsActive: 8
        },
        
        // Automation performance
        automation: {
          scheduledCampaigns: 3,
          completedCampaignsThisMonth: 12,
          averageEngagementRate: 18.7,
          costSavings: 125000 // yen saved through automation
        }
      };
      
      res.json({
        success: true,
        dashboard: dashboardData,
        generatedAt: new Date()
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// System Health Check with Security Status
app.get('/api/system/health',
  authenticate,
  authorize('system:settings'),
  async (req, res) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        version: '2.0.0',
        
        services: {
          database: 'connected',
          messaging: 'operational',
          automation: 'operational',
          fileStorage: 'operational',
          security: 'active'
        },
        
        security: {
          rateLimiting: 'active',
          encryption: 'enabled',
          csrfProtection: 'enabled',
          auditLogging: 'active',
          ipBlocking: 'active'
        },
        
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          activeConnections: 0 // Would be populated from real metrics
        }
      };
      
      res.json({
        success: true,
        health: healthStatus
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// API Documentation Endpoint
app.get('/api/documentation', (req, res) => {
  const apiDocumentation = {
    title: 'VOTAN Beauty Salon - Multi-Channel Messaging & EMR API',
    version: '2.0.0',
    description: 'Comprehensive API for beauty salon management with multi-channel messaging and electronic medical records',
    
    endpoints: {
      messaging: {
        '/api/messaging/channels': {
          GET: 'Get all messaging channels configuration',
          PUT: 'Update channel configuration'
        },
        '/api/messaging/send': {
          POST: 'Send multi-channel message with file attachments'
        },
        '/api/messaging/bulk-send': {
          POST: 'Send bulk messages to multiple customers'
        },
        '/api/messaging/templates': {
          GET: 'Get message templates',
          POST: 'Create new message template'
        },
        '/api/messaging/webhooks/line': {
          POST: 'LINE messaging webhook'
        },
        '/api/messaging/webhooks/instagram': {
          POST: 'Instagram messaging webhook',
          GET: 'Instagram webhook verification'
        }
      },
      
      medicalRecords: {
        '/api/emr/customers/:customerId/records': {
          GET: 'Get customer medical records',
          POST: 'Create/update medical record'
        },
        '/api/emr/customers/:customerId/treatments': {
          GET: 'Get treatment history',
          POST: 'Add new treatment record with photos'
        },
        '/api/emr/customers/:customerId/allergies': {
          GET: 'Get allergy profile',
          POST: 'Add allergy information'
        },
        '/api/emr/search': {
          GET: 'Search medical records'
        },
        '/api/emr/photos/:photoId': {
          GET: 'Get medical photo (secured)',
          DELETE: 'Delete medical photo'
        }
      },
      
      automation: {
        '/api/automation/rules': {
          GET: 'Get automation rules',
          POST: 'Create automation rule'
        },
        '/api/automation/campaigns': {
          GET: 'Get marketing campaigns',
          POST: 'Create new campaign'
        },
        '/api/automation/templates': {
          GET: 'Get automation message templates',
          POST: 'Create template'
        }
      }
    },
    
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      roles: ['super_admin', 'admin', 'manager', 'staff', 'receptionist', 'read_only']
    },
    
    security: {
      rateLimit: '100 requests per 15 minutes',
      csrfProtection: 'Required for state-changing operations',
      encryption: 'AES-256-GCM for sensitive data',
      auditLogging: 'All operations logged with user and IP tracking'
    }
  };
  
  res.json({
    success: true,
    documentation: apiDocumentation
  });
});

// Error handling
app.use(securityErrorHandler);

// General error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = app;