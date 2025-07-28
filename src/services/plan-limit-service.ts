import { supabase } from '../lib/supabase';

export interface PlanLimits {
  customerLimit: number;
  monthlyReservationLimit: number;
  staffLimit: number;
  planType: 'light' | 'standard' | 'premium';
}

export interface PlanUsage {
  tenantId: string;
  month: string; // YYYY-MM format
  customerCount: number;
  reservationCount: number;
  createdAt: string;
}

export interface PlanStatus {
  planType: 'light' | 'standard' | 'premium';
  limits: PlanLimits;
  currentUsage: {
    totalCustomers: number;
    monthlyReservations: number;
    activeStaff: number;
  };
  remainingQuota: {
    customers: number;
    reservations: number;
    staff: number;
  };
  isOverLimit: {
    customers: boolean;
    reservations: boolean;
    staff: boolean;
  };
}

/**
 * ライトプラン制限管理サービス
 */
export class PlanLimitService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * プランの制限値を取得
   */
  getPlanLimits(planType: 'light' | 'standard' | 'premium'): PlanLimits {
    const limitsMap: { [key: string]: PlanLimits } = {
      light: {
        customerLimit: 100,
        monthlyReservationLimit: 50,
        staffLimit: 3,
        planType: 'light',
      },
      standard: {
        customerLimit: 500,
        monthlyReservationLimit: 200,
        staffLimit: 10,
        planType: 'standard',
      },
      premium: {
        customerLimit: -1, // 無制限
        monthlyReservationLimit: -1, // 無制限
        staffLimit: -1, // 無制限
        planType: 'premium',
      },
    };

    return limitsMap[planType] || limitsMap.light;
  }

  /**
   * テナントのプランタイプを取得
   */
  async getTenantPlan(): Promise<'light' | 'standard' | 'premium'> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('plan')
        .eq('id', this.tenantId)
        .single();

      if (error) throw error;

      return data?.plan || 'light';
    } catch (error) {
      console.error('Error fetching tenant plan:', error);
      return 'light'; // デフォルトはライトプラン
    }
  }

  /**
   * 現在の利用状況を取得
   */
  async getCurrentUsage(): Promise<{
    totalCustomers: number;
    monthlyReservations: number;
    activeStaff: number;
  }> {
    try {
      // 総顧客数を取得
      const { count: customerCount, error: customerError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId);

      if (customerError) throw customerError;

      // 今月の予約数を取得
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { count: reservationCount, error: reservationError } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .gte('start_time', `${currentMonth}-01`)
        .lt('start_time', `${currentMonth}-32`);

      if (reservationError) throw reservationError;

      // アクティブスタッフ数を取得
      const { count: staffCount, error: staffError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true);

      if (staffError) throw staffError;

      return {
        totalCustomers: customerCount || 0,
        monthlyReservations: reservationCount || 0,
        activeStaff: staffCount || 0,
      };
    } catch (error) {
      console.error('Error fetching current usage:', error);
      return {
        totalCustomers: 0,
        monthlyReservations: 0,
        activeStaff: 0,
      };
    }
  }

  /**
   * プランステータス（制限と利用状況）を取得
   */
  async getPlanStatus(): Promise<PlanStatus> {
    try {
      const planType = await this.getTenantPlan();
      const limits = this.getPlanLimits(planType);
      const currentUsage = await this.getCurrentUsage();

      const remainingQuota = {
        customers: limits.customerLimit === -1 
          ? -1 
          : Math.max(0, limits.customerLimit - currentUsage.totalCustomers),
        reservations: limits.monthlyReservationLimit === -1 
          ? -1 
          : Math.max(0, limits.monthlyReservationLimit - currentUsage.monthlyReservations),
        staff: limits.staffLimit === -1 
          ? -1 
          : Math.max(0, limits.staffLimit - currentUsage.activeStaff),
      };

      const isOverLimit = {
        customers: limits.customerLimit !== -1 && currentUsage.totalCustomers >= limits.customerLimit,
        reservations: limits.monthlyReservationLimit !== -1 && currentUsage.monthlyReservations >= limits.monthlyReservationLimit,
        staff: limits.staffLimit !== -1 && currentUsage.activeStaff >= limits.staffLimit,
      };

      return {
        planType,
        limits,
        currentUsage,
        remainingQuota,
        isOverLimit,
      };
    } catch (error) {
      console.error('Error getting plan status:', error);
      
      // エラー時はライトプランのデフォルト値を返す
      const limits = this.getPlanLimits('light');
      return {
        planType: 'light',
        limits,
        currentUsage: { totalCustomers: 0, monthlyReservations: 0, activeStaff: 0 },
        remainingQuota: { customers: limits.customerLimit, reservations: limits.monthlyReservationLimit, staff: limits.staffLimit },
        isOverLimit: { customers: false, reservations: false, staff: false },
      };
    }
  }

  /**
   * 顧客追加が可能かチェック
   */
  async canAddCustomer(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const status = await this.getPlanStatus();
      
      if (status.isOverLimit.customers) {
        return {
          allowed: false,
          reason: `${status.limits.planType}プランでは顧客登録は${status.limits.customerLimit}名までです。現在${status.currentUsage.totalCustomers}名が登録されています。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking customer limit:', error);
      return { allowed: false, reason: '制限チェックに失敗しました。' };
    }
  }

  /**
   * 予約追加が可能かチェック
   */
  async canAddReservation(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const status = await this.getPlanStatus();
      
      if (status.isOverLimit.reservations) {
        return {
          allowed: false,
          reason: `${status.limits.planType}プランでは月間予約数は${status.limits.monthlyReservationLimit}件までです。今月は${status.currentUsage.monthlyReservations}件の予約があります。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking reservation limit:', error);
      return { allowed: false, reason: '制限チェックに失敗しました。' };
    }
  }

  /**
   * スタッフ追加が可能かチェック
   */
  async canAddStaff(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const status = await this.getPlanStatus();
      
      if (status.isOverLimit.staff) {
        return {
          allowed: false,
          reason: `${status.limits.planType}プランではスタッフ登録は${status.limits.staffLimit}名までです。現在${status.currentUsage.activeStaff}名が登録されています。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking staff limit:', error);
      return { allowed: false, reason: '制限チェックに失敗しました。' };
    }
  }

  /**
   * 月間利用統計を更新
   */
  async updateMonthlyUsage(): Promise<boolean> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usage = await this.getCurrentUsage();

      const { error } = await supabase
        .from('plan_usage')
        .upsert({
          tenant_id: this.tenantId,
          month: `${currentMonth}-01`, // DATE形式に変換
          customer_count: usage.totalCustomers,
          reservation_count: usage.monthlyReservations,
        }, {
          onConflict: 'tenant_id,month',
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating monthly usage:', error);
      return false;
    }
  }

  /**
   * 利用状況の履歴を取得
   */
  async getUsageHistory(months: number = 6): Promise<PlanUsage[]> {
    try {
      const { data, error } = await supabase
        .from('plan_usage')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('month', { ascending: false })
        .limit(months);

      if (error) throw error;

      return data?.map(item => ({
        tenantId: item.tenant_id,
        month: item.month.slice(0, 7), // YYYY-MM形式に変換
        customerCount: item.customer_count,
        reservationCount: item.reservation_count,
        createdAt: item.created_at,
      })) || [];
    } catch (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }
  }

  /**
   * プラン制限に関する警告を取得
   */
  async getPlanWarnings(): Promise<{
    type: 'warning' | 'error';
    message: string;
    category: 'customers' | 'reservations' | 'staff';
  }[]> {
    try {
      const status = await this.getPlanStatus();
      const warnings: any[] = [];

      // 顧客制限の警告
      if (status.limits.customerLimit !== -1) {
        const usage = status.currentUsage.totalCustomers / status.limits.customerLimit;
        if (usage >= 1) {
          warnings.push({
            type: 'error',
            message: `顧客数が上限に達しています（${status.currentUsage.totalCustomers}/${status.limits.customerLimit}名）`,
            category: 'customers',
          });
        } else if (usage >= 0.8) {
          warnings.push({
            type: 'warning',
            message: `顧客数が上限の80%に達しています（${status.currentUsage.totalCustomers}/${status.limits.customerLimit}名）`,
            category: 'customers',
          });
        }
      }

      // 予約制限の警告
      if (status.limits.monthlyReservationLimit !== -1) {
        const usage = status.currentUsage.monthlyReservations / status.limits.monthlyReservationLimit;
        if (usage >= 1) {
          warnings.push({
            type: 'error',
            message: `今月の予約数が上限に達しています（${status.currentUsage.monthlyReservations}/${status.limits.monthlyReservationLimit}件）`,
            category: 'reservations',
          });
        } else if (usage >= 0.8) {
          warnings.push({
            type: 'warning',
            message: `今月の予約数が上限の80%に達しています（${status.currentUsage.monthlyReservations}/${status.limits.monthlyReservationLimit}件）`,
            category: 'reservations',
          });
        }
      }

      // スタッフ制限の警告
      if (status.limits.staffLimit !== -1) {
        const usage = status.currentUsage.activeStaff / status.limits.staffLimit;
        if (usage >= 1) {
          warnings.push({
            type: 'error',
            message: `スタッフ数が上限に達しています（${status.currentUsage.activeStaff}/${status.limits.staffLimit}名）`,
            category: 'staff',
          });
        } else if (usage >= 0.8) {
          warnings.push({
            type: 'warning',
            message: `スタッフ数が上限の80%に達しています（${status.currentUsage.activeStaff}/${status.limits.staffLimit}名）`,
            category: 'staff',
          });
        }
      }

      return warnings;
    } catch (error) {
      console.error('Error getting plan warnings:', error);
      return [];
    }
  }
}