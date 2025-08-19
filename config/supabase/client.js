const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables. Please check your .env file.'
  );
}

// Create public client (for client-side operations)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-application-name': 'salon-lumiere' },
  },
});

// Create admin client (for server-side operations with elevated privileges)
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    })
  : null;

// Helper functions for common operations
const supabaseHelpers = {
  // Get current user
  getCurrentUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get user's tenant
  getUserTenant: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('tenant_id, tenants(*)')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.tenants;
  },

  // Check if user has specific role
  hasRole: async (userId, role) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.role === role;
  },

  // Handle Supabase errors
  handleError: (error) => {
    console.error('Supabase error:', error);
    
    // Return user-friendly error messages
    if (error.code === '23505') {
      return { message: 'This record already exists', code: 'DUPLICATE_ENTRY' };
    }
    if (error.code === '23503') {
      return { message: 'Related record not found', code: 'FOREIGN_KEY_VIOLATION' };
    }
    if (error.code === '22P02') {
      return { message: 'Invalid input format', code: 'INVALID_INPUT' };
    }
    if (error.code === 'PGRST116') {
      return { message: 'Record not found', code: 'NOT_FOUND' };
    }
    if (error.code === '42501') {
      return { message: 'Permission denied', code: 'UNAUTHORIZED' };
    }
    
    return { message: error.message || 'An unexpected error occurred', code: 'UNKNOWN_ERROR' };
  },

  // Pagination helper
  paginate: (query, page = 1, limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    return query.range(from, to);
  },

  // Batch operations wrapper
  batchInsert: async (table, records, options = {}) => {
    const batchSize = options.batchSize || 100;
    const results = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { data, error } = await supabase.from(table).insert(batch).select();
      
      if (error) {
        throw error;
      }
      
      results.push(...data);
    }
    
    return results;
  },

  // Transaction helper (using RPC)
  transaction: async (callback) => {
    try {
      const { data, error } = await supabase.rpc('begin_transaction');
      if (error) throw error;
      
      const result = await callback(supabase);
      
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;
      
      return result;
    } catch (error) {
      await supabase.rpc('rollback_transaction').catch(console.error);
      throw error;
    }
  },

  // Real-time subscription helper
  subscribe: (table, filters, callback) => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          ...filters,
        },
        callback
      )
      .subscribe();
    
    return channel;
  },

  // Storage helpers
  storage: {
    upload: async (bucket, path, file, options = {}) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, options);
      
      if (error) throw error;
      return data;
    },
    
    download: async (bucket, path) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      
      if (error) throw error;
      return data;
    },
    
    getPublicUrl: (bucket, path) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
    
    remove: async (bucket, paths) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths);
      
      if (error) throw error;
      return data;
    },
  },
};

module.exports = {
  supabase,
  supabaseAdmin,
  supabaseHelpers,
};