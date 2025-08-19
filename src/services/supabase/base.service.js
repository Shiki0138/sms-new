const { supabase, supabaseAdmin, supabaseHelpers } = require('../../config/supabase/client');

/**
 * Base service class for Supabase operations
 * Provides common CRUD operations and utilities
 */
class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
    this.supabase = supabase;
    this.supabaseAdmin = supabaseAdmin;
    this.helpers = supabaseHelpers;
  }

  /**
   * Get all records with optional filters
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of records
   */
  async findAll(options = {}) {
    try {
      const {
        filters = {},
        select = '*',
        orderBy = 'created_at',
        orderDirection = 'desc',
        limit,
        offset,
        tenantId
      } = options;

      let query = this.supabase
        .from(this.tableName)
        .select(select);

      // Apply tenant filter if provided
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.operator) {
            // Support for custom operators like {operator: 'gte', value: 10}
            const { operator, value: operatorValue } = value;
            query = query[operator](key, operatorValue);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
      }

      // Apply pagination
      if (limit && offset !== undefined) {
        query = query.range(offset, offset + limit - 1);
      } else if (limit) {
        query = query.limit(limit);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return { data, count };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a single record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Single record
   */
  async findById(id, options = {}) {
    try {
      const { select = '*', tenantId } = options;

      let query = this.supabase
        .from(this.tableName)
        .select(select)
        .eq('id', id);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a single record by filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Single record
   */
  async findOne(filters, options = {}) {
    try {
      const { select = '*', tenantId } = options;

      let query = this.supabase
        .from(this.tableName)
        .select(select);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @param {Object} options - Create options
   * @returns {Promise<Object>} Created record
   */
  async create(data, options = {}) {
    try {
      const { returning = true, tenantId } = options;

      // Add tenant_id if provided
      if (tenantId) {
        data.tenant_id = tenantId;
      }

      const query = this.supabase.from(this.tableName).insert(data);

      if (returning) {
        query.select();
      }

      const { data: createdData, error } = await query;

      if (error) throw error;

      return returning ? createdData[0] : createdData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create multiple records
   * @param {Array} records - Array of records to create
   * @param {Object} options - Create options
   * @returns {Promise<Array>} Created records
   */
  async createMany(records, options = {}) {
    try {
      const { batchSize = 100, tenantId } = options;

      // Add tenant_id to all records if provided
      if (tenantId) {
        records = records.map(record => ({ ...record, tenant_id: tenantId }));
      }

      return await this.helpers.batchInsert(this.tableName, records, { batchSize });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated record
   */
  async update(id, data, options = {}) {
    try {
      const { returning = true, tenantId } = options;

      // Remove id from data to prevent updating it
      delete data.id;

      let query = this.supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (returning) {
        query = query.select();
      }

      const { data: updatedData, error } = await query;

      if (error) throw error;

      return returning ? updatedData[0] : updatedData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update multiple records by filter
   * @param {Object} filters - Filter criteria
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Array>} Updated records
   */
  async updateMany(filters, data, options = {}) {
    try {
      const { returning = true, tenantId } = options;

      let query = this.supabase
        .from(this.tableName)
        .update(data);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      if (returning) {
        query = query.select();
      }

      const { data: updatedData, error } = await query;

      if (error) throw error;

      return updatedData;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @returns {Promise<boolean>} Success status
   */
  async delete(id, options = {}) {
    try {
      const { tenantId } = options;

      let query = this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { error } = await query;

      if (error) throw error;

      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete multiple records by filter
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Delete options
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteMany(filters, options = {}) {
    try {
      const { tenantId } = options;

      let query = this.supabase
        .from(this.tableName)
        .delete();

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { error, count } = await query;

      if (error) throw error;

      return count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Count records with optional filters
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<number>} Count of records
   */
  async count(filters = {}, options = {}) {
    try {
      const { tenantId } = options;

      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) throw error;

      return count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if a record exists
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<boolean>} Existence status
   */
  async exists(filters, options = {}) {
    const count = await this.count(filters, options);
    return count > 0;
  }

  /**
   * Execute a raw query (using RPC)
   * @param {string} functionName - Database function name
   * @param {Object} params - Function parameters
   * @returns {Promise<any>} Query result
   */
  async executeRpc(functionName, params = {}) {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params);

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Subscribe to real-time changes
   * @param {Object} options - Subscription options
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription object
   */
  subscribe(options = {}, callback) {
    const { event = '*', filters = {} } = options;

    return this.helpers.subscribe(
      this.tableName,
      {
        event,
        filter: Object.entries(filters)
          .map(([key, value]) => `${key}=eq.${value}`)
          .join(',')
      },
      callback
    );
  }

  /**
   * Handle and format errors
   * @param {Error} error - Original error
   * @returns {Error} Formatted error
   */
  handleError(error) {
    const formattedError = this.helpers.handleError(error);
    
    return new Error(
      JSON.stringify({
        message: formattedError.message,
        code: formattedError.code,
        details: error.details || error.hint || null
      })
    );
  }

  /**
   * Transaction wrapper
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    return await this.helpers.transaction(callback);
  }
}

module.exports = BaseService;