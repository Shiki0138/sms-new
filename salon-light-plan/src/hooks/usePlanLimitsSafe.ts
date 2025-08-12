import { useCallback, useRef, useEffect } from 'react';
import { usePlanLimits } from '../contexts/PlanLimitsContext';

// デフォルトのフォールバック値
const defaultLimits = {
  customers: 100,
  monthlyReservations: 50,
  staffAccounts: 1,
  dataRetentionMonths: 12,
  monthlyAiReplies: 200,
  monthlyMessages: 200,
};

const defaultUsage = {
  customers: 0,
  monthlyReservations: 0,
  staffAccounts: 0,
  monthlyAiReplies: 0,
  monthlyMessages: 0,
};

/**
 * PlanLimitsContextを安全に使用するためのフック
 * コンテキストが利用できない場合でも、デフォルト値でアプリケーションを継続可能にする
 */
export const usePlanLimitsSafe = () => {
  // コンテキストの取得を試みる
  let contextValue;
  try {
    contextValue = usePlanLimits();
  } catch (error) {
    console.warn('usePlanLimitsSafe: Failed to get context, using defaults', error);
    contextValue = null;
  }

  // リトライカウンターとタイマー
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryDelayRef = useRef(1000); // 1秒から開始

  // コンテキストの再取得を試みる
  useEffect(() => {
    if (!contextValue && retryCountRef.current < maxRetries) {
      const timer = setTimeout(() => {
        retryCountRef.current += 1;
        retryDelayRef.current *= 2; // 指数バックオフ
        // 再レンダリングをトリガー
        window.dispatchEvent(new Event('planLimitsRetry'));
      }, retryDelayRef.current);

      return () => clearTimeout(timer);
    }
  }, [contextValue]);

  // フォールバック関数の定義
  const checkCustomerLimit = useCallback(async (): Promise<boolean> => {
    if (contextValue?.checkCustomerLimit) {
      try {
        return await contextValue.checkCustomerLimit();
      } catch (error) {
        console.error('checkCustomerLimit error:', error);
      }
    }
    // デフォルト動作: 常に許可
    return true;
  }, [contextValue]);

  const checkReservationLimit = useCallback(async (): Promise<boolean> => {
    if (contextValue?.checkReservationLimit) {
      try {
        return await contextValue.checkReservationLimit();
      } catch (error) {
        console.error('checkReservationLimit error:', error);
      }
    }
    return true;
  }, [contextValue]);

  const checkStaffLimit = useCallback(async (): Promise<boolean> => {
    if (contextValue?.checkStaffLimit) {
      try {
        return await contextValue.checkStaffLimit();
      } catch (error) {
        console.error('checkStaffLimit error:', error);
      }
    }
    return true;
  }, [contextValue]);

  const checkAiReplyLimit = useCallback(async (): Promise<boolean> => {
    if (contextValue?.checkAiReplyLimit) {
      try {
        return await contextValue.checkAiReplyLimit();
      } catch (error) {
        console.error('checkAiReplyLimit error:', error);
      }
    }
    return true;
  }, [contextValue]);

  const checkMessageLimit = useCallback(async (): Promise<boolean> => {
    if (contextValue?.checkMessageLimit) {
      try {
        return await contextValue.checkMessageLimit();
      } catch (error) {
        console.error('checkMessageLimit error:', error);
      }
    }
    return true;
  }, [contextValue]);

  const showUpgradeModal = useCallback((limitType: string) => {
    if (contextValue?.showUpgradeModal) {
      try {
        contextValue.showUpgradeModal(limitType);
      } catch (error) {
        console.error('showUpgradeModal error:', error);
      }
    } else {
      // フォールバック: コンソールに警告を表示
      console.warn(`Upgrade required for: ${limitType}`);
    }
  }, [contextValue]);

  const getUsagePercentage = useCallback((type: keyof typeof defaultUsage): number => {
    if (contextValue?.getUsagePercentage) {
      try {
        return contextValue.getUsagePercentage(type);
      } catch (error) {
        console.error('getUsagePercentage error:', error);
      }
    }
    return 0;
  }, [contextValue]);

  const refreshUsage = useCallback(async () => {
    if (contextValue?.refreshUsage) {
      try {
        await contextValue.refreshUsage();
      } catch (error) {
        console.error('refreshUsage error:', error);
      }
    }
  }, [contextValue]);

  const incrementUsage = useCallback(async (type: keyof typeof defaultUsage, amount?: number) => {
    if (contextValue?.incrementUsage) {
      try {
        await contextValue.incrementUsage(type, amount);
      } catch (error) {
        console.error('incrementUsage error:', error);
      }
    }
  }, [contextValue]);

  // 返却値の構築
  return {
    limits: contextValue?.limits || defaultLimits,
    usage: contextValue?.usage || defaultUsage,
    checkCustomerLimit,
    checkReservationLimit,
    checkStaffLimit,
    checkAiReplyLimit,
    checkMessageLimit,
    showUpgradeModal,
    getUsagePercentage,
    refreshUsage,
    incrementUsage,
    isLoading: contextValue?.isLoading || false,
  };
};

// グローバルアクセス用のユーティリティ関数
export const getSafePlanLimits = () => {
  try {
    // React外から呼ばれた場合のフォールバック
    const event = new CustomEvent('getPlanLimits');
    window.dispatchEvent(event);
    
    // イベントリスナーが設定されていない場合のデフォルト
    return {
      limits: defaultLimits,
      usage: defaultUsage,
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
  } catch (error) {
    console.error('getSafePlanLimits error:', error);
    return null;
  }
};