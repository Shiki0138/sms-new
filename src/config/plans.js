// Pricing Plan Configuration
// Defines Light, Standard, and Premium plans with features and restrictions

const PLANS = {
  LIGHT: {
    id: 'light',
    name: 'Light Plan',
    price: 2980, // ¥2,980/month
    features: {
      // Core features
      onlineBooking: true,
      bookingWidget: true,
      googleCalendarSync: true,
      basicSmsReminders: true,
      birthdayAlerts: true,
      
      // Restrictions
      maxMonthlyBookings: 100,
      maxStaff: 3,
      maxCustomers: 500,
      maxSmsPerMonth: 200,
      
      // Disabled features
      advancedAnalytics: false,
      multiLocation: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      whatsappIntegration: false,
      lineIntegration: false,
      inventoryManagement: false,
      staffCommissions: false,
      customReports: false
    },
    smsFeatures: {
      appointmentReminders: true,
      confirmationMessages: true,
      birthdayMessages: true,
      // Disabled for Light plan
      marketingCampaigns: false,
      customTemplates: false,
      bulkMessaging: false
    }
  },
  
  STANDARD: {
    id: 'standard',
    name: 'Standard Plan',
    price: 5980, // ¥5,980/month
    features: {
      // All Light features plus:
      onlineBooking: true,
      bookingWidget: true,
      googleCalendarSync: true,
      basicSmsReminders: true,
      birthdayAlerts: true,
      
      // Enhanced limits
      maxMonthlyBookings: 500,
      maxStaff: 10,
      maxCustomers: 2000,
      maxSmsPerMonth: 1000,
      
      // Additional features
      advancedAnalytics: true,
      multiLocation: false,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
      whatsappIntegration: true,
      lineIntegration: true,
      inventoryManagement: true,
      staffCommissions: true,
      customReports: false
    },
    smsFeatures: {
      appointmentReminders: true,
      confirmationMessages: true,
      birthdayMessages: true,
      marketingCampaigns: true,
      customTemplates: true,
      bulkMessaging: false
    }
  },
  
  PREMIUM: {
    id: 'premium',
    name: 'Premium Plan',
    price: 9980, // ¥9,980/month
    features: {
      // All features enabled
      onlineBooking: true,
      bookingWidget: true,
      googleCalendarSync: true,
      basicSmsReminders: true,
      birthdayAlerts: true,
      
      // Unlimited or high limits
      maxMonthlyBookings: -1, // unlimited
      maxStaff: -1, // unlimited
      maxCustomers: -1, // unlimited
      maxSmsPerMonth: 5000,
      
      // All features enabled
      advancedAnalytics: true,
      multiLocation: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      whatsappIntegration: true,
      lineIntegration: true,
      inventoryManagement: true,
      staffCommissions: true,
      customReports: true
    },
    smsFeatures: {
      appointmentReminders: true,
      confirmationMessages: true,
      birthdayMessages: true,
      marketingCampaigns: true,
      customTemplates: true,
      bulkMessaging: true
    }
  }
};

// Feature descriptions for UI display
const FEATURE_DESCRIPTIONS = {
  onlineBooking: 'オンライン予約システム',
  bookingWidget: '埋め込み可能な予約ウィジェット',
  googleCalendarSync: 'Googleカレンダー同期',
  basicSmsReminders: '基本的なSMSリマインダー',
  birthdayAlerts: '誕生日アラート',
  advancedAnalytics: '高度な分析レポート',
  multiLocation: '複数店舗管理',
  customBranding: 'カスタムブランディング',
  apiAccess: 'API アクセス',
  prioritySupport: '優先サポート',
  whatsappIntegration: 'WhatsApp 連携',
  lineIntegration: 'LINE 連携',
  inventoryManagement: '在庫管理',
  staffCommissions: 'スタッフコミッション管理',
  customReports: 'カスタムレポート作成'
};

// Helper functions
function getPlan(planId) {
  return PLANS[planId.toUpperCase()] || null;
}

function hasFeature(planId, featureName) {
  const plan = getPlan(planId);
  if (!plan) return false;
  return plan.features[featureName] === true;
}

function getLimit(planId, limitName) {
  const plan = getPlan(planId);
  if (!plan) return 0;
  return plan.features[limitName] || 0;
}

function isWithinLimit(planId, limitName, currentValue) {
  const limit = getLimit(planId, limitName);
  if (limit === -1) return true; // unlimited
  return currentValue <= limit;
}

function canSendSms(planId, smsType) {
  const plan = getPlan(planId);
  if (!plan) return false;
  return plan.smsFeatures[smsType] === true;
}

function getAvailablePlans() {
  return Object.values(PLANS);
}

function comparePlans(planId1, planId2) {
  const plan1 = getPlan(planId1);
  const plan2 = getPlan(planId2);
  
  if (!plan1 || !plan2) return null;
  
  const comparison = {
    price: {
      plan1: plan1.price,
      plan2: plan2.price,
      difference: plan2.price - plan1.price
    },
    features: {}
  };
  
  // Compare all features
  const allFeatures = new Set([
    ...Object.keys(plan1.features),
    ...Object.keys(plan2.features)
  ]);
  
  allFeatures.forEach(feature => {
    comparison.features[feature] = {
      plan1: plan1.features[feature],
      plan2: plan2.features[feature],
      description: FEATURE_DESCRIPTIONS[feature] || feature
    };
  });
  
  return comparison;
}

module.exports = {
  PLANS,
  FEATURE_DESCRIPTIONS,
  getPlan,
  hasFeature,
  getLimit,
  isWithinLimit,
  canSendSms,
  getAvailablePlans,
  comparePlans
};