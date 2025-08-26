import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// IMPORTANT: Do NOT expose service role key in client bundles

// Create Supabase client for public/client-side use
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'salon-lumiere',
    },
  },
});

// Create Supabase admin client for server-side use
// Server-side admin client moved to server-only module to prevent key leakage
// See: src/server/supabaseAdmin.js

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Database helpers
export const getTenantId = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();
  
  return data?.tenant_id || null;
};

// Subscription helpers
export const getSubscription = async (tenantId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();
  
  return { data, error };
};

// Feature access helpers
export const hasFeatureAccess = async (tenantId, featureName) => {
  const { data: subscription } = await getSubscription(tenantId);
  
  if (!subscription) return false;
  
  const { data: planFeatures } = await supabase
    .from('plan_features')
    .select('features')
    .eq('plan_id', subscription.plan_id)
    .single();
  
  return planFeatures?.features?.[featureName] === true;
};

// Real-time subscriptions
export const subscribeToReservations = (tenantId, callback) => {
  return supabase
    .channel('reservations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `tenant_id=eq.${tenantId}`,
      },
      callback
    )
    .subscribe();
};

// Storage helpers
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  return { data, error };
};

export const getFileUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Error handling
export const handleSupabaseError = (error) => {
  if (error?.code === 'PGRST116') {
    return 'データが見つかりませんでした。';
  }
  if (error?.code === '23505') {
    return 'このデータは既に存在します。';
  }
  if (error?.code === '42501') {
    return 'この操作を実行する権限がありません。';
  }
  if (error?.message?.includes('JWT')) {
    return 'セッションの有効期限が切れました。再度ログインしてください。';
  }
  return error?.message || '予期しないエラーが発生しました。';
};
