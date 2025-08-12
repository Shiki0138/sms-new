import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for environment variables
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn('Missing Supabase environment variables - running in demo mode');
}

// Create Supabase client with fallback for demo mode
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null; // Fallback for demo mode

// Demo mode flag
export const isDemoMode = !hasSupabaseConfig;

// Database helper functions
export const supabaseAuth = {
  signIn: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error(
        'Supabase is not configured. Please set environment variables.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  signUp: async (email: string, password: string, tenantName: string) => {
    try {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured. Please set environment variables.'
        );
      }
      // 1. ユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('ユーザー作成に失敗しました');

      // 少し待機（認証が完了するまで）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2. テナント作成（新しいテーブル構造に合わせて修正）
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          plan_type: 'light',
          email: email,
          settings: {
            business_name: tenantName,
            business_type: 'beauty_salon',
            timezone: 'Asia/Tokyo',
          },
        })
        .select()
        .single();

      if (tenantError) {
        console.error('Tenant creation error:', tenantError);
        throw new Error(`テナント作成エラー: ${tenantError.message}`);
      }

      // 3. usersテーブルにレコード作成
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          tenant_id: tenantData.id,
          email: email,
          full_name: tenantName + ' オーナー',
          role: 'owner',
        })
        .select()
        .single();

      if (userError) {
        console.error('User record creation error:', userError);
        throw new Error(`ユーザー作成エラー: ${userError.message}`);
      }

      // 4. 初期のプラン使用状況を作成
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { error: usageError } = await supabase.from('plan_usage').insert({
        tenant_id: tenantData.id,
        month: currentMonth,
        customers_count: 0,
        reservations_count: 0,
        messages_sent: 0,
        ai_replies_count: 0,
      });

      if (usageError) {
        console.error('プラン使用状況の初期化エラー:', usageError);
        // エラーでも続行
      }

      // 5. 営業時間の初期設定
      const businessHours = [];
      for (let day = 0; day <= 6; day++) {
        businessHours.push({
          tenant_id: tenantData.id,
          day_of_week: day,
          is_open: day !== 2, // 火曜日定休
          open_time: day !== 2 ? '09:00' : null,
          close_time: day !== 2 ? '20:00' : null,
        });
      }

      const { error: hoursError } = await supabase
        .from('business_hours')
        .insert(businessHours);

      if (hoursError) {
        console.error('営業時間の初期化エラー:', hoursError);
        // エラーでも続行
      }

      return { user: authData.user, tenant: tenantData };
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  },

  signOut: async () => {
    if (!supabase) {
      throw new Error(
        'Supabase is not configured. Please set environment variables.'
      );
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  getCurrentUser: async () => {
    if (!supabase) {
      throw new Error(
        'Supabase is not configured. Please set environment variables.'
      );
    }
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return user;
  },
};
