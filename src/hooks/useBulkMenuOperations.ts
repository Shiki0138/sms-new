import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from './useAuth';

interface BulkOperation {
  type: 'activate' | 'deactivate' | 'delete' | 'updateCategory' | 'updatePrice';
  menuIds: string[];
  data?: any;
}

export const useBulkMenuOperations = () => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  return useMutation({
    mutationFn: async ({ type, menuIds, data }: BulkOperation) => {
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      switch (type) {
        case 'activate':
          const { error: activateError } = await supabase
            .from('treatment_menus')
            .update({ is_active: true })
            .in('id', menuIds)
            .eq('tenant_id', tenant.id);
          
          if (activateError) throw activateError;
          break;

        case 'deactivate':
          const { error: deactivateError } = await supabase
            .from('treatment_menus')
            .update({ is_active: false })
            .in('id', menuIds)
            .eq('tenant_id', tenant.id);
          
          if (deactivateError) throw deactivateError;
          break;

        case 'delete':
          const { error: deleteError } = await supabase
            .from('treatment_menus')
            .delete()
            .in('id', menuIds)
            .eq('tenant_id', tenant.id);
          
          if (deleteError) throw deleteError;
          break;

        case 'updateCategory':
          if (!data?.category) throw new Error('カテゴリーが指定されていません');
          
          const { error: categoryError } = await supabase
            .from('treatment_menus')
            .update({ category: data.category })
            .in('id', menuIds)
            .eq('tenant_id', tenant.id);
          
          if (categoryError) throw categoryError;
          break;

        case 'updatePrice':
          if (!data?.adjustment) throw new Error('価格調整が指定されていません');
          
          // Get current prices
          const { data: menus, error: fetchError } = await supabase
            .from('treatment_menus')
            .select('id, price')
            .in('id', menuIds)
            .eq('tenant_id', tenant.id);
          
          if (fetchError) throw fetchError;
          
          // Calculate new prices
          const updates = menus.map(menu => {
            let newPrice = menu.price;
            if (data.adjustment.type === 'percentage') {
              newPrice = Math.round(menu.price * (1 + data.adjustment.value / 100));
            } else {
              newPrice = menu.price + data.adjustment.value;
            }
            return {
              id: menu.id,
              price: Math.max(0, newPrice), // Ensure price doesn't go negative
            };
          });
          
          // Update prices
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('treatment_menus')
              .update({ price: update.price })
              .eq('id', update.id)
              .eq('tenant_id', tenant.id);
            
            if (updateError) throw updateError;
          }
          break;

        default:
          throw new Error('不明な操作タイプです');
      }

      return { type, count: menuIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-menus'] });
      
      switch (data.type) {
        case 'activate':
          toast.success(`${data.count}件のメニューを有効化しました`);
          break;
        case 'deactivate':
          toast.success(`${data.count}件のメニューを無効化しました`);
          break;
        case 'delete':
          toast.success(`${data.count}件のメニューを削除しました`);
          break;
        case 'updateCategory':
          toast.success(`${data.count}件のメニューのカテゴリーを変更しました`);
          break;
        case 'updatePrice':
          toast.success(`${data.count}件のメニューの価格を更新しました`);
          break;
      }
    },
    onError: (error) => {
      console.error('Bulk operation error:', error);
      toast.error('一括操作に失敗しました');
    },
  });
};