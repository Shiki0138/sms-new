import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ApiService } from '../services/api-service';
import { toast } from 'sonner';

// 型定義
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
  limits: PlanLimits;
  usage: PlanUsage;
  checkCustomerLimit: () => Promise<boolean>;
  checkReservationLimit: () => Promise<boolean>;
  checkStaffLimit: () => Promise<boolean>;
  checkAiReplyLimit: () => Promise<boolean>;
  checkMessageLimit: () => Promise<boolean>;
  showUpgradeModal: (limitType: string) => void;
  getUsagePercentage: (type: keyof PlanUsage) => number;
  refreshUsage: () => Promise<void>;
  incrementUsage: (type: keyof PlanUsage, amount?: number) => Promise<void>;
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

// デフォルト値
const defaultContextValue: PlanLimitsContextType = {
  limits: LIGHT_PLAN_LIMITS,
  usage: {
    customers: 0,
    monthlyReservations: 0,
    staffAccounts: 0,
    monthlyAiReplies: 0,
    monthlyMessages: 0,
  },
  checkCustomerLimit: async () => true,
  checkReservationLimit: async () => true,
  checkStaffLimit: async () => true,
  checkAiReplyLimit: async () => true,
  checkMessageLimit: async () => true,
  showUpgradeModal: () => {},
  getUsagePercentage: () => 0,
  refreshUsage: async () => {},
  incrementUsage: async () => {},
  isLoading: false,
};

// コンテキストをデフォルト値で初期化
export const PlanLimitsContext = createContext<PlanLimitsContextType>(defaultContextValue);

// グローバル変数でコンテキスト値を保持（本番環境でのエラー回避）
let globalContextValue: PlanLimitsContextType = defaultContextValue;

// ウィンドウオブジェクトにもアタッチ（ビルド最適化対策）
if (typeof window !== 'undefined') {
  (window as any).__planLimitsContext = defaultContextValue;
}

// Provider用のメモ化されたコンポーネント
export const PlanLimitsProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
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
  const isMountedRef = useRef(true);

  // クリーンアップ時にフラグを設定
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 使用状況を取得
  const fetchUsage = useCallback(async () => {
    if (!tenant?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // エラーハンドリングを強化
      const [currentUsage, customerCount, staffCount] = await Promise.all([
        ApiService.getCurrentPlanUsage(tenant.id).catch(() => ({})),
        ApiService.getCustomerCount(tenant.id).catch(() => 0),
        ApiService.getStaffCount(tenant.id).catch(() => 0),
      ]);

      // マウントされている場合のみ状態を更新
      if (isMountedRef.current) {
        setUsage({
          customers: customerCount,
          monthlyReservations: currentUsage?.reservations_count || 0,
          staffAccounts: staffCount,
          monthlyAiReplies: currentUsage?.ai_replies_count || 0,
          monthlyMessages: currentUsage?.messages_sent || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      // エラーでもアプリを継続できるようにする
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

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

  // グローバル変数に値を保存（本番環境でのエラー回避）
  useEffect(() => {
    globalContextValue = value;
    // ウィンドウオブジェクトにも保存
    if (typeof window !== 'undefined') {
      (window as any).__planLimitsContext = value;
    }
  }, [value]);

  return (
    <PlanLimitsContext.Provider value={value}>
      {children}
    </PlanLimitsContext.Provider>
  );
});

PlanLimitsProvider.displayName = 'PlanLimitsProvider';

// エラーを投げずにデフォルト値を返すバージョン
export const usePlanLimits = () => {
  try {
    const context = useContext(PlanLimitsContext);
    
    // contextがundefinedの場合、グローバル値を確認
    if (!context) {
      // ウィンドウオブジェクトから取得を試みる
      if (typeof window !== 'undefined' && (window as any).__planLimitsContext) {
        console.warn('usePlanLimits: Using window context value');
        return (window as any).__planLimitsContext;
      }
      
      // 本番環境でのビルド最適化によるエラーを回避
      if (typeof globalContextValue !== 'undefined' && globalContextValue !== defaultContextValue) {
        console.warn('usePlanLimits: Using global context value');
        return globalContextValue;
      }
      
      console.warn('usePlanLimits: Using default values (not wrapped in PlanLimitsProvider)');
      return defaultContextValue;
    }
    
    return context;
  } catch (error) {
    // コンポーネント外で呼ばれた場合
    console.warn('usePlanLimits: Called outside of React component', error);
    
    // ウィンドウオブジェクトから取得を試みる
    if (typeof window !== 'undefined' && (window as any).__planLimitsContext) {
      return (window as any).__planLimitsContext;
    }
    
    // グローバル値が利用可能な場合はそれを返す
    if (typeof globalContextValue !== 'undefined' && globalContextValue !== defaultContextValue) {
      return globalContextValue;
    }
    
    return defaultContextValue;
  }
};

// 安全なコンテキスト取得関数
export const getPlanLimitsContext = (): PlanLimitsContextType => {
  // ウィンドウオブジェクトから取得を試みる
  if (typeof window !== 'undefined' && (window as any).__planLimitsContext) {
    return (window as any).__planLimitsContext;
  }
  
  if (typeof globalContextValue !== 'undefined' && globalContextValue !== defaultContextValue) {
    return globalContextValue;
  }
  return defaultContextValue;
};

// イベントリスナーを設定（グローバルアクセス用）
if (typeof window !== 'undefined') {
  window.addEventListener('getPlanLimits', (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && typeof customEvent.detail === 'object') {
      customEvent.detail.planLimits = getPlanLimitsContext();
    }
  });
}