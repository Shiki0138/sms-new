import { supabase } from '../lib/supabase';

// ライトプランの制限値
export const LIGHT_PLAN_LIMITS = {
  customers: 100,
  monthlyReservations: 50,
  dailyEmails: 50,
  apiCalls: 1000, // 月間API呼び出し制限
  storageGB: 1, // ストレージ制限（GB）
  supportTickets: 3, // 月間サポートチケット
} as const;

export interface PlanUsage {
  customers: {
    current: number;
    limit: number;
    percentage: number;
  };
  monthlyReservations: {
    current: number;
    limit: number;
    percentage: number;
  };
  dailyEmails: {
    current: number;
    limit: number;
    percentage: number;
  };
  apiCalls: {
    current: number;
    limit: number;
    percentage: number;
  };
  storage: {
    currentGB: number;
    limitGB: number;
    percentage: number;
  };
}

export class PlanLimitsService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 現在の使用状況を取得
   */
  async getCurrentUsage(): Promise<PlanUsage> {
    try {
      const [
        customerCount,
        monthlyReservationCount,
        dailyEmailCount,
        monthlyApiCalls,
        storageUsage
      ] = await Promise.all([
        this.getCustomerCount(),
        this.getMonthlyReservationCount(),
        this.getDailyEmailCount(),
        this.getMonthlyApiCalls(),
        this.getStorageUsage()
      ]);

      return {
        customers: {
          current: customerCount,
          limit: LIGHT_PLAN_LIMITS.customers,
          percentage: Math.round((customerCount / LIGHT_PLAN_LIMITS.customers) * 100),
        },
        monthlyReservations: {
          current: monthlyReservationCount,
          limit: LIGHT_PLAN_LIMITS.monthlyReservations,
          percentage: Math.round((monthlyReservationCount / LIGHT_PLAN_LIMITS.monthlyReservations) * 100),
        },
        dailyEmails: {
          current: dailyEmailCount,
          limit: LIGHT_PLAN_LIMITS.dailyEmails,
          percentage: Math.round((dailyEmailCount / LIGHT_PLAN_LIMITS.dailyEmails) * 100),
        },
        apiCalls: {
          current: monthlyApiCalls,
          limit: LIGHT_PLAN_LIMITS.apiCalls,
          percentage: Math.round((monthlyApiCalls / LIGHT_PLAN_LIMITS.apiCalls) * 100),
        },
        storage: {
          currentGB: storageUsage,
          limitGB: LIGHT_PLAN_LIMITS.storageGB,
          percentage: Math.round((storageUsage / LIGHT_PLAN_LIMITS.storageGB) * 100),
        },
      };
    } catch (error) {
      console.error('Error getting plan usage:', error);
      throw error;
    }
  }

  /**
   * 顧客追加前のチェック
   */
  async canAddCustomer(): Promise<{ allowed: boolean; message?: string }> {
    try {
      const customerCount = await this.getCustomerCount();
      
      if (customerCount >= LIGHT_PLAN_LIMITS.customers) {
        return {
          allowed: false,
          message: `ライトプランでは顧客登録数が${LIGHT_PLAN_LIMITS.customers}名までに制限されています。現在${customerCount}名が登録済みです。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking customer limit:', error);
      return {
        allowed: false,
        message: 'エラーが発生しました。しばらく待ってからお試しください。',
      };
    }
  }

  /**
   * 予約追加前のチェック
   */
  async canAddReservation(): Promise<{ allowed: boolean; message?: string }> {
    try {
      const monthlyReservationCount = await this.getMonthlyReservationCount();
      
      if (monthlyReservationCount >= LIGHT_PLAN_LIMITS.monthlyReservations) {
        return {
          allowed: false,
          message: `ライトプランでは月間予約数が${LIGHT_PLAN_LIMITS.monthlyReservations}件までに制限されています。今月は既に${monthlyReservationCount}件の予約があります。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking reservation limit:', error);
      return {
        allowed: false,
        message: 'エラーが発生しました。しばらく待ってからお試しください。',
      };
    }
  }

  /**
   * メール送信前のチェック
   */
  async canSendEmail(): Promise<{ allowed: boolean; message?: string }> {
    try {
      const dailyEmailCount = await this.getDailyEmailCount();
      
      if (dailyEmailCount >= LIGHT_PLAN_LIMITS.dailyEmails) {
        return {
          allowed: false,
          message: `ライトプランでは1日のメール送信数が${LIGHT_PLAN_LIMITS.dailyEmails}通までに制限されています。本日は既に${dailyEmailCount}通送信済みです。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking email limit:', error);
      return {
        allowed: false,
        message: 'エラーが発生しました。しばらく待ってからお試しください。',
      };
    }
  }

  /**
   * API呼び出し制限チェック
   */
  async canMakeApiCall(): Promise<{ allowed: boolean; message?: string }> {
    try {
      const monthlyApiCalls = await this.getMonthlyApiCalls();
      
      if (monthlyApiCalls >= LIGHT_PLAN_LIMITS.apiCalls) {
        return {
          allowed: false,
          message: `ライトプランでは月間API呼び出し数が${LIGHT_PLAN_LIMITS.apiCalls}回までに制限されています。今月は既に${monthlyApiCalls}回呼び出し済みです。`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking API limit:', error);
      return {
        allowed: false,
        message: 'エラーが発生しました。しばらく待ってからお試しください。',
      };
    }
  }

  /**
   * 使用量の記録（API呼び出し）
   */
  async recordApiCall(apiType: 'line' | 'instagram' | 'email' | 'google_calendar'): Promise<void> {
    try {
      await supabase
        .from('api_usage_logs')
        .insert({
          tenant_id: this.tenantId,
          api_type: apiType,
          called_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error recording API call:', error);
      // ログ記録エラーはサイレントに処理
    }
  }

  /**
   * 使用量の記録（メール送信）
   */
  async recordEmailSent(emailType: 'manual' | 'reminder' | 'confirmation' | 'auto_reply'): Promise<void> {
    try {
      await supabase
        .from('email_usage_logs')
        .insert({
          tenant_id: this.tenantId,
          email_type: emailType,
          sent_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error recording email sent:', error);
      // ログ記録エラーはサイレントに処理
    }
  }

  /**
   * 制限警告の取得
   */
  async getWarnings(): Promise<Array<{
    type: 'customers' | 'reservations' | 'emails' | 'api' | 'storage';
    level: 'info' | 'warning' | 'danger';
    message: string;
    percentage: number;
  }>> {
    const usage = await this.getCurrentUsage();
    const warnings = [];

    // 80%以上で警告、95%以上で危険
    Object.entries(usage).forEach(([key, value]) => {
      if (value.percentage >= 95) {
        warnings.push({
          type: key as any,
          level: 'danger' as const,
          message: this.getWarningMessage(key, value.percentage, 'danger'),
          percentage: value.percentage,
        });
      } else if (value.percentage >= 80) {
        warnings.push({
          type: key as any,
          level: 'warning' as const,
          message: this.getWarningMessage(key, value.percentage, 'warning'),
          percentage: value.percentage,
        });
      }
    });

    return warnings;
  }

  // プライベートメソッド

  private async getCustomerCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting customer count:', error);
      return 0;
    }
  }

  private async getMonthlyReservationCount(): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting monthly reservation count:', error);
      return 0;
    }
  }

  private async getDailyEmailCount(): Promise<number> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('email_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .gte('sent_at', startOfDay.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting daily email count:', error);
      return 0;
    }
  }

  private async getMonthlyApiCalls(): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .gte('called_at', startOfMonth.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting monthly API calls:', error);
      return 0;
    }
  }

  private async getStorageUsage(): Promise<number> {
    // 簡単な実装：ライトプランでは大きなファイルアップロードは想定しないため、常に制限以下とする
    return 0.1; // 0.1GB使用中として返す
  }

  private getWarningMessage(type: string, percentage: number, level: 'warning' | 'danger'): string {
    const levelText = level === 'danger' ? '上限に近づいています' : '使用量が多くなっています';
    
    switch (type) {
      case 'customers':
        return `顧客登録数が${levelText}（${percentage}%）。ライトプランの上限は${LIGHT_PLAN_LIMITS.customers}名です。`;
      case 'monthlyReservations':
        return `今月の予約数が${levelText}（${percentage}%）。ライトプランの上限は${LIGHT_PLAN_LIMITS.monthlyReservations}件/月です。`;
      case 'dailyEmails':
        return `本日のメール送信数が${levelText}（${percentage}%）。ライトプランの上限は${LIGHT_PLAN_LIMITS.dailyEmails}通/日です。`;
      case 'apiCalls':
        return `今月のAPI呼び出し数が${levelText}（${percentage}%）。ライトプランの上限は${LIGHT_PLAN_LIMITS.apiCalls}回/月です。`;
      case 'storage':
        return `ストレージ使用量が${levelText}（${percentage}%）。ライトプランの上限は${LIGHT_PLAN_LIMITS.storageGB}GBです。`;
      default:
        return `使用量が${levelText}（${percentage}%）。`;
    }
  }
}

/**
 * React Hook for plan limits
 */
export function usePlanLimits(tenantId: string) {
  const planLimitsService = new PlanLimitsService(tenantId);

  return {
    getCurrentUsage: () => planLimitsService.getCurrentUsage(),
    canAddCustomer: () => planLimitsService.canAddCustomer(),
    canAddReservation: () => planLimitsService.canAddReservation(),
    canSendEmail: () => planLimitsService.canSendEmail(),
    canMakeApiCall: () => planLimitsService.canMakeApiCall(),
    getWarnings: () => planLimitsService.getWarnings(),
    recordApiCall: (apiType: Parameters<typeof planLimitsService.recordApiCall>[0]) => 
      planLimitsService.recordApiCall(apiType),
    recordEmailSent: (emailType: Parameters<typeof planLimitsService.recordEmailSent>[0]) => 
      planLimitsService.recordEmailSent(emailType),
  };
}