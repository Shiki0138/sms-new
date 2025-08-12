import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Reservation } from '../types/reservation';
import { useAuth } from './useAuth';

export const useReservations = (startDate?: string, endDate?: string) => {
  const { tenant } = useAuth();
  const isDev = import.meta.env.DEV;

  return useQuery({
    queryKey: ['reservations', tenant?.id, startDate, endDate],
    queryFn: async () => {
      // 開発環境の場合はモックデータを返す
      if (isDev) {
        const mockReservations: Reservation[] = [
          {
            id: '1',
            tenant_id: tenant?.id || '',
            customer_id: '1',
            start_time: '2024-01-22T10:00:00',
            end_time: '2024-01-22T11:00:00',
            menu_content: 'カット＆カラー',
            status: 'CONFIRMED',
            price: 8000,
            notes: '',
            created_at: '2024-01-20T10:00:00',
            updated_at: '2024-01-20T10:00:00',
            customer: {
              name: '山田花子',
              phone_number: '090-1234-5678',
            },
          },
          {
            id: '2',
            tenant_id: tenant?.id || '',
            customer_id: '2',
            start_time: '2024-01-22T14:00:00',
            end_time: '2024-01-22T15:30:00',
            menu_content: 'パーマ',
            status: 'CONFIRMED',
            price: 7500,
            notes: '前回と同じスタイルで',
            created_at: '2024-01-19T15:00:00',
            updated_at: '2024-01-19T15:00:00',
            customer: {
              name: '佐藤太郎',
              phone_number: '080-9876-5432',
            },
          },
          {
            id: '3',
            tenant_id: tenant?.id || '',
            customer_id: '3',
            start_time: '2024-01-23T11:00:00',
            end_time: '2024-01-23T12:00:00',
            menu_content: 'カット',
            status: 'CONFIRMED',
            price: 4500,
            notes: '',
            created_at: '2024-01-21T09:00:00',
            updated_at: '2024-01-21T09:00:00',
            customer: {
              name: '鈴木美咲',
              phone_number: '070-5555-1234',
            },
          },
        ];

        // 日付フィルタリング
        if (startDate && endDate) {
          return mockReservations.filter(reservation => {
            const reservationDate = reservation.start_time.split('T')[0];
            return reservationDate >= startDate && reservationDate <= endDate;
          });
        }
        return mockReservations;
      }

      // 本番環境ではSupabaseから取得
      if (!tenant?.id) return [];

      let query = supabase
        .from('reservations')
        .select(`
          *,
          customer:customers(name, phone_number)
        `)
        .eq('tenant_id', tenant.id)
        .order('start_time');

      if (startDate && endDate) {
        query = query
          .gte('start_time', `${startDate}T00:00:00`)
          .lte('start_time', `${endDate}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as Reservation[];
    },
    enabled: !!tenant?.id || isDev,
  });
};