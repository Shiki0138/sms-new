import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useDeleteCustomer = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async (customerId: string) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return { success: true };
      }

      // 本番環境ではSupabaseから削除
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('tenant_id', tenant.id);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};