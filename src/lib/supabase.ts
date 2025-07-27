import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database helper functions
export const supabaseAuth = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  signUp: async (email: string, password: string, tenantName: string) => {
    // 1. ユーザー作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('ユーザー作成に失敗しました');

    // 2. テナント作成
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        plan: 'light',
      })
      .select()
      .single();

    if (tenantError) throw new Error(tenantError.message);

    // 3. user_tenant_mapping作成
    const { error: mappingError } = await supabase
      .from('user_tenant_mapping')
      .insert({
        user_id: authData.user.id,
        tenant_id: tenantData.id,
        role: 'owner',
      });

    if (mappingError) throw new Error(mappingError.message);

    return { user: authData.user, tenant: tenantData };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  getCurrentUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return user;
  },
};