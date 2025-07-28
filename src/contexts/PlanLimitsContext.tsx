import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ApiService } from '../services/api-service';
import { toast } from 'sonner';

interface PlanLimits {
  customers: number;
  monthlyReservations: number;
  staffAccounts: number;
  dataRetentionMonths: number;
  monthlyAiReplies: number;
  monthlyMessages: number;
}

interface PlanUsage {
  customers: number;
  monthlyReservations: number;
  staffAccounts: number;
  monthlyAiReplies: number;
  monthlyMessages: number;
}

interface PlanLimitsContextType {
  // ライトプラン制限
  limits: PlanLimits;
  
  // 現在の使用状況
  usage: PlanUsage;
  
  // 制限チェック関数
  checkCustomerLimit: () => Promise<boolean>;
  checkReservationLimit: () => Promise<boolean>;
  checkStaffLimit: () => Promise<boolean>;
  checkAiReplyLimit: () => Promise<boolean>;
  checkMessageLimit: () => Promise<boolean>;
  
  // 制限到達時の処理
  showUpgradeModal: (limitType: string) => void;
  
  // 使用率計算
  getUsagePercentage: (type: keyof PlanUsage) => number;
  
  // 使用状況を更新
  refreshUsage: () => Promise<void>;
  
  // 使用状況をインクリメント
  incrementUsage: (type: keyof PlanUsage, amount?: number) => Promise<void>;
  
  // ローディング状態
  isLoading: boolean;
}

const LIGHT_PLAN_LIMITS: PlanLimits = {
  customers: 100,
  monthlyReservations: 50,
  staffAccounts: 1,
  dataRetentionMonths: 12,
  monthlyAiReplies: 200,
  monthlyMessages: 200,
};

const PlanLimitsContext = createContext<PlanLimitsContextType | undefined>(undefined);

export const PlanLimitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useAuth();
  const [limits] = useState<PlanLimits>(LIGHT_PLAN_LIMITS);
  const [usage, setUsage] = useState<PlanUsage>({
    customers: 0,
    monthlyReservations: 0,
    staffAccounts: 0,
    monthlyAiReplies: 0,
    monthlyMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalType, setUpgradeModalType] = useState<string | null>(null);

  // 使用状況を取得
  const fetchUsage = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      // APIサービスから現在の使用状況を取得
      const currentUsage = await ApiService.getCurrentPlanUsage(tenant.id);
      
      // 実際の顧客数とスタッフ数を取得
      const customerCount = await ApiService.getCustomerCount(tenant.id);
      const staffCount = await ApiService.getStaffCount(tenant.id);

      setUsage({
        customers: customerCount,
        monthlyReservations: currentUsage.reservations_count || 0,
        staffAccounts: staffCount,
        monthlyAiReplies: currentUsage.ai_replies_count || 0,
        monthlyMessages: currentUsage.messages_sent || 0,
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast.error('使用状況の取得に失敗しました');
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchUsage().finally(() => setIsLoading(false));
  }, [fetchUsage]);

  // リアルタイム更新の設定
  useEffect(() => {
    if (!tenant?.id) return;

    const subscription = supabase
      .channel(`plan_usage_${tenant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customers',
        filter: `tenant_id=eq.${tenant.id}`,
      }, fetchUsage)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `tenant_id=eq.${tenant.id}`,
      }, fetchUsage)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plan_usage',
        filter: `tenant_id=eq.${tenant.id}`,
      }, fetchUsage)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff',
        filter: `tenant_id=eq.${tenant.id}`,
      }, fetchUsage)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenant?.id, fetchUsage]);

  const checkCustomerLimit = useCallback(async (): Promise<boolean> => {
    await fetchUsage();
    return usage.customers < limits.customers;
  }, [usage.customers, limits.customers, fetchUsage]);

  const checkReservationLimit = useCallback(async (): Promise<boolean> => {
    await fetchUsage();
    return usage.monthlyReservations < limits.monthlyReservations;
  }, [usage.monthlyReservations, limits.monthlyReservations, fetchUsage]);

  const checkStaffLimit = useCallback(async (): Promise<boolean> => {
    await fetchUsage();
    return usage.staffAccounts < limits.staffAccounts;
  }, [usage.staffAccounts, limits.staffAccounts, fetchUsage]);

  const checkAiReplyLimit = useCallback(async (): Promise<boolean> => {
    await fetchUsage();
    return usage.monthlyAiReplies < limits.monthlyAiReplies;
  }, [usage.monthlyAiReplies, limits.monthlyAiReplies, fetchUsage]);

  const checkMessageLimit = useCallback(async (): Promise<boolean> => {
    await fetchUsage();
    return usage.monthlyMessages < limits.monthlyMessages;
  }, [usage.monthlyMessages, limits.monthlyMessages, fetchUsage]);

  const showUpgradeModal = useCallback((limitType: string) => {
    setUpgradeModalType(limitType);
    // ここでモーダルを表示する処理を実装
    const event = new CustomEvent('showPlanLimitModal', { 
      detail: { limitType } 
    });
    window.dispatchEvent(event);
  }, []);

  const getUsagePercentage = useCallback((type: keyof PlanUsage): number => {
    const usageValue = usage[type];
    const limitValue = limits[type as keyof PlanLimits];
    
    if (typeof limitValue !== 'number' || limitValue === 0) return 0;
    
    return Math.min(Math.round((usageValue / limitValue) * 100), 100);
  }, [usage, limits]);

  const refreshUsage = useCallback(async () => {
    setIsLoading(true);
    await fetchUsage();
    setIsLoading(false);
  }, [fetchUsage]);

  const incrementUsage = useCallback(async (type: keyof PlanUsage, amount: number = 1) => {
    if (!tenant?.id) return;

    try {
      // プラン使用ログに記録
      await supabase.from('plan_usage_logs').insert({
        tenant_id: tenant.id,
        usage_type: type,
        usage_count: amount,
        created_at: new Date().toISOString(),
      });

      // ローカルの状態を更新
      setUsage(prev => ({
        ...prev,
        [type]: prev[type] + amount,
      }));

      // 制限に達した場合の処理
      const newUsage = usage[type] + amount;
      const limit = limits[type as keyof PlanLimits];
      
      if (typeof limit === 'number' && newUsage >= limit) {
        toast.warning(`${type}の使用上限に達しました`);
        showUpgradeModal(type);
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [tenant?.id, usage, limits, showUpgradeModal]);

  const value: PlanLimitsContextType = {
    limits,
    usage,
    checkCustomerLimit,
    checkReservationLimit,
    checkStaffLimit,
    checkAiReplyLimit,
    checkMessageLimit,
    showUpgradeModal,
    getUsagePercentage,
    refreshUsage,
    incrementUsage,
    isLoading,
  };

  return (
    <PlanLimitsContext.Provider value={value}>
      {children}
    </PlanLimitsContext.Provider>
  );
};

export const usePlanLimits = () => {
  const context = useContext(PlanLimitsContext);
  if (!context) {
    throw new Error('usePlanLimits must be used within a PlanLimitsProvider');
  }
  return context;
};