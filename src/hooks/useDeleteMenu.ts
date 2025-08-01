import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from './useAuth';

export const useDeleteMenu = () => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  return useMutation({
    mutationFn: async (menuId: string) => {
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { error } = await supabase
        .from('treatment_menus')
        .update({ is_active: false })
        .eq('id', menuId)
        .eq('tenant_id', tenant.id);

      if (error) {
        throw error;
      }

      return menuId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-menus'] });
      toast.success('メニューを削除しました');
    },
    onError: (error) => {
      console.error('Menu deletion error:', error);
      toast.error('メニューの削除に失敗しました');
    },
  });
};