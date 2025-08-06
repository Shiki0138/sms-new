import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CreateReservationInput {
  customer_id?: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  menu_content: string;
  price: number;
  staff_name?: string;
  notes?: string;
}

export const useReservations = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // 予約一覧取得
  const reservationsQuery = useQuery({
    queryKey: ['reservations', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) {
        // デモデータを返す
        return [
          {
            id: '1',
            customer_name: '山田花子',
            menu_content: 'カット & カラー',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            price: 8500,
            staff_name: '田中美容師',
            status: 'confirmed',
          },
          {
            id: '2',
            customer_name: '佐藤太郎',
            menu_content: 'メンズカット',
            start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            price: 4500,
            staff_name: '鈴木美容師',
            status: 'confirmed',
          },
        ];
      }

      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  // 予約作成
  const createReservation = useMutation({
    mutationFn: async (reservationData: CreateReservationInput) => {
      if (!tenant?.id) {
        // デモモードでも作成できるように
        const newReservation = {
          id: Date.now().toString(),
          tenant_id: 'demo',
          ...reservationData,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return newReservation;
      }

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          ...reservationData,
          tenant_id: tenant.id,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenant?.id] });
      toast.success('予約を登録しました');
    },
    onError: (error) => {
      toast.error('予約登録に失敗しました');
      console.error('Reservation creation error:', error);
    },
  });

  // 予約更新
  const updateReservation = useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: { id: string } & Partial<CreateReservationInput>) => {
      if (!tenant?.id) throw new Error('テナントが見つかりません');

      const { data, error } = await supabase
        .from('reservations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenant?.id] });
      toast.success('予約を更新しました');
    },
    onError: (error) => {
      toast.error('予約更新に失敗しました');
      console.error('Reservation update error:', error);
    },
  });

  // 予約削除
  const deleteReservation = useMutation({
    mutationFn: async (reservationId: string) => {
      if (!tenant?.id) throw new Error('テナントが見つかりません');

      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', tenant?.id] });
      toast.success('予約を削除しました');
    },
    onError: (error) => {
      toast.error('予約削除に失敗しました');
      console.error('Reservation deletion error:', error);
    },
  });

  return {
    reservationsQuery,
    createReservation,
    updateReservation,
    deleteReservation,
  };
};
