/**
 * Tenant Model
 * Represents a tenant in the multi-tenant SMS service
 */
class Tenant {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.apiKey = data.apiKey;
    this.status = data.status || 'active'; // active, suspended, trial
    this.plan = data.plan || 'basic'; // basic, premium, enterprise
    this.settings = data.settings || {};
    this.quotas = data.quotas || this.getDefaultQuotas(this.plan);
    this.usage = data.usage || this.getDefaultUsage();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Get default quotas based on plan
   */
  getDefaultQuotas(plan) {
    const quotaPlans = {
      basic: {
        dailyLimit: 100,
        monthlyLimit: 1000,
        rateLimit: 10, // messages per minute
        bulkSizeLimit: 50,
        providerOptions: ['twilio']
      },
      premium: {
        dailyLimit: 1000,
        monthlyLimit: 10000,
        rateLimit: 100,
        bulkSizeLimit: 500,
        providerOptions: ['twilio', 'aws-sns']
      },
      enterprise: {
        dailyLimit: 10000,
        monthlyLimit: 100000,
        rateLimit: 1000,
        bulkSizeLimit: 5000,
        providerOptions: ['twilio', 'aws-sns']
      }
    };

    return quotaPlans[plan] || quotaPlans.basic;
  }

  /**
   * Get default usage counters
   */
  getDefaultUsage() {
    const now = new Date();
    return {
      daily: {
        count: 0,
        date: now.toISOString().split('T')[0]
      },
      monthly: {
        count: 0,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      },
      lastReset: now
    };
  }

  /**
   * Check if tenant can send messages
   */
  canSendMessage(messageCount = 1) {
    if (this.status !== 'active') {
      return {
        allowed: false,
        reason: `Tenant status is ${this.status}`
      };
    }

    // Check daily limit
    if (this.usage.daily.count + messageCount > this.quotas.dailyLimit) {
      return {
        allowed: false,
        reason: 'Daily limit exceeded',
        limit: this.quotas.dailyLimit,
        current: this.usage.daily.count
      };
    }

    // Check monthly limit
    if (this.usage.monthly.count + messageCount > this.quotas.monthlyLimit) {
      return {
        allowed: false,
        reason: 'Monthly limit exceeded',
        limit: this.quotas.monthlyLimit,
        current: this.usage.monthly.count
      };
    }

    return { allowed: true };
  }

  /**
   * Update usage counters
   */
  updateUsage(messageCount = 1) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Reset daily counter if date changed
    if (this.usage.daily.date !== today) {
      this.usage.daily = {
        count: 0,
        date: today
      };
    }

    // Reset monthly counter if month changed
    if (this.usage.monthly.month !== currentMonth) {
      this.usage.monthly = {
        count: 0,
        month: currentMonth
      };
    }

    // Update counters
    this.usage.daily.count += messageCount;
    this.usage.monthly.count += messageCount;
    this.updatedAt = now;
  }

  /**
   * Check if provider is allowed for this tenant
   */
  isProviderAllowed(providerName) {
    return this.quotas.providerOptions.includes(providerName);
  }

  /**
   * Get remaining quota
   */
  getRemainingQuota() {
    return {
      daily: {
        limit: this.quotas.dailyLimit,
        used: this.usage.daily.count,
        remaining: Math.max(0, this.quotas.dailyLimit - this.usage.daily.count)
      },
      monthly: {
        limit: this.quotas.monthlyLimit,
        used: this.usage.monthly.count,
        remaining: Math.max(0, this.quotas.monthlyLimit - this.usage.monthly.count)
      }
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      plan: this.plan,
      settings: this.settings,
      quotas: this.quotas,
      usage: this.usage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new Tenant(data);
  }
}

module.exports = Tenant;