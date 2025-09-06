// Plan Limits Service
const { User, Customer, Appointment, Message } = require('../models');
const { getLimit } = require('../config/plans');

class PlanLimitsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minute cache
  }

  async checkLimit(userId, feature) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = user.plan || 'light';
      const limit = getLimit(plan, feature);
      
      if (limit === null || limit === Infinity) {
        return {
          allowed: true,
          current: 0,
          limit: Infinity,
          remaining: Infinity
        };
      }

      const current = await this.getCurrentUsage(userId, feature);
      const remaining = Math.max(0, limit - current);
      const allowed = current < limit;

      return {
        allowed,
        current,
        limit,
        remaining,
        percentage: Math.round((current / limit) * 100)
      };
    } catch (error) {
      console.error('Error checking plan limit:', error);
      throw error;
    }
  }

  async getCurrentUsage(userId, feature) {
    const cacheKey = `${userId}-${feature}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.value;
      }
    }

    let usage = 0;

    switch (feature) {
      case 'customers':
        usage = await Customer.count({ where: { userId } });
        break;
      
      case 'appointments':
        // Monthly appointments
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        usage = await Appointment.count({
          where: {
            userId,
            createdAt: { $gte: startOfMonth }
          }
        });
        break;
      
      case 'messages':
        // Monthly messages
        const messageStartOfMonth = new Date();
        messageStartOfMonth.setDate(1);
        messageStartOfMonth.setHours(0, 0, 0, 0);
        
        usage = await Message.count({
          where: {
            userId,
            createdAt: { $gte: messageStartOfMonth }
          }
        });
        break;
      
      case 'storage':
        // Storage in MB
        // This would need actual file storage calculation
        usage = 0; // Placeholder
        break;
      
      default:
        usage = 0;
    }

    // Cache the result
    this.cache.set(cacheKey, {
      value: usage,
      timestamp: Date.now()
    });

    return usage;
  }

  async trackUsage(userId, feature, amount = 1) {
    try {
      // Clear cache for this user/feature
      const cacheKey = `${userId}-${feature}`;
      this.cache.delete(cacheKey);

      // In a real implementation, you might want to record this in a usage table
      return true;
    } catch (error) {
      console.error('Error tracking usage:', error);
      return false;
    }
  }

  async getUsage(userId, feature) {
    try {
      return await this.getCurrentUsage(userId, feature);
    } catch (error) {
      console.error('Error getting usage:', error);
      return 0;
    }
  }

  async getFullUsage(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = user.plan || 'light';
      const features = ['customers', 'appointments', 'messages', 'storage'];
      const usage = {};

      for (const feature of features) {
        const result = await this.checkLimit(userId, feature);
        usage[feature] = result;
      }

      return {
        plan,
        ...usage
      };
    } catch (error) {
      console.error('Error getting full usage:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
module.exports = new PlanLimitsService();
module.exports.PlanLimitsService = PlanLimitsService;