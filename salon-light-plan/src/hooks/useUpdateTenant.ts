import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface UpdateTenantData {
  name?: string;
  phone_number?: string;
  email?: string;
  address?: string;
}

export const useUpdateTenant = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async (data: UpdateTenantData) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return {
          id: tenant?.id || 'dev-tenant',
          ...data,
          updated_at: new Date().toISOString(),
        };
      }

      // 本番環境ではSupabaseで更新
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data: updatedTenant, error } = await supabase
        .from('tenants')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return updatedTenant;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
  });
};