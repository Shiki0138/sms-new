import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 環境変数の安全な取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 環境変数が設定されているかチェック
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ダミークライアント（環境変数が未設定の場合）
const createDummyClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase未設定' },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase未設定' },
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { message: 'Supabase未設定' },
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        order: () => ({
          limit: () => ({
            range: async () => ({ data: [], error: null }),
          }),
        }),
      }),
      insert: async () => ({
        data: null,
        error: { message: 'Supabase未設定' },
      }),
      update: async () => ({
        data: null,
        error: { message: 'Supabase未設定' },
      }),
      delete: async () => ({
        data: null,
        error: { message: 'Supabase未設定' },
      }),
    }),
  } as unknown as SupabaseClient;
};

// Supabaseクライアントの作成（エラーをスローしない）
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createDummyClient();

// 設定警告メッセージ
export const getConfigWarning = () => {
  if (!isSupabaseConfigured) {
    return {
      title: '⚠️ Supabase設定が必要です',
      message:
        '環境変数 VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
      isDevelopment: import.meta.env.DEV,
    };
  }
  return null;
};

// Database helper functions
export const supabaseAuth = {
  signIn: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabaseが設定されていません。環境変数を確認してください。'
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
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabaseが設定されていません。環境変数を確認してください。'
      );
    }
    try {
      // 既存のサインアップロジック
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('ユーザー作成に失敗しました');

      await new Promise((resolve) => setTimeout(resolve, 1000));

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

      return { user: authData.user, tenant: tenantData };
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  },

  signOut: async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  getCurrentUser: async () => {
    if (!isSupabaseConfigured) {
      return null;
    }
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return user;
  },
};
