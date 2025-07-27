import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface CreateCustomerData {
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
}

export const useCreateCustomer = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async (data: CreateCustomerData) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return {
          id: Date.now().toString(),
          tenant_id: tenant?.id || '',
          ...data,
          visit_count: 0,
          last_visit_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // 本番環境ではSupabaseに保存
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenant.id,
          name: data.name,
          phone_number: data.phone_number,
          email: data.email || null,
          notes: data.notes || null,
          visit_count: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return customer;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};