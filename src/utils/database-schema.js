/**
 * Database Schema Definitions for Multi-Channel Messaging & EMR System
 * Firebase Firestore Collection Structure
 */

const COLLECTIONS = {
  // Enhanced customer collection
  CUSTOMERS: 'customers',
  CUSTOMER_PROFILES: 'customer_profiles',
  
  // Medical records collections
  MEDICAL_RECORDS: 'medical_records',
  TREATMENT_HISTORY: 'treatment_history',
  MEDICAL_PHOTOS: 'medical_photos',
  ALLERGY_PROFILES: 'allergy_profiles',
  CONSENT_FORMS: 'consent_forms',
  
  // Messaging collections
  MESSAGES: 'messages',
  MESSAGE_THREADS: 'message_threads',
  MESSAGE_TEMPLATES: 'message_templates',
  CHANNEL_CONFIGS: 'channel_configs',
  
  // Automation collections
  AUTOMATION_RULES: 'automation_rules',
  SCHEDULED_CAMPAIGNS: 'scheduled_campaigns',
  CAMPAIGN_ANALYTICS: 'campaign_analytics',
  AUTOMATION_LOGS: 'automation_logs',
  
  // Security and audit
  AUDIT_LOGS: 'audit_logs',
  SECURITY_EVENTS: 'security_events',
  USER_SESSIONS: 'user_sessions',
  
  // System collections
  SYSTEM_SETTINGS: 'system_settings',
  FEATURE_FLAGS: 'feature_flags'
};

/**
 * Schema Definitions
 */

const SCHEMAS = {
  // Enhanced Customer Schema
  customer: {
    id: 'string', // Auto-generated
    personalInfo: {
      lastName: 'string',
      firstName: 'string',
      email: 'string',
      phone: 'string',
      birthday: 'date',
      gender: 'string', // 'M', 'F', 'Other', 'Not specified'
      address: {
        postalCode: 'string',
        prefecture: 'string',
        city: 'string',
        addressLine: 'string'
      }
    },
    salonInfo: {
      memberSince: 'date',
      lastVisit: 'date',
      totalVisits: 'number',
      preferredStaff: 'string',
      notes: 'string',
      tags: ['string'] // VIP, Regular, New, etc.
    },
    communicationPrefs: {
      preferredChannels: ['string'], // sms, email, line, instagram
      language: 'string', // ja, en
      frequency: 'string', // daily, weekly, monthly, none
      optOut: {
        marketing: 'boolean',
        reminders: 'boolean',
        surveys: 'boolean'
      }
    },
    privacy: {
      dataProcessingConsent: 'boolean',
      marketingConsent: 'boolean',
      photoConsent: 'boolean',
      consentDate: 'date',
      ipAddress: 'string'
    },
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    createdBy: 'string',
    updatedBy: 'string'
  },

  // Medical Record Schema
  medicalRecord: {
    id: 'string',
    customerId: 'string',
    basicInfo: {
      bloodType: 'string', // A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown
      height: 'number', // cm
      weight: 'number', // kg
      skinType: 'string', // Normal, Dry, Oily, Combination, Sensitive
      hairType: 'string', // Straight, Wavy, Curly, Coily
      scalp: {
        condition: 'string', // Normal, Dry, Oily, Sensitive
        issues: ['string'] // Dandruff, Itchy, Flaky, etc.
      }
    },
    medicalHistory: {
      chronicConditions: ['string'],
      currentMedications: [{
        name: 'string',
        dosage: 'string',
        frequency: 'string',
        prescribedBy: 'string'
      }],
      surgeries: [{
        procedure: 'string',
        date: 'date',
        hospital: 'string'
      }],
      pregnancyStatus: 'string', // pregnant, nursing, none
      lastMenstrualPeriod: 'date'
    },
    contraindications: [{
      substance: 'string',
      type: 'string', // allergy, medication_interaction, medical_condition
      severity: 'string', // mild, moderate, severe
      notes: 'string'
    }],
    emergencyContact: {
      name: 'string',
      relationship: 'string',
      phone: 'string',
      email: 'string'
    },
    version: 'number',
    isActive: 'boolean',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    createdBy: 'string',
    updatedBy: 'string',
    lastReviewed: 'timestamp',
    reviewedBy: 'string'
  },

  // Treatment Record Schema
  treatmentRecord: {
    id: 'string',
    customerId: 'string',
    appointmentId: 'string',
    treatmentInfo: {
      type: 'string', // Cut, Color, Perm, Treatment, etc.
      category: 'string', // Hair, Facial, Body, Nail
      services: [{
        id: 'string',
        name: 'string',
        duration: 'number',
        price: 'number'
      }],
      staffId: 'string',
      staffName: 'string',
      date: 'date',
      startTime: 'time',
      endTime: 'time'
    },
    assessment: {
      beforeCondition: {
        description: 'string',
        photos: ['string'], // photo IDs
        measurements: {
          length: 'number',
          thickness: 'string',
          damage: 'string'
        }
      },
      afterCondition: {
        description: 'string',
        photos: ['string'],
        measurements: {
          length: 'number',
          thickness: 'string',
          condition: 'string'
        }
      }
    },
    treatmentDetails: {
      productsUsed: [{
        name: 'string',
        brand: 'string',
        type: 'string',
        amount: 'string',
        purpose: 'string'
      }],
      techniques: ['string'],
      processingTime: 'number', // minutes
      temperature: 'number', // Celsius for treatments
      chemicals: [{
        name: 'string',
        concentration: 'string',
        processingTime: 'number'
      }]
    },
    customerFeedback: {
      satisfactionRating: 'number', // 1-5
      painLevel: 'number', // 0-10
      comfort: 'number', // 1-5
      comments: 'string',
      concerns: 'string'
    },
    followUp: {
      nextAppointmentRecommended: 'date',
      homeCarenstructions: 'string',
      recommendedProducts: [{
        name: 'string',
        usage: 'string',
        frequency: 'string'
      }],
      warningsSigns: 'string',
      contactIfIssues: 'string'
    },
    medicalNotes: {
      adverseReactions: 'string',
      complications: 'string',
      allergyTesting: {
        performed: 'boolean',
        results: 'string',
        date: 'date'
      }
    },
    photos: [{
      id: 'string',
      type: 'string', // before, during, after
      description: 'string',
      timestamp: 'timestamp'
    }],
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    createdBy: 'string'
  },

  // Medical Photo Schema
  medicalPhoto: {
    id: 'string',
    customerId: 'string',
    treatmentId: 'string',
    metadata: {
      filename: 'string',
      originalName: 'string',
      size: 'number',
      mimetype: 'string',
      dimensions: {
        width: 'number',
        height: 'number'
      }
    },
    photoData: {
      storageUrl: 'string', // Firebase Storage URL
      thumbnailUrl: 'string',
      encryptionKey: 'string', // if encrypted
      checksum: 'string' // for integrity verification
    },
    classification: {
      type: 'string', // before, after, during, comparison
      bodyPart: 'string', // face, scalp, hair, etc.
      angle: 'string', // front, side, back, close-up
      lighting: 'string', // natural, studio, clinical
    },
    privacy: {
      accessLevel: 'string', // medical_staff_only, assigned_staff, customer_shared
      consentGiven: 'boolean',
      consentDate: 'date',
      canShareForResearch: 'boolean'
    },
    audit: {
      uploadedBy: 'string',
      uploadedAt: 'timestamp',
      lastAccessed: 'timestamp',
      accessCount: 'number',
      deletedAt: 'timestamp',
      deletedBy: 'string',
      deletionReason: 'string'
    }
  },

  // Message Schema
  message: {
    id: 'string',
    threadId: 'string',
    customerId: 'string',
    staffId: 'string',
    channel: 'string', // sms, email, line, instagram, internal
    direction: 'string', // inbound, outbound
    messageData: {
      text: 'string',
      attachments: [{
        type: 'string', // image, video, document
        url: 'string',
        filename: 'string',
        size: 'number'
      }],
      metadata: {
        originalMessageId: 'string', // from external platform
        isAutomated: 'boolean',
        templateId: 'string',
        campaignId: 'string',
        automationRuleId: 'string'
      }
    },
    status: {
      current: 'string', // pending, sent, delivered, read, failed
      deliveryAttempts: 'number',
      lastAttempt: 'timestamp',
      failureReason: 'string'
    },
    engagement: {
      delivered: 'boolean',
      opened: 'boolean',
      clicked: 'boolean',
      replied: 'boolean',
      deliveredAt: 'timestamp',
      openedAt: 'timestamp',
      clickedAt: 'timestamp',
      repliedAt: 'timestamp'
    },
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    scheduledFor: 'timestamp',
    expiresAt: 'timestamp'
  },

  // Automation Rule Schema
  automationRule: {
    id: 'string',
    name: 'string',
    description: 'string',
    type: 'string', // appointment_reminder, birthday_greeting, follow_up, promotional, retention
    status: 'string', // active, paused, inactive
    trigger: {
      type: 'string', // scheduled, event-based, date-based
      conditions: [{
        field: 'string', // lastVisit, birthday, appointmentDate, etc.
        operator: 'string', // equals, greater_than, less_than, contains
        value: 'any',
        logicalOperator: 'string' // and, or
      }],
      schedule: {
        frequency: 'string', // once, daily, weekly, monthly
        time: 'string', // HH:MM format
        dayOfWeek: 'number', // 0-6, Sunday = 0
        dayOfMonth: 'number', // 1-31
        timezone: 'string'
      }
    },
    targetAudience: {
      customerSegments: ['string'],
      includeCustomers: ['string'], // customer IDs
      excludeCustomers: ['string'], // customer IDs
      filters: [{
        field: 'string',
        operator: 'string',
        value: 'any'
      }]
    },
    messageTemplate: {
      content: 'string',
      variables: ['string'], // placeholders like {customerName}
      attachments: [{
        type: 'string',
        url: 'string'
      }]
    },
    delivery: {
      channels: ['string'], // preferred channels in order
      fallbackChannels: ['string'],
      sendTime: {
        earliest: 'string', // HH:MM
        latest: 'string', // HH:MM
        timezone: 'string'
      },
      frequency: {
        maxPerCustomer: 'number',
        timeframe: 'string', // day, week, month
        cooldownPeriod: 'number' // hours between messages
      }
    },
    performance: {
      executionCount: 'number',
      lastExecuted: 'timestamp',
      nextExecution: 'timestamp',
      successRate: 'number',
      averageEngagement: 'number',
      totalRecipients: 'number'
    },
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    createdBy: 'string',
    updatedBy: 'string'
  },

  // Campaign Schema
  campaign: {
    id: 'string',
    name: 'string',
    description: 'string',
    type: 'string', // promotional, informational, retention, seasonal
    status: 'string', // draft, scheduled, active, completed, cancelled
    schedule: {
      startDate: 'timestamp',
      endDate: 'timestamp',
      sendTime: 'string', // HH:MM
      timezone: 'string'
    },
    targeting: {
      audienceSize: 'number',
      customerSegments: ['string'],
      includeCustomers: ['string'],
      excludeCustomers: ['string'],
      demographics: {
        ageRange: { min: 'number', max: 'number' },
        gender: ['string'],
        location: ['string']
      }
    },
    content: {
      subject: 'string',
      message: 'string',
      attachments: [{
        type: 'string',
        url: 'string',
        filename: 'string'
      }],
      callToAction: {
        text: 'string',
        url: 'string',
        type: 'string' // book_appointment, visit_website, call_now
      }
    },
    channels: ['string'],
    performance: {
      sent: 'number',
      delivered: 'number',
      opened: 'number',
      clicked: 'number',
      conversions: 'number',
      unsubscribed: 'number',
      bounced: 'number',
      deliveryRate: 'number',
      openRate: 'number',
      clickRate: 'number',
      conversionRate: 'number',
      roi: 'number'
    },
    budget: {
      allocated: 'number',
      spent: 'number',
      costPerMessage: 'number',
      costPerConversion: 'number'
    },
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    createdBy: 'string'
  },

  // Audit Log Schema
  auditLog: {
    id: 'string',
    userId: 'string',
    userRole: 'string',
    action: 'string',
    resource: 'string',
    resourceId: 'string',
    details: {
      method: 'string',
      endpoint: 'string',
      ipAddress: 'string',
      userAgent: 'string',
      changes: {
        before: 'object',
        after: 'object'
      },
      additionalData: 'object'
    },
    result: {
      success: 'boolean',
      statusCode: 'number',
      errorMessage: 'string'
    },
    timestamp: 'timestamp',
    sessionId: 'string'
  },

  // Security Event Schema
  securityEvent: {
    id: 'string',
    type: 'string', // login_failure, rate_limit_exceeded, suspicious_activity, etc.
    severity: 'string', // low, medium, high, critical
    source: {
      ipAddress: 'string',
      userAgent: 'string',
      country: 'string',
      userId: 'string'
    },
    details: {
      description: 'string',
      endpoint: 'string',
      method: 'string',
      payload: 'object',
      headers: 'object'
    },
    response: {
      action: 'string', // blocked, allowed, flagged
      reason: 'string'
    },
    timestamp: 'timestamp',
    resolved: 'boolean',
    resolvedAt: 'timestamp',
    resolvedBy: 'string'
  }
};

/**
 * Database Indexes for Performance
 */
const INDEXES = {
  customers: [
    { fields: ['personalInfo.email'], unique: true },
    { fields: ['personalInfo.phone'], unique: true },
    { fields: ['salonInfo.lastVisit'] },
    { fields: ['createdAt'] }
  ],
  
  medical_records: [
    { fields: ['customerId'], unique: true },
    { fields: ['isActive'] },
    { fields: ['lastReviewed'] }
  ],
  
  treatment_history: [
    { fields: ['customerId'] },
    { fields: ['treatmentInfo.date'] },
    { fields: ['treatmentInfo.staffId'] },
    { fields: ['customerId', 'treatmentInfo.date'] }
  ],
  
  messages: [
    { fields: ['customerId'] },
    { fields: ['threadId'] },
    { fields: ['createdAt'] },
    { fields: ['channel'] },
    { fields: ['status.current'] },
    { fields: ['customerId', 'createdAt'] }
  ],
  
  automation_rules: [
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['performance.nextExecution'] }
  ],
  
  audit_logs: [
    { fields: ['userId'] },
    { fields: ['timestamp'] },
    { fields: ['action'] },
    { fields: ['userId', 'timestamp'] }
  ]
};

/**
 * Data Validation Rules
 */
const VALIDATION_RULES = {
  customer: {
    'personalInfo.email': { required: false, format: 'email' },
    'personalInfo.phone': { required: true, format: 'phone' },
    'personalInfo.birthday': { required: false, format: 'date' }
  },
  
  medicalRecord: {
    customerId: { required: true, type: 'string' },
    'basicInfo.bloodType': { required: false, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] }
  },
  
  message: {
    customerId: { required: true, type: 'string' },
    channel: { required: true, enum: ['sms', 'email', 'line', 'instagram', 'internal'] },
    'messageData.text': { required: true, maxLength: 2000 }
  }
};

module.exports = {
  COLLECTIONS,
  SCHEMAS,
  INDEXES,
  VALIDATION_RULES
};