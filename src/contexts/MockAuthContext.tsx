import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User } from '../types/auth';

// デモ用のモックユーザー
const mockUser: User = {
  id: 'demo-user-id',
  email: 'demo@example.com',
  created_at: new Date().toISOString(),
};

const mockTenant = {
  id: 'demo-tenant-id',
  name: 'デモサロン',
  plan: 'premium' as const,
  phone_number: '03-1234-5678',
  address: '東京都渋谷区デモ町1-2-3',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // デモモードでは自動的にログイン状態にする
    const demoMode = localStorage.getItem('demoMode');
    if (demoMode === 'true') {
      setUser(mockUser);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // デモモード: どんな認証情報でもログイン成功
    localStorage.setItem('demoMode', 'true');
    setUser(mockUser);
    return { user: mockUser, session: null, error: null };
  };

  const signUp = async (email: string, password: string, tenantName: string) => {
    // デモモード: どんな認証情報でも登録成功
    localStorage.setItem('demoMode', 'true');
    setUser(mockUser);
    return { user: mockUser, session: null, error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('demoMode');
    setUser(null);
  };

  const value = {
    user,
    tenant: user ? mockTenant : null,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}