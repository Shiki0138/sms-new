import React, { createContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseAuth } from '../lib/supabase';
import { AuthContextType, Tenant, PlanType } from '../types/auth';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState<PlanType>('light');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = async (userId: string) => {
    try {
      console.log('Fetching tenant info for user:', userId);

      // 新しいスキーマに対応: usersテーブルから情報を取得
      if (!supabase) {
        console.log('Supabase not configured');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(
          `
          tenant_id,
          role,
          tenants (
            id,
            name,
            plan_type,
            phone_number,
            address,
            created_at,
            updated_at
          )
        `
        )
        .eq('auth_id', userId)
        .single();

      if (userError) {
        console.error('User data error:', userError);
        // ユーザーが存在しない場合は、テナントなしで続行
        if (userError.code === 'PGRST116') {
          console.log('No user record found for auth user');
          return;
        }
        throw userError;
      }

      if (userData?.tenants) {
        const tenantData = Array.isArray(userData.tenants)
          ? userData.tenants[0]
          : userData.tenants;

        console.log('Tenant data loaded:', tenantData);
        setTenant({
          id: tenantData.id,
          name: tenantData.name,
          plan: tenantData.plan_type || 'light',
          phone_number: tenantData.phone_number,
          address: tenantData.address,
          created_at: tenantData.created_at,
          updated_at: tenantData.updated_at,
        });
        setPlan((tenantData.plan_type || 'light') as PlanType);
      }
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError('テナント情報の取得に失敗しました');
      // エラーが発生してもアプリを停止させない
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Attempting login for:', email);
      const data = await supabaseAuth.signIn(email, password);

      if (data.user) {
        console.log('Login successful:', data.user.id);
        setUser(data.user);
        await fetchTenantInfo(data.user.id);
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    tenantName: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Attempting signup for:', email);
      const data = await supabaseAuth.signUp(email, password, tenantName);

      if (data.user && data.tenant) {
        console.log('Signup successful:', data.user.id);
        setUser(data.user);
        setTenant({
          id: data.tenant.id,
          name: data.tenant.name,
          plan: 'light',
          phone_number: data.tenant.phone_number,
          address: data.tenant.address,
          created_at: data.tenant.created_at,
          updated_at: data.tenant.updated_at,
        });
        setPlan('light');
      }
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage =
        err instanceof Error ? err.message : '新規登録に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Logging out...');

      // Supabaseからのサインアウトを実行

      await supabaseAuth.signOut();

      setUser(null);
      setTenant(null);
      setPlan('light');
      console.log('Logout successful');
    } catch (err) {
      console.error('Logout error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'ログアウトに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 初期セッション確認
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');

        // 本番環境では常にSupabaseを使用
        // 開発環境でもSupabaseによる認証を推奨
        console.log('Using Supabase authentication...');

        if (!supabase) {
          console.log('Development mode - using mock tenant data');
          if (mounted) {
            setUser({
              id: 'dev-user-id',
              email: 'dev@example.com',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            } as User);

            setTenant({
              id: 'dev-tenant-id',
              name: 'SMS',
              plan: 'premium',
              phone_number: '03-1234-5678',
              address: '東京都渋谷区',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            setLoading(false);
          }
          return;
        }

        if (supabase) {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error('Session error:', error);
            throw error;
          }

          if (session?.user && mounted) {
            console.log('Initial session found:', session.user.id);
            setUser(session.user);
            await fetchTenantInfo(session.user.id);
          } else {
            console.log('No initial session found');
          }
        } else {
          console.log('Supabase not configured - skipping session check');
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
        if (mounted) {
          setError('セッションの取得に失敗しました');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // 認証状態変更の監視
    let subscription: { unsubscribe: () => void } | null = null;

    if (supabase?.auth?.onAuthStateChange) {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.id);

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            await fetchTenantInfo(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setTenant(null);
            setPlan('light');
          }
        } catch (err) {
          console.error('Auth state change error:', err);
          if (mounted) {
            setError('認証状態の更新に失敗しました');
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      });

      subscription = authSubscription;
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value: AuthContextType = {
    user: user
      ? {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at || '',
        }
      : null,
    tenant,
    plan,
    login,
    signup,
    logout,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
