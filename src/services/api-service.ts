import { supabase } from '../lib/supabase';

export class ApiService {
  /**
   * プラン使用状況を更新
   */
  static async updatePlanUsage(
    tenantId: string, 
    usageType: 'customers' | 'reservations' | 'messages' | 'ai_replies',
    increment: number
  ): Promise<void> {
    try {
      // Edge Functionを呼び出す（本番環境）
      if (import.meta.env.PROD) {
        const { data, error } = await supabase.functions.invoke('update-plan-usage', {
          body: {
            tenant_id: tenantId,
            usage_type: usageType,
            increment
          }
        });

        if (error) throw error;
      } else {
        // 開発環境では直接更新
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
        
        // 現在の使用状況を取得
        const { data: currentUsage, error: fetchError } = await supabase
          .from('plan_usage')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('month', currentMonth)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const usage = currentUsage || {
          tenant_id: tenantId,
          month: currentMonth,
          customers_count: 0,
          reservations_count: 0,
          messages_sent: 0,
          ai_replies_count: 0,
        };

        // 使用量を更新
        switch (usageType) {
          case 'customers':
            usage.customers_count = Math.max(0, usage.customers_count + increment);
            break;
          case 'reservations':
            usage.reservations_count = Math.max(0, usage.reservations_count + increment);
            break;
          case 'messages':
            usage.messages_sent = Math.max(0, usage.messages_sent + increment);
            break;
          case 'ai_replies':
            usage.ai_replies_count = Math.max(0, usage.ai_replies_count + increment);
            break;
        }

        // データベースに保存
        if (currentUsage) {
          const { error } = await supabase
            .from('plan_usage')
            .update(usage)
            .eq('id', currentUsage.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('plan_usage')
            .insert(usage);
          
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error updating plan usage:', error);
      throw error;
    }
  }

  /**
   * 現在月のプラン使用状況を取得
   */
  static async getCurrentPlanUsage(tenantId: string) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      const { data, error } = await supabase
        .from('plan_usage')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('month', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || {
        customers_count: 0,
        reservations_count: 0,
        messages_sent: 0,
        ai_replies_count: 0,
      };
    } catch (error) {
      console.error('Error fetching plan usage:', error);
      throw error;
    }
  }

  /**
   * 顧客数を取得（実際のデータから）
   */
  static async getCustomerCount(tenantId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching customer count:', error);
      return 0;
    }
  }

  /**
   * スタッフ数を取得
   */
  static async getStaffCount(tenantId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching staff count:', error);
      return 0;
    }
  }
}