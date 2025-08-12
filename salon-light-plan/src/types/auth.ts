export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'light' | 'standard' | 'premium';
  phone_number?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTenantMapping {
  user_id: string;
  tenant_id: string;
  role: 'owner' | 'staff';
  created_at: string;
}

export type PlanType = 'light' | 'standard' | 'premium';

export interface PlanLimits {
  customers: number;
  monthlyReservations: number;
  staffAccounts: number;
  dataRetentionMonths: number;
}

export interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  plan: PlanType;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, tenantName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}