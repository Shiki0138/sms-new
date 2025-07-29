import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
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

const PlanLimitsContext = createContext<PlanLimitsContextType | undefined>(
  undefined
);

export const PlanLimitsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { tenant } = useAuth();
  const [limits] = useState<PlanLimits>(LIGHT_PLAN_LIMITS);
  const [usage, setUsage] = useState<PlanUsage>({
    customers: 0,
    monthlyReservations: 0,
    staffAccounts: 0,
    monthlyAiReplies: 0,
    monthlyMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // 安全な使用状況取得（エラーハンドリング強化）
  const fetchUsage = useCallback(async () => {
    if (!tenant?.id) {
      console.log('No tenant ID available');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching usage for tenant:', tenant.id);

      // 顧客数を取得
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenant.id);

      if (customerError) {
        console.error('Customer count error:', customerError);
      }

      // 今月の予約数を取得
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: reservations, error: reservationError } = await supabase
        .from('reservations')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenant.id)
        .gte('start_time', currentMonth);

      if (reservationError) {
        console.error('Reservation count error:', reservationError);
      }

      // スタッフ数を取得
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id', { count: 'exact' })
        .eq('tenant_id', tenant.id)
        .eq('is_active', true);

      if (staffError) {
        console.error('Staff count error:', staffError);
      }

      // プラン使用状況を取得
      const { data: planUsage, error: planUsageError } = await supabase
        .from('plan_usage')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('month', currentMonth)
        .single();

      if (planUsageError && planUsageError.code !== 'PGRST116') {
        console.error('Plan usage error:', planUsageError);
      }

      // 使用状況を更新
      setUsage({
        customers: customers?.length || 0,
        monthlyReservations: reservations?.length || 0,
        staffAccounts: staff?.length || 0,
        monthlyAiReplies: planUsage?.ai_replies_count || 0,
        monthlyMessages: planUsage?.messages_sent || 0,
      });

      console.log('Usage updated:', {
        customers: customers?.length || 0,
        monthlyReservations: reservations?.length || 0,
        staffAccounts: staff?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
      // エラーが発生してもアプリを停止させない
      toast.error('使用状況の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  // 初回読み込み
  useEffect(() => {
    if (tenant?.id) {
      fetchUsage();
    }
  }, [tenant?.id, fetchUsage]);

  // 制限チェック関数（安全な実装）
  const checkCustomerLimit = useCallback(async (): Promise<boolean> => {
    try {
      await fetchUsage();
      return usage.customers < limits.customers;
    } catch (error) {
      console.error('Error checking customer limit:', error);
      return true; // エラー時は制限なしとして扱う
    }
  }, [usage.customers, limits.customers, fetchUsage]);

  const checkReservationLimit = useCallback(async (): Promise<boolean> => {
    try {
      await fetchUsage();
      return usage.monthlyReservations < limits.monthlyReservations;
    } catch (error) {
      console.error('Error checking reservation limit:', error);
      return true;
    }
  }, [usage.monthlyReservations, limits.monthlyReservations, fetchUsage]);

  const checkStaffLimit = useCallback(async (): Promise<boolean> => {
    try {
      await fetchUsage();
      return usage.staffAccounts < limits.staffAccounts;
    } catch (error) {
      console.error('Error checking staff limit:', error);
      return true;
    }
  }, [usage.staffAccounts, limits.staffAccounts, fetchUsage]);

  const checkAiReplyLimit = useCallback(async (): Promise<boolean> => {
    try {
      await fetchUsage();
      return usage.monthlyAiReplies < limits.monthlyAiReplies;
    } catch (error) {
      console.error('Error checking AI reply limit:', error);
      return true;
    }
  }, [usage.monthlyAiReplies, limits.monthlyAiReplies, fetchUsage]);

  const checkMessageLimit = useCallback(async (): Promise<boolean> => {
    try {
      await fetchUsage();
      return usage.monthlyMessages < limits.monthlyMessages;
    } catch (error) {
      console.error('Error checking message limit:', error);
      return true;
    }
  }, [usage.monthlyMessages, limits.monthlyMessages, fetchUsage]);

  const showUpgradeModal = useCallback((limitType: string) => {
    console.log('Showing upgrade modal for:', limitType);
    toast.warning(
      `${limitType}の使用上限に達しました。プランのアップグレードをご検討ください。`
    );
  }, []);

  const getUsagePercentage = useCallback(
    (type: keyof PlanUsage): number => {
      try {
        const usageValue = usage[type];
        const limitValue = limits[type as keyof PlanLimits];

        if (typeof limitValue !== 'number' || limitValue === 0) return 0;

        return Math.min(Math.round((usageValue / limitValue) * 100), 100);
      } catch (error) {
        console.error('Error calculating usage percentage:', error);
        return 0;
      }
    },
    [usage, limits]
  );

  const refreshUsage = useCallback(async () => {
    try {
      await fetchUsage();
    } catch (error) {
      console.error('Error refreshing usage:', error);
    }
  }, [fetchUsage]);

  const incrementUsage = useCallback(
    async (type: keyof PlanUsage, amount: number = 1) => {
      try {
        if (!tenant?.id) return;

        // ローカルの状態を更新
        setUsage((prev) => ({
          ...prev,
          [type]: prev[type] + amount,
        }));

        // 制限チェック
        const newUsage = usage[type] + amount;
        const limit = limits[type as keyof PlanLimits];

        if (typeof limit === 'number' && newUsage >= limit) {
          showUpgradeModal(type);
        }
      } catch (error) {
        console.error('Error incrementing usage:', error);
      }
    },
    [tenant?.id, usage, limits, showUpgradeModal]
  );

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

// eslint-disable-next-line react-refresh/only-export-components
export const usePlanLimits = () => {
  const context = useContext(PlanLimitsContext);
  if (!context) {
    throw new Error('usePlanLimits must be used within a PlanLimitsProvider');
  }
  return context;
};
