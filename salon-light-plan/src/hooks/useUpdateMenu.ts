import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { UpdateMenuInput } from '../types/treatment';

export const useUpdateMenu = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async (data: UpdateMenuInput) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return {
          ...data,
          updated_at: new Date().toISOString(),
        };
      }

      // 本番環境ではSupabaseで更新
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { id, ...updateData } = data;
      const { data: menu, error } = await supabase
        .from('treatment_menus')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return menu;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['treatment-menus'] });
    },
  });
};