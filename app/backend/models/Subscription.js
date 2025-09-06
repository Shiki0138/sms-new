// Subscription Model
// Manages salon subscription plans and billing

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  salon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salon',
    required: true,
    unique: true
  },
  
  planId: {
    type: String,
    enum: ['LIGHT', 'STANDARD', 'PREMIUM'],
    required: true,
    default: 'LIGHT'
  },
  
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'trial', 'suspended'],
    default: 'active'
  },
  
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  renewalDate: {
    type: Date
  },
  
  // Billing information
  billing: {
    method: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'invoice'],
      required: true
    },
    
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    amount: Number,
    currency: {
      type: String,
      default: 'JPY'
    },
    
    // Stripe or payment gateway references
    customerId: String,
    subscriptionId: String,
    
    billingAddress: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'JP'
      }
    }
  },
  
  // Usage tracking
  usage: {
    currentMonth: {
      bookings: { type: Number, default: 0 },
      smsCount: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      storageUsed: { type: Number, default: 0 }, // in MB
      resetDate: Date
    },
    
    totalUsage: {
      bookings: { type: Number, default: 0 },
      smsCount: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 }
    }
  },
  
  // Trial information
  trial: {
    isActive: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    extended: { type: Boolean, default: false }
  },
  
  // Plan change history
  planHistory: [{
    fromPlan: String,
    toPlan: String,
    changeDate: { type: Date, default: Date.now },
    reason: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Discounts and promotions
  discounts: [{
    code: String,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    value: Number,
    validFrom: Date,
    validUntil: Date,
    applied: { type: Boolean, default: false }
  }],
  
  // Feature overrides (for custom plans)
  customFeatures: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Notifications
  notifications: {
    paymentReminder: { type: Boolean, default: true },
    usageAlerts: { type: Boolean, default: true },
    planExpiry: { type: Boolean, default: true },
    lastNotificationDate: Date
  },
  
  metadata: {
    source: String, // How they signed up
    referralCode: String,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ salon: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ 'billing.nextPaymentDate': 1 });

// Methods
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.endDate > new Date();
};

subscriptionSchema.methods.daysRemaining = function() {
  if (!this.isActive()) return 0;
  const days = Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
};

subscriptionSchema.methods.canUpgrade = function(newPlan) {
  const planOrder = { LIGHT: 1, STANDARD: 2, PREMIUM: 3 };
  return planOrder[newPlan] > planOrder[this.planId];
};

subscriptionSchema.methods.resetMonthlyUsage = function() {
  this.usage.currentMonth = {
    bookings: 0,
    smsCount: 0,
    apiCalls: 0,
    storageUsed: 0,
    resetDate: new Date()
  };
  return this.save();
};

subscriptionSchema.methods.incrementUsage = function(type, amount = 1) {
  if (this.usage.currentMonth[type] !== undefined) {
    this.usage.currentMonth[type] += amount;
    this.usage.totalUsage[type] += amount;
  }
  return this.save();
};

// Statics
subscriptionSchema.statics.getActiveSubscriptions = function() {
  return this.find({ 
    status: 'active',
    endDate: { $gt: new Date() }
  }).populate('salon');
};

subscriptionSchema.statics.getExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    endDate: { 
      $lte: futureDate,
      $gt: new Date()
    }
  }).populate('salon');
};

// Middleware
subscriptionSchema.pre('save', function(next) {
  // Set renewal date if not set
  if (!this.renewalDate && this.endDate) {
    this.renewalDate = new Date(this.endDate);
    this.renewalDate.setDate(this.renewalDate.getDate() - 3); // 3 days before expiry
  }
  
  // Set next payment date
  if (this.billing && !this.billing.nextPaymentDate && this.endDate) {
    this.billing.nextPaymentDate = this.renewalDate;
  }
  
  next();
});

// Virtual for plan details
subscriptionSchema.virtual('planDetails').get(function() {
  const { getPlan } = require('../config/plans');
  return getPlan(this.planId);
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;