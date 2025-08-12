const Tenant = require('../models/tenant');
const crypto = require('crypto');

/**
 * Tenant Management Service
 * Handles tenant operations, quotas, and authentication
 */
class TenantService {
  constructor() {
    this.tenants = new Map(); // In-memory storage (replace with database in production)
    this.apiKeyToTenant = new Map();
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantData) {
    const {
      name,
      plan = 'basic',
      settings = {},
      customQuotas = null
    } = tenantData;

    if (!name) {
      throw new Error('Tenant name is required');
    }

    const tenantId = this.generateId();
    const apiKey = this.generateApiKey();

    const tenant = new Tenant({
      id: tenantId,
      name,
      apiKey,
      plan,
      settings,
      quotas: customQuotas || undefined // Let Tenant class set defaults
    });

    this.tenants.set(tenantId, tenant);
    this.apiKeyToTenant.set(apiKey, tenant);

    console.log(`Tenant created: ${tenantId} (${name})`);
    
    return {
      success: true,
      tenant: tenant.toJSON(),
      apiKey
    };
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    return tenant;
  }

  /**
   * Get tenant by API key
   */
  async getTenantByApiKey(apiKey) {
    const tenant = this.apiKeyToTenant.get(apiKey);
    
    if (!tenant) {
      throw new Error('Invalid API key');
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId, updateData) {
    const tenant = await this.getTenant(tenantId);

    const allowedUpdates = ['name', 'status', 'plan', 'settings', 'quotas'];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedUpdates.includes(key)) {
        tenant[key] = value;
      }
    }

    tenant.updatedAt = new Date();
    
    console.log(`Tenant updated: ${tenantId}`);
    
    return {
      success: true,
      tenant: tenant.toJSON()
    };
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId) {
    const tenant = await this.getTenant(tenantId);
    
    this.tenants.delete(tenantId);
    this.apiKeyToTenant.delete(tenant.apiKey);
    
    console.log(`Tenant deleted: ${tenantId}`);
    
    return { success: true };
  }

  /**
   * List all tenants
   */
  async listTenants(options = {}) {
    const { status, plan, limit = 100, offset = 0 } = options;
    
    let tenantList = Array.from(this.tenants.values());

    // Apply filters
    if (status) {
      tenantList = tenantList.filter(t => t.status === status);
    }
    
    if (plan) {
      tenantList = tenantList.filter(t => t.plan === plan);
    }

    // Apply pagination
    const total = tenantList.length;
    const paginatedList = tenantList.slice(offset, offset + limit);

    return {
      tenants: paginatedList.map(t => t.toJSON()),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Check tenant quota and update usage
   */
  async checkAndUpdateUsage(tenantId, messageCount = 1) {
    const tenant = await this.getTenant(tenantId);
    
    // Check if tenant can send messages
    const canSend = tenant.canSendMessage(messageCount);
    
    if (!canSend.allowed) {
      return {
        success: false,
        error: canSend.reason,
        quota: tenant.getRemainingQuota()
      };
    }

    // Update usage
    tenant.updateUsage(messageCount);
    
    return {
      success: true,
      quota: tenant.getRemainingQuota()
    };
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId) {
    const tenant = await this.getTenant(tenantId);
    
    return {
      tenantId,
      plan: tenant.plan,
      status: tenant.status,
      quota: tenant.getRemainingQuota(),
      usage: tenant.usage,
      quotas: tenant.quotas
    };
  }

  /**
   * Reset tenant usage (for testing or manual reset)
   */
  async resetTenantUsage(tenantId, type = 'both') {
    const tenant = await this.getTenant(tenantId);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (type === 'daily' || type === 'both') {
      tenant.usage.daily = {
        count: 0,
        date: today
      };
    }

    if (type === 'monthly' || type === 'both') {
      tenant.usage.monthly = {
        count: 0,
        month: currentMonth
      };
    }

    tenant.updatedAt = now;
    
    console.log(`Usage reset for tenant ${tenantId}: ${type}`);
    
    return {
      success: true,
      usage: tenant.usage
    };
  }

  /**
   * Upgrade/downgrade tenant plan
   */
  async changeTenantPlan(tenantId, newPlan) {
    const validPlans = ['basic', 'premium', 'enterprise'];
    
    if (!validPlans.includes(newPlan)) {
      throw new Error(`Invalid plan: ${newPlan}`);
    }

    const tenant = await this.getTenant(tenantId);
    const oldPlan = tenant.plan;
    
    tenant.plan = newPlan;
    tenant.quotas = tenant.getDefaultQuotas(newPlan);
    tenant.updatedAt = new Date();
    
    console.log(`Tenant ${tenantId} plan changed: ${oldPlan} -> ${newPlan}`);
    
    return {
      success: true,
      oldPlan,
      newPlan,
      quotas: tenant.quotas
    };
  }

  /**
   * Suspend/activate tenant
   */
  async changeTenantStatus(tenantId, newStatus) {
    const validStatuses = ['active', 'suspended', 'trial'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const tenant = await this.getTenant(tenantId);
    const oldStatus = tenant.status;
    
    tenant.status = newStatus;
    tenant.updatedAt = new Date();
    
    console.log(`Tenant ${tenantId} status changed: ${oldStatus} -> ${newStatus}`);
    
    return {
      success: true,
      oldStatus,
      newStatus
    };
  }

  /**
   * Get service statistics
   */
  async getServiceStats() {
    const tenants = Array.from(this.tenants.values());
    
    const stats = {
      totalTenants: tenants.length,
      tenantsByStatus: {},
      tenantsByPlan: {},
      totalUsage: {
        daily: 0,
        monthly: 0
      }
    };

    tenants.forEach(tenant => {
      // Count by status
      stats.tenantsByStatus[tenant.status] = 
        (stats.tenantsByStatus[tenant.status] || 0) + 1;
      
      // Count by plan
      stats.tenantsByPlan[tenant.plan] = 
        (stats.tenantsByPlan[tenant.plan] || 0) + 1;
      
      // Sum usage
      stats.totalUsage.daily += tenant.usage.daily.count;
      stats.totalUsage.monthly += tenant.usage.monthly.count;
    });

    return stats;
  }

  /**
   * Generate unique tenant ID
   */
  generateId() {
    return 'tenant_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate API key
   */
  generateApiKey() {
    return 'sms_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Initialize default tenants (for testing)
   */
  async initializeDefaultTenants() {
    // Create test tenants
    await this.createTenant({
      name: 'Test Tenant Basic',
      plan: 'basic'
    });

    await this.createTenant({
      name: 'Test Tenant Premium',
      plan: 'premium'
    });

    console.log('Default tenants initialized');
  }
}

// Singleton instance
const tenantService = new TenantService();

module.exports = {
  TenantService,
  tenantService
};