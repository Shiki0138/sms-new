const db = require('../config/database');

// Plan hierarchy
const PLAN_HIERARCHY = {
  light: 1,
  standard: 2,
  premium: 3
};

// Feature to minimum plan mapping
const FEATURE_PLAN_REQUIREMENTS = {
  // Light plan features
  'basic_booking': 'light',
  'customer_management': 'light',
  'basic_messaging': 'light',
  'basic_analytics': 'light',
  
  // Standard plan features
  'smart_upselling': 'standard',
  'membership_management': 'standard',
  'referral_tracking': 'standard',
  'inventory_management': 'standard',
  
  // Premium plan features
  'advanced_analytics': 'premium',
  'api_access': 'premium',
  'white_label': 'premium',
  'priority_support': 'premium'
};

// Middleware to check if user has access to a feature
const checkFeatureAccess = (requiredFeature) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Get user's current plan
      const [userPlan] = await db.execute(`
        SELECT u.subscription_plan 
        FROM users u 
        WHERE u.id = ? AND u.is_active = 1
      `, [userId]);

      if (!userPlan || !userPlan[0]) {
        return res.status(403).json({ 
          error: 'No active subscription found',
          code: 'NO_SUBSCRIPTION' 
        });
      }

      const currentPlan = userPlan[0].subscription_plan || 'light';
      const requiredPlan = FEATURE_PLAN_REQUIREMENTS[requiredFeature];

      if (!requiredPlan) {
        // Feature doesn't have plan restrictions
        return next();
      }

      // Check if user's plan meets the requirement
      if (PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan]) {
        // User has access
        req.userPlan = currentPlan;
        return next();
      }

      // User doesn't have access - provide upgrade information
      const upgradeMessage = getUpgradeMessage(currentPlan, requiredPlan, requiredFeature);
      
      return res.status(403).json({
        error: 'Feature not available in your current plan',
        code: 'PLAN_UPGRADE_REQUIRED',
        currentPlan,
        requiredPlan,
        feature: requiredFeature,
        message: upgradeMessage,
        upgradeUrl: '/settings/subscription'
      });

    } catch (error) {
      console.error('Plan restriction check error:', error);
      return res.status(500).json({ 
        error: 'Error checking plan permissions',
        code: 'PLAN_CHECK_ERROR' 
      });
    }
  };
};

// Helper function to get user-friendly upgrade messages
function getUpgradeMessage(currentPlan, requiredPlan, feature) {
  const messages = {
    'smart_upselling': {
      'light': 'Upgrade to Standard plan to unlock AI-powered upselling suggestions that can increase your revenue by up to 30%!'
    },
    'membership_management': {
      'light': 'Upgrade to Standard plan to create membership tiers and manage recurring subscriptions for your loyal customers!'
    },
    'referral_tracking': {
      'light': 'Upgrade to Standard plan to track customer referrals and reward your best advocates!'
    },
    'inventory_management': {
      'light': 'Upgrade to Standard plan to manage your retail products and track inventory levels!'
    },
    'advanced_analytics': {
      'light': 'Upgrade to Premium plan for advanced analytics and business intelligence insights!',
      'standard': 'Upgrade to Premium plan for advanced analytics and business intelligence insights!'
    },
    'api_access': {
      'light': 'Upgrade to Premium plan to access our API and integrate with your existing systems!',
      'standard': 'Upgrade to Premium plan to access our API and integrate with your existing systems!'
    }
  };

  return messages[feature]?.[currentPlan] || 
    `Upgrade to ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan to access this feature.`;
}

// Middleware to check plan limits (e.g., message limits)
const checkPlanLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Get user's plan and current usage
      const [planInfo] = await db.execute(`
        SELECT 
          u.subscription_plan,
          pf.feature_limit,
          COUNT(CASE 
            WHEN ? = 'messages' AND m.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
            THEN m.id 
          END) as current_usage
        FROM users u
        LEFT JOIN plan_features pf ON pf.plan_name = u.subscription_plan AND pf.feature_name = ?
        LEFT JOIN messages m ON m.user_id = u.id
        WHERE u.id = ?
        GROUP BY u.id, u.subscription_plan, pf.feature_limit
      `, [limitType, limitType, userId]);

      if (!planInfo || !planInfo[0]) {
        return res.status(403).json({ 
          error: 'Unable to verify plan limits',
          code: 'PLAN_LIMIT_CHECK_ERROR' 
        });
      }

      const { feature_limit, current_usage } = planInfo[0];

      // If no limit is set, allow access
      if (!feature_limit) {
        return next();
      }

      // Check if user has exceeded the limit
      if (current_usage >= feature_limit) {
        return res.status(429).json({
          error: 'Plan limit exceeded',
          code: 'PLAN_LIMIT_EXCEEDED',
          limitType,
          limit: feature_limit,
          currentUsage: current_usage,
          message: `You have reached your monthly limit of ${feature_limit} ${limitType}. Upgrade your plan for higher limits.`,
          upgradeUrl: '/settings/subscription'
        });
      }

      // User is within limits
      req.planUsage = {
        limit: feature_limit,
        currentUsage: current_usage,
        remaining: feature_limit - current_usage
      };
      
      next();

    } catch (error) {
      console.error('Plan limit check error:', error);
      return res.status(500).json({ 
        error: 'Error checking plan limits',
        code: 'LIMIT_CHECK_ERROR' 
      });
    }
  };
};

// Helper function to get available features for a plan
const getPlanFeatures = async (planName) => {
  try {
    const [features] = await db.execute(`
      SELECT feature_name, is_enabled, feature_limit
      FROM plan_features
      WHERE plan_name = ? AND is_enabled = 1
    `, [planName]);

    return features.reduce((acc, feature) => {
      acc[feature.feature_name] = {
        enabled: feature.is_enabled,
        limit: feature.feature_limit
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching plan features:', error);
    return {};
  }
};

module.exports = {
  checkFeatureAccess,
  checkPlanLimit,
  getPlanFeatures,
  PLAN_HIERARCHY,
  FEATURE_PLAN_REQUIREMENTS
};