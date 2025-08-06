import type { PlanType, PlanLimits } from '../types/auth';
import { supabase } from './supabase';

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  light: {
    customers: 10000,
    monthlyReservations: 5000,
    staffAccounts: 100,
    dataRetentionMonths: 120,
  },
  standard: {
    customers: 10000,
    monthlyReservations: 5000,
    staffAccounts: 100,
    dataRetentionMonths: 120,
  },
  premium: {
    customers: Infinity,
    monthlyReservations: Infinity,
    staffAccounts: Infinity,
    dataRetentionMonths: Infinity,
  },
};

export const checkPlanLimits = async (
  tenantId: string,
  action: keyof PlanLimits
): Promise<{ allowed: boolean; current: number; limit: number }> => {
  // テナントのプラン情報を取得
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single();

  if (tenantError) throw new Error(tenantError.message);

  const limits = PLAN_LIMITS[tenant.plan as PlanType];
  const limit = limits[action];

  // 現在の使用状況を取得
  let current = 0;

  switch (action) {
    case 'customers': {
      const { count: customerCount, error: customerError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (customerError) throw new Error(customerError.message);
      current = customerCount || 0;
      break;
    }

    case 'monthlyReservations': {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const nextMonth =
        new Date(new Date(currentMonth).getTime() + 32 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 7) + '-01';

      const { count: reservationCount, error: reservationError } =
        await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('start_time', currentMonth)
          .lt('start_time', nextMonth);

      if (reservationError) throw new Error(reservationError.message);
      current = reservationCount || 0;
      break;
    }

    case 'staffAccounts': {
      const { count: staffCount, error: staffError } = await supabase
        .from('user_tenant_mapping')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (staffError) throw new Error(staffError.message);
      current = staffCount || 0;
      break;
    }

    default:
      current = 0;
  }

  return {
    allowed: current < limit,
    current,
    limit: limit === Infinity ? -1 : limit,
  };
};

export const getPlanDisplayName = (plan: PlanType): string => {
  const names = {
    light: 'ライトプラン',
    standard: 'スタンダードプラン',
    premium: 'プレミアムプラン',
  };
  return names[plan];
};

export const getPlanFeatures = (plan: PlanType): string[] => {
  const features = {
    light: [
      '顧客登録 100件まで',
      '月間予約 50件まで',
      'スタッフアカウント 1名',
      'データ保存期間 3ヶ月',
      '基本機能のみ',
    ],
    standard: [
      '顧客登録 1,000件まで',
      '月間予約 500件まで',
      'スタッフアカウント 5名',
      'データ保存期間 1年',
      '詳細分析機能',
      '外部連携機能',
    ],
    premium: [
      '顧客登録 無制限',
      '月間予約 無制限',
      'スタッフアカウント 無制限',
      'データ保存期間 無制限',
      'AI分析機能',
      'フルカスタマイズ',
      '優先サポート',
    ],
  };
  return features[plan];
};
