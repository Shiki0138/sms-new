import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { CreateReservationInput } from '../types/reservation';

export const useCreateReservation = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async (data: CreateReservationInput) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return {
          id: Date.now().toString(),
          tenant_id: tenant?.id || '',
          ...data,
          status: 'CONFIRMED' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // 本番環境ではSupabaseに保存
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data: reservation, error } = await supabase
        .from('reservations')
        .insert({
          tenant_id: tenant.id,
          ...data,
          status: 'CONFIRMED',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return reservation;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};