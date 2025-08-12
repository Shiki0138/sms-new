import React, { createContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseAuth } from '../lib/supabase';
import { AuthContextType, Tenant, PlanType } from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      // ユーザー情報とテナント情報を取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
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
        `)
        .eq('auth_id', userId)  // id → auth_id に変更
        .single();

      if (userError) throw userError;

      if (userData && userData.tenants) {
        const tenantData = Array.isArray(userData.tenants) 
          ? userData.tenants[0] 
          : userData.tenants;
        
        setTenant({
          ...tenantData,
          plan: tenantData.plan_type // plan_type を plan にマッピング
        } as Tenant);
        setPlan(tenantData.plan_type as PlanType);
      }
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError('テナント情報の取得に失敗しました');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await supabaseAuth.signIn(email, password);
      
      if (data.user) {
        setUser(data.user);
        await fetchTenantInfo(data.user.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, tenantName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // 直接Supabaseクライアントを使用
      const data = await supabaseAuth.signUp(email, password, tenantName);
      
      if (data.user && data.tenant) {
        setUser(data.user);
        setTenant({
          ...data.tenant,
          plan: data.tenant.plan_type // plan_type を plan にマッピング
        });
        setPlan('light');
        
        // サインアップ後、自動的にテナント情報を取得
        await fetchTenantInfo(data.user.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '新規登録に失敗しました';
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
      
      await supabaseAuth.signOut();
      
      setUser(null);
      setTenant(null);
      setPlan('light');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログアウトに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初期セッション確認
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          setUser(session.user);
          await fetchTenantInfo(session.user.id);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
        setError('セッションの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchTenantInfo(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setTenant(null);
          setPlan('light');
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user: user ? { id: user.id, email: user.email || '', created_at: user.created_at || '' } : null,
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