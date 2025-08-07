import { useState, useEffect } from 'react';
import { PlanLimitService, PlanStatus } from '../services/plan-limit-service';

interface UsePlanLimitsReturn {
  planStatus: PlanStatus | null;
  loading: boolean;
  error: string | null;
  canAddCustomer: () => Promise<{ allowed: boolean; reason?: string }>;
  canAddReservation: () => Promise<{ allowed: boolean; reason?: string }>;
  canAddStaff: () => Promise<{ allowed: boolean; reason?: string }>;
  refreshStatus: () => Promise<void>;
  warnings: Array<{
    type: 'warning' | 'error';
    message: string;
    category: 'customers' | 'reservations' | 'staff';
  }>;
}

/**
 * プラン制限管理用カスタムフック
 */
export function usePlanLimits(tenantId: string): UsePlanLimitsReturn {
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<
    Array<{
      type: 'warning' | 'error';
      message: string;
      category: 'customers' | 'reservations' | 'staff';
    }>
  >([]);

  const service = new PlanLimitService(tenantId);

  const fetchPlanStatus = async () => {
    try {
      setError(null);
      setLoading(true);

      const [status, planWarnings] = await Promise.all([
        service.getPlanStatus(),
        service.getPlanWarnings(),
      ]);

      setPlanStatus(status);
      setWarnings(planWarnings);

      // 月間利用統計を更新
      await service.updateMonthlyUsage();
    } catch (err) {
      setError('プラン情報の取得に失敗しました');
      console.error('Error fetching plan status:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    await fetchPlanStatus();
  };

  const canAddCustomer = async (): Promise<{
    allowed: boolean;
    reason?: string;
  }> => {
    try {
      return await service.canAddCustomer();
    } catch (err) {
      console.error('Error checking customer limit:', err);
      return { allowed: false, reason: '制限チェックに失敗しました' };
    }
  };

  const canAddReservation = async (): Promise<{
    allowed: boolean;
    reason?: string;
  }> => {
    try {
      return await service.canAddReservation();
    } catch (err) {
      console.error('Error checking reservation limit:', err);
      return { allowed: false, reason: '制限チェックに失敗しました' };
    }
  };

  const canAddStaff = async (): Promise<{
    allowed: boolean;
    reason?: string;
  }> => {
    try {
      return await service.canAddStaff();
    } catch (err) {
      console.error('Error checking staff limit:', err);
      return { allowed: false, reason: '制限チェックに失敗しました' };
    }
  };

  useEffect(() => {
    fetchPlanStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // 定期的にプラン状況を更新（5分ごと）
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchPlanStatus();
      },
      5 * 60 * 1000
    ); // 5分

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return {
    planStatus,
    loading,
    error,
    canAddCustomer,
    canAddReservation,
    canAddStaff,
    refreshStatus,
    warnings,
  };
}
