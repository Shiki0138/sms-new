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

    // 2. テナント作成（新しいテーブル構造に合わせて修正）
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        plan_type: 'light',  // plan → plan_type
        email: email,
        settings: {
          business_name: tenantName,
          business_type: 'beauty_salon',
          timezone: 'Asia/Tokyo'
        }
      })
      .select()
      .single();

    if (tenantError) throw new Error(`テナント作成エラー: ${tenantError.message}`);

    // 3. usersテーブルにレコード作成
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: tenantData.id,
        email: email,
        full_name: tenantName + ' オーナー',
        role: 'owner',
      });

    if (userError) throw new Error(`ユーザー作成エラー: ${userError.message}`);

    // 4. 初期のプラン使用状況を作成
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { error: usageError } = await supabase
      .from('plan_usage')
      .insert({
        tenant_id: tenantData.id,
        month: currentMonth,
        customers_count: 0,
        reservations_count: 0,
        messages_sent: 0,
        ai_replies_count: 0,
      });

    if (usageError) {
      console.error('プラン使用状況の初期化エラー:', usageError);
    }

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