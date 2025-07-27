import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TreatmentRecord } from '../types/treatment';
import { useAuth } from './useAuth';

export const useTreatmentRecords = (customerId?: string) => {
  const { tenant } = useAuth();
  const isDev = import.meta.env.DEV;

  return useQuery({
    queryKey: ['treatment-records', tenant?.id, customerId],
    queryFn: async () => {
      // 開発環境の場合はモックデータを返す
      if (isDev) {
        const mockTreatmentRecords: TreatmentRecord[] = [
          {
            id: '1',
            tenant_id: tenant?.id || '',
            customer_id: customerId || '1',
            date: '2024-01-15',
            menu_name: 'カット＆カラー',
            price: 8000,
            duration_minutes: 120,
            notes: '前回と同じスタイルで',
            staff_notes: '髪質が細いため、優しく施術',
            before_image: undefined,
            after_image: undefined,
            created_at: '2024-01-15T10:00:00',
            updated_at: '2024-01-15T12:00:00',
          },
          {
            id: '2',
            tenant_id: tenant?.id || '',
            customer_id: customerId || '1',
            date: '2023-12-20',
            menu_name: 'カット',
            price: 4500,
            duration_minutes: 60,
            notes: '少し短めに',
            staff_notes: '満足していただけました',
            before_image: undefined,
            after_image: undefined,
            created_at: '2023-12-20T14:00:00',
            updated_at: '2023-12-20T15:00:00',
          },
          {
            id: '3',
            tenant_id: tenant?.id || '',
            customer_id: customerId || '1',
            date: '2023-11-10',
            menu_name: 'パーマ',
            price: 7500,
            duration_minutes: 150,
            notes: 'ゆるいパーマを希望',
            staff_notes: '次回はもう少し強めでも良いかも',
            before_image: undefined,
            after_image: undefined,
            created_at: '2023-11-10T13:00:00',
            updated_at: '2023-11-10T15:30:00',
          },
        ];

        if (customerId) {
          return mockTreatmentRecords.filter(record => record.customer_id === customerId);
        }
        return mockTreatmentRecords;
      }

      // 本番環境ではSupabaseから取得
      if (!tenant?.id) return [];

      let query = supabase
        .from('treatment_records')
        .select(`
          *,
          customer:customers(id, name)
        `)
        .eq('tenant_id', tenant.id)
        .order('date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as TreatmentRecord[];
    },
    enabled: !!tenant?.id || isDev,
  });
};