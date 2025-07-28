import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { ApiService } from '../services/api-service';
import { toast } from 'sonner';

export const usePlanUsage = () => {
  const { tenant } = useAuth();

  const updateCustomerCount = useCallback(async (increment: boolean) => {
    if (!tenant?.id) return;

    try {
      await ApiService.updatePlanUsage(
        tenant.id,
        'customers',
        increment ? 1 : -1
      );
    } catch (error) {
      console.error('Failed to update customer count:', error);
      toast.error('顧客数の更新に失敗しました');
    }
  }, [tenant?.id]);

  const updateReservationCount = useCallback(async (increment: boolean) => {
    if (!tenant?.id) return;

    try {
      await ApiService.updatePlanUsage(
        tenant.id,
        'reservations',
        increment ? 1 : -1
      );
    } catch (error) {
      console.error('Failed to update reservation count:', error);
      toast.error('予約数の更新に失敗しました');
    }
  }, [tenant?.id]);

  const updateAIReplyCount = useCallback(async (increment: boolean = true) => {
    if (!tenant?.id) return;

    try {
      await ApiService.updatePlanUsage(
        tenant.id,
        'ai_replies',
        increment ? 1 : -1
      );
    } catch (error) {
      console.error('Failed to update AI reply count:', error);
      toast.error('AI返信数の更新に失敗しました');
    }
  }, [tenant?.id]);

  const updateMessageCount = useCallback(async (increment: boolean = true) => {
    if (!tenant?.id) return;

    try {
      await ApiService.updatePlanUsage(
        tenant.id,
        'messages',
        increment ? 1 : -1
      );
    } catch (error) {
      console.error('Failed to update message count:', error);
      toast.error('メッセージ数の更新に失敗しました');
    }
  }, [tenant?.id]);

  return {
    updateCustomerCount,
    updateReservationCount,
    updateAIReplyCount,
    updateMessageCount,
  };
};