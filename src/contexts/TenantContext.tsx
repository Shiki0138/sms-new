import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import type { Tenant } from '../types/auth';

interface TenantContextType {
  tenant: Tenant | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useAuth();

  const value: TenantContextType = {
    tenant,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}