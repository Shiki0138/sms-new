// Plan Restrictions Middleware
// Enforces feature and usage limits based on subscription plan

const { hasFeature, isWithinLimit, canSendSms } = require('../config/plans');

// Main plan restriction middleware
const checkPlanFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Get salon's plan from database or session
      const salonId = req.user?.salonId || req.params?.salonId;
      if (!salonId) {
        return res.status(400).json({ 
          error: 'Salon ID not found',
          code: 'SALON_ID_REQUIRED' 
        });
      }

      // TODO: Replace with actual database query
      // For now, we'll use a mock implementation
      const salonPlan = await getSalonPlan(salonId);
      
      if (!salonPlan) {
        return res.status(400).json({ 
          error: 'Salon plan not found',
          code: 'PLAN_NOT_FOUND' 
        });
      }

      // Check if the feature is available in the plan
      if (!hasFeature(salonPlan.planId, featureName)) {
        return res.status(403).json({
          error: `This feature is not available in your ${salonPlan.planId} plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureName,
          currentPlan: salonPlan.planId,
          upgradeUrl: '/admin/billing/upgrade'
        });
      }

      // Attach plan info to request for downstream use
      req.salonPlan = salonPlan;
      next();
    } catch (error) {
      console.error('Plan restriction check failed:', error);
      res.status(500).json({ 
        error: 'Failed to verify plan permissions',
        code: 'PLAN_CHECK_ERROR' 
      });
    }
  };
};

// Check usage limits
const checkPlanLimit = (limitName) => {
  return async (req, res, next) => {
    try {
      const salonId = req.user?.salonId || req.params?.salonId;
      if (!salonId) {
        return res.status(400).json({ 
          error: 'Salon ID not found',
          code: 'SALON_ID_REQUIRED' 
        });
      }

      const salonPlan = req.salonPlan || await getSalonPlan(salonId);
      const currentUsage = await getCurrentUsage(salonId, limitName);

      if (!isWithinLimit(salonPlan.planId, limitName, currentUsage)) {
        return res.status(403).json({
          error: `You have reached the ${limitName} limit for your ${salonPlan.planId} plan`,
          code: 'LIMIT_EXCEEDED',
          limit: limitName,
          currentUsage,
          currentPlan: salonPlan.planId,
          upgradeUrl: '/admin/billing/upgrade'
        });
      }

      req.currentUsage = { [limitName]: currentUsage };
      next();
    } catch (error) {
      console.error('Plan limit check failed:', error);
      res.status(500).json({ 
        error: 'Failed to verify plan limits',
        code: 'LIMIT_CHECK_ERROR' 
      });
    }
  };
};

// Check SMS permissions
const checkSmsPermission = (smsType) => {
  return async (req, res, next) => {
    try {
      const salonId = req.user?.salonId || req.params?.salonId;
      if (!salonId) {
        return res.status(400).json({ 
          error: 'Salon ID not found',
          code: 'SALON_ID_REQUIRED' 
        });
      }

      const salonPlan = req.salonPlan || await getSalonPlan(salonId);

      if (!canSendSms(salonPlan.planId, smsType)) {
        return res.status(403).json({
          error: `${smsType} SMS feature is not available in your ${salonPlan.planId} plan`,
          code: 'SMS_FEATURE_NOT_AVAILABLE',
          smsType,
          currentPlan: salonPlan.planId,
          upgradeUrl: '/admin/billing/upgrade'
        });
      }

      // Also check SMS quota
      const currentSmsUsage = await getCurrentUsage(salonId, 'maxSmsPerMonth');
      if (!isWithinLimit(salonPlan.planId, 'maxSmsPerMonth', currentSmsUsage)) {
        return res.status(403).json({
          error: 'Monthly SMS limit exceeded',
          code: 'SMS_LIMIT_EXCEEDED',
          currentUsage: currentSmsUsage,
          currentPlan: salonPlan.planId,
          upgradeUrl: '/admin/billing/upgrade'
        });
      }

      next();
    } catch (error) {
      console.error('SMS permission check failed:', error);
      res.status(500).json({ 
        error: 'Failed to verify SMS permissions',
        code: 'SMS_CHECK_ERROR' 
      });
    }
  };
};

// Helper function to track API calls for rate limiting
const trackApiUsage = async (req, res, next) => {
  try {
    const salonId = req.user?.salonId || req.params?.salonId;
    if (!salonId) {
      return next();
    }

    const salonPlan = req.salonPlan || await getSalonPlan(salonId);
    
    // Only track for plans with API access
    if (hasFeature(salonPlan.planId, 'apiAccess')) {
      await incrementApiUsage(salonId);
    }

    next();
  } catch (error) {
    console.error('API usage tracking failed:', error);
    next(); // Don't block the request
  }
};

// Mock implementations - Replace with actual database queries
async function getSalonPlan(salonId) {
  // TODO: Implement actual database query
  // Example: SELECT planId, startDate, endDate FROM subscriptions WHERE salonId = ?
  return {
    salonId,
    planId: 'LIGHT', // Default to LIGHT plan for testing
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };
}

async function getCurrentUsage(salonId, limitName) {
  // TODO: Implement actual usage tracking
  const usageMap = {
    maxMonthlyBookings: 45,
    maxStaff: 2,
    maxCustomers: 150,
    maxSmsPerMonth: 75
  };
  return usageMap[limitName] || 0;
}

async function incrementApiUsage(salonId) {
  // TODO: Implement API usage tracking
  console.log(`API usage tracked for salon: ${salonId}`);
}

// Convenience middleware combinations
const requireStandardPlan = [
  checkPlanFeature('advancedAnalytics'),
  checkPlanFeature('whatsappIntegration')
];

const requirePremiumPlan = [
  checkPlanFeature('apiAccess'),
  checkPlanFeature('multiLocation')
];

module.exports = {
  checkPlanFeature,
  checkPlanLimit,
  checkSmsPermission,
  trackApiUsage,
  requireStandardPlan,
  requirePremiumPlan
};