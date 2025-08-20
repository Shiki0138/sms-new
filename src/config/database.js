/**
 * Supabase Database Configuration
 * Version: 1.0.0
 * Created: 2025-08-20
 * 
 * This module provides the database configuration and client setup for Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Environment configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    schema: 'public',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    headers: {
      'x-application-name': 'sms-system'
    }
  }
};

// Validate required configuration
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.error('Missing required Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  if (config.nodeEnv === 'production') {
    throw new Error('Supabase configuration is required in production');
  }
}

// Create Supabase client instances
let supabaseClient = null;
let supabaseAdmin = null;

/**
 * Get or create the main Supabase client (using anon key)
 * This client respects Row Level Security policies
 */
function getSupabaseClient() {
  if (!supabaseClient && config.supabaseUrl && config.supabaseAnonKey) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: config.database.autoRefreshToken,
        persistSession: config.database.persistSession,
        detectSessionInUrl: config.database.detectSessionInUrl
      },
      global: {
        headers: config.database.headers
      },
      db: {
        schema: config.database.schema
      }
    });
  }
  return supabaseClient;
}

/**
 * Get or create the admin Supabase client (using service key)
 * This client bypasses Row Level Security - use with caution!
 */
function getSupabaseAdmin() {
  if (!supabaseAdmin && config.supabaseUrl && config.supabaseServiceKey) {
    supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          ...config.database.headers,
          'x-client-info': 'supabase-admin'
        }
      },
      db: {
        schema: config.database.schema
      }
    });
  }
  return supabaseAdmin;
}

/**
 * Database helper functions
 */
const db = {
  /**
   * Execute a query with automatic retry logic
   */
  async query(queryFn, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        const result = await queryFn();
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.code === 'PGRST301' || // JWT expired
            error.code === '42501' || // Insufficient privilege
            error.code === '23505') { // Unique violation
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError;
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Get user details including role and subscription
   */
  async getUserDetails(userId) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        subscriptions (*)
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check if user has permission for a resource
   */
  async checkPermission(userId, resource, action) {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!user) return false;

      // Define permission matrix
      const permissions = {
        admin: ['*'], // Admin can do everything
        manager: ['read', 'create', 'update'], // Manager can't delete
        staff: ['read', 'create'] // Staff can only read and create
      };

      const userPermissions = permissions[user.role] || [];
      return userPermissions.includes('*') || userPermissions.includes(action);
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  },

  /**
   * Get table with tenant filtering
   */
  getTenantTable(tableName) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    return {
      async select(columns = '*', options = {}) {
        let query = supabase.from(tableName).select(columns);
        
        if (options.filters) {
          Object.entries(options.filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        
        if (options.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending ?? true 
          });
        }
        
        if (options.limit) {
          query = query.limit(options.limit);
        }
        
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        return db.query(() => query);
      },

      async insert(data) {
        const user = await db.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        const dataWithUser = Array.isArray(data) 
          ? data.map(item => ({ ...item, user_id: user.id }))
          : { ...data, user_id: user.id };

        return db.query(() => 
          supabase.from(tableName).insert(dataWithUser).select()
        );
      },

      async update(id, data) {
        const user = await db.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        return db.query(() => 
          supabase
            .from(tableName)
            .update(data)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
        );
      },

      async delete(id) {
        const user = await db.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        return db.query(() => 
          supabase
            .from(tableName)
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
        );
      },

      async upsert(data, options = {}) {
        const user = await db.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        const dataWithUser = Array.isArray(data) 
          ? data.map(item => ({ ...item, user_id: user.id }))
          : { ...data, user_id: user.id };

        return db.query(() => 
          supabase
            .from(tableName)
            .upsert(dataWithUser, options)
            .select()
        );
      }
    };
  },

  /**
   * Transaction helper (Note: Supabase doesn't support client-side transactions)
   * This provides a batch operation interface
   */
  async batch(operations) {
    const results = [];
    const errors = [];

    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        errors.push(error);
        // Rollback logic would go here if supported
        break;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Batch operation failed: ${errors[0].message}`);
    }

    return results;
  },

  /**
   * Real-time subscription helper
   */
  subscribe(table, filters = {}, callback) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    let subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: config.database.schema,
          table: table,
          filter: Object.entries(filters)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(',')
        },
        callback
      )
      .subscribe();

    return subscription;
  },

  /**
   * Storage helper for file uploads
   */
  storage: {
    async upload(bucket, path, file, options = {}) {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, options);

      if (error) throw error;
      return data;
    },

    async download(bucket, path) {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;
      return data;
    },

    async getPublicUrl(bucket, path) {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return data.publicUrl;
    },

    async remove(bucket, paths) {
      const supabase = getSupabaseClient();
      if (!supabase) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) throw error;
      return data;
    }
  }
};

/**
 * Auth helper functions
 */
const auth = {
  async signUp(email, password, metadata = {}) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    return supabase.auth.onAuthStateChange(callback);
  }
};

/**
 * Migration helper for transitioning from in-memory to Supabase
 */
const migration = {
  /**
   * Check if we should use Supabase or fallback to in-memory
   */
  isSupabaseEnabled() {
    return !!(config.supabaseUrl && config.supabaseAnonKey);
  },

  /**
   * Get appropriate data source based on configuration
   */
  async getDataSource(tableName) {
    if (this.isSupabaseEnabled()) {
      return db.getTenantTable(tableName);
    } else {
      // Fallback to in-memory implementation
      const inMemoryDb = require('../models');
      return inMemoryDb[tableName];
    }
  }
};

module.exports = {
  config,
  getSupabaseClient,
  getSupabaseAdmin,
  db,
  auth,
  migration,
  
  // Re-export for convenience
  supabase: getSupabaseClient()
};