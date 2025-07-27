import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseAuth } from '../lib/supabase';
import { AuthContextType, Tenant, PlanType } from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 開発環境の場合、ダミーユーザーを設定
  const isDev = import.meta.env.DEV;
  
  const [user, setUser] = useState<User | null>(
    isDev ? ({ id: 'dev-user', email: 'dev@example.com', created_at: new Date().toISOString() } as User) : null
  );
  const [tenant, setTenant] = useState<Tenant | null>(
    isDev ? {
      id: 'dev-tenant',
      name: '開発用サロン',
      plan: 'light',
      phone_number: '03-1234-5678',
      address: '東京都渋谷区開発1-2-3',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null
  );
  const [plan, setPlan] = useState<PlanType>('light');
  const [loading, setLoading] = useState(!isDev);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = async (userId: string) => {
    try {
      const { data: mapping, error: mappingError } = await supabase
        .from('user_tenant_mapping')
        .select(`
          tenant_id,
          role,
          tenants (
            id,
            name,
            plan,
            phone_number,
            address,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .single();

      if (mappingError) throw mappingError;

      if (mapping && mapping.tenants) {
        const tenantData = Array.isArray(mapping.tenants) 
          ? mapping.tenants[0] 
          : mapping.tenants;
        
        setTenant(tenantData as Tenant);
        setPlan(tenantData.plan as PlanType);
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
      
      const data = await supabaseAuth.signUp(email, password, tenantName);
      
      if (data.user && data.tenant) {
        setUser(data.user);
        setTenant(data.tenant);
        setPlan('light');
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
    // 開発環境の場合はスキップ
    if (isDev) {
      return;
    }
    
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
  }, [isDev]);

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