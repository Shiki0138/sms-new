import { useContext } from 'react';
import { PlanLimitsContext } from '../contexts/PlanLimitsContext';

/**
 * プラン制限管理用のセーフフック
 * PlanLimitsProviderの外でも安全に使用できる
 */
export function usePlanLimitsSafe() {
  try {
    const context = useContext(PlanLimitsContext);
    if (!context) {
      // コンテキストが無い場合はデフォルト値を返す
      return {
        limits: {
          customers: 100,
          monthlyReservations: 50,
          staffAccounts: 1,
          dataRetentionMonths: 12,
          monthlyAiReplies: 200,
          monthlyMessages: 200,
        },
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
    }
    return context;
  } catch (error) {
    // フックがコンポーネント外で呼ばれた場合
    console.warn('usePlanLimitsSafe called outside of component:', error);
    return null;
  }
}