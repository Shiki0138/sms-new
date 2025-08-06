import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getPlanLimits, type PlanLimits, type PlanType } from '../lib/planLimits';
import { startOfMonth, format } from 'date-fns';
import { useDemoMode } from '../hooks/useDemoMode';
import { mockPlanUsage } from '../lib/mockData';

interface PlanUsage {
  customerCount: number;
  monthlyReservationCount: number;
}

interface PlanContextType {
  plan: PlanType;
  limits: PlanLimits;
  usage: PlanUsage;
  checkCustomerLimit: () => Promise<boolean>;
  checkReservationLimit: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useAuth();
  const isDemoMode = useDemoMode();
  const [usage, setUsage] = useState<PlanUsage>({
    customerCount: 0,
    monthlyReservationCount: 0,
  });

  const plan = (tenant?.plan || 'light') as PlanType;
  const limits = getPlanLimits(plan);

  useEffect(() => {
    if (tenant?.id) {
      refreshUsage();
    }
  }, [tenant?.id]);

  async function refreshUsage() {
    if (!tenant?.id) return;

    // デモモードの場合はモックデータを使用
    if (isDemoMode) {
      setUsage({
        customerCount: mockPlanUsage.customer_count,
        monthlyReservationCount: mockPlanUsage.reservation_count,
      });
      return;
    }

    try {
      // 顧客数を取得
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      // 今月の予約数を取得
      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const { data: usageData } = await supabase
        .from('plan_usage')
        .select('reservation_count')
        .eq('tenant_id', tenant.id)
        .eq('month', currentMonth)
        .single();

      setUsage({
        customerCount: customerCount || 0,
        monthlyReservationCount: usageData?.reservation_count || 0,
      });
    } catch (error) {
      console.error('Error fetching plan usage:', error);
    }
  }

  async function checkCustomerLimit(): Promise<boolean> {
    await refreshUsage();
    if (limits.customers === null) return true;
    return usage.customerCount < limits.customers;
  }

  async function checkReservationLimit(): Promise<boolean> {
    await refreshUsage();
    if (limits.monthlyReservations === null) return true;
    return usage.monthlyReservationCount < limits.monthlyReservations;
  }

  const value: PlanContextType = {
    plan,
    limits,
    usage,
    checkCustomerLimit,
    checkReservationLimit,
    refreshUsage,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}