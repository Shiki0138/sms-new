import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface UpdateCustomerData {
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
}

export const useUpdateCustomer = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomerData }) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return {
          id,
          tenant_id: tenant?.id || '',
          ...data,
          updated_at: new Date().toISOString(),
        };
      }

      // 本番環境ではSupabaseで更新
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .update({
          name: data.name,
          phone_number: data.phone_number,
          email: data.email || null,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return customer;
    },
    onSuccess: (_, variables) => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
    },
  });
};