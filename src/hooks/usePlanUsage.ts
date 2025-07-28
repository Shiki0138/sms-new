import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { usePlanLimits } from '../contexts/PlanLimitsContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const usePlanUsage = () => {
  const { tenant } = useAuth();
  const { incrementUsage, refreshUsage } = usePlanLimits();

  const updateCustomerCount = useCallback(async (increment: boolean) => {
    if (!tenant?.id) return;

    try {
      // 顧客数の増減を記録
      await supabase.from('plan_usage_logs').insert({
        tenant_id: tenant.id,
        usage_type: 'customer_count_change',
        usage_count: increment ? 1 : -1,
        created_at: new Date().toISOString(),
      });

      // 使用状況を更新
      await refreshUsage();
    } catch (error) {
      console.error('Error updating customer count:', error);
      toast.error('顧客数の更新に失敗しました');
    }
  }, [tenant?.id, refreshUsage]);

  const updateReservationCount = useCallback(async (increment: boolean) => {
    if (!tenant?.id) return;

    try {
      // 予約数の増減を記録
      await supabase.from('plan_usage_logs').insert({
        tenant_id: tenant.id,
        usage_type: 'reservation_count_change',
        usage_count: increment ? 1 : -1,
        created_at: new Date().toISOString(),
      });

      // 使用状況を更新
      await refreshUsage();
    } catch (error) {
      console.error('Error updating reservation count:', error);
      toast.error('予約数の更新に失敗しました');
    }
  }, [tenant?.id, refreshUsage]);

  const updateStaffCount = useCallback(async (increment: boolean) => {
    if (!tenant?.id) return;

    try {
      // スタッフ数の増減を記録
      await supabase.from('plan_usage_logs').insert({
        tenant_id: tenant.id,
        usage_type: 'staff_count_change',
        usage_count: increment ? 1 : -1,
        created_at: new Date().toISOString(),
      });

      // 使用状況を更新
      await refreshUsage();
    } catch (error) {
      console.error('Error updating staff count:', error);
      toast.error('スタッフ数の更新に失敗しました');
    }
  }, [tenant?.id, refreshUsage]);

  const updateAiReplyCount = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      // AI返信使用を記録
      await incrementUsage('monthlyAiReplies', 1);
    } catch (error) {
      console.error('Error updating AI reply count:', error);
      toast.error('AI返信数の更新に失敗しました');
    }
  }, [tenant?.id, incrementUsage]);

  const updateMessageCount = useCallback(async (count: number = 1) => {
    if (!tenant?.id) return;

    try {
      // メッセージ送信数を記録
      await incrementUsage('monthlyMessages', count);
    } catch (error) {
      console.error('Error updating message count:', error);
      toast.error('メッセージ数の更新に失敗しました');
    }
  }, [tenant?.id, incrementUsage]);

  const getCurrentUsage = useCallback(async () => {
    if (!tenant?.id) return null;

    try {
      // 顧客数
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      // 今月の予約数
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: reservationCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('created_at', startOfMonth.toISOString());

      // スタッフ数
      const { count: staffCount } = await supabase
        .from('staffs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      // 今月のAI返信数
      const { data: aiReplyLogs } = await supabase
        .from('plan_usage_logs')
        .select('usage_count')
        .eq('tenant_id', tenant.id)
        .eq('usage_type', 'ai_reply')
        .gte('created_at', startOfMonth.toISOString());

      const aiReplyCount = aiReplyLogs?.reduce((sum, log) => sum + (log.usage_count || 0), 0) || 0;

      // 今月のメッセージ送信数
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('direction', 'sent')
        .gte('created_at', startOfMonth.toISOString());

      return {
        customers: customerCount || 0,
        monthlyReservations: reservationCount || 0,
        staffAccounts: staffCount || 0,
        monthlyAiReplies: aiReplyCount,
        monthlyMessages: messageCount || 0,
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return null;
    }
  }, [tenant?.id]);

  // 月初めの自動リセット機能
  const resetMonthlyUsage = useCallback(async () => {
    if (!tenant?.id) return;

    const now = new Date();
    const lastReset = localStorage.getItem(`last_usage_reset_${tenant.id}`);
    const lastResetDate = lastReset ? new Date(lastReset) : null;

    // 月が変わった場合のみリセット
    if (!lastResetDate || 
        lastResetDate.getMonth() !== now.getMonth() || 
        lastResetDate.getFullYear() !== now.getFullYear()) {
      
      try {
        // 月次使用状況をリセット
        await supabase.from('plan_usage_logs').insert({
          tenant_id: tenant.id,
          usage_type: 'monthly_reset',
          usage_count: 0,
          created_at: now.toISOString(),
          metadata: {
            reset_month: now.getMonth() + 1,
            reset_year: now.getFullYear(),
          },
        });

        // リセット日時を記録
        localStorage.setItem(`last_usage_reset_${tenant.id}`, now.toISOString());

        // 使用状況を更新
        await refreshUsage();

        toast.success('月次使用状況がリセットされました');
      } catch (error) {
        console.error('Error resetting monthly usage:', error);
      }
    }
  }, [tenant?.id, refreshUsage]);

  // 使用状況の監視と警告
  const checkUsageWarnings = useCallback(async () => {
    const usage = await getCurrentUsage();
    if (!usage) return;

    const warnings = [];

    // 顧客数警告（80%以上）
    if (usage.customers >= 80) {
      warnings.push({
        type: 'customers',
        message: `顧客登録数が上限に近づいています（${usage.customers}/100名）`,
      });
    }

    // 予約数警告（80%以上）
    if (usage.monthlyReservations >= 40) {
      warnings.push({
        type: 'reservations',
        message: `今月の予約数が上限に近づいています（${usage.monthlyReservations}/50件）`,
      });
    }

    // AI返信警告（80%以上）
    if (usage.monthlyAiReplies >= 160) {
      warnings.push({
        type: 'ai_replies',
        message: `AI返信回数が上限に近づいています（${usage.monthlyAiReplies}/200回）`,
      });
    }

    // メッセージ警告（80%以上）
    if (usage.monthlyMessages >= 160) {
      warnings.push({
        type: 'messages',
        message: `メッセージ送信数が上限に近づいています（${usage.monthlyMessages}/200通）`,
      });
    }

    return warnings;
  }, [getCurrentUsage]);

  return {
    updateCustomerCount,
    updateReservationCount,
    updateStaffCount,
    updateAiReplyCount,
    updateMessageCount,
    getCurrentUsage,
    resetMonthlyUsage,
    checkUsageWarnings,
  };
};