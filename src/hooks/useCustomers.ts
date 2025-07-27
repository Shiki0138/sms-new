import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Customer } from '../types/customer';
import { useAuth } from './useAuth';

export const useCustomers = (searchTerm: string = '') => {
  const { tenant } = useAuth();
  const isDev = import.meta.env.DEV;

  return useQuery({
    queryKey: ['customers', tenant?.id, searchTerm],
    queryFn: async () => {
      // 開発環境の場合はモックデータを返す
      if (isDev) {
        const mockCustomers: Customer[] = [
          {
            id: '1',
            tenant_id: tenant?.id || '',
            name: '山田花子',
            phone_number: '090-1234-5678',
            email: 'yamada@example.com',
            notes: '髪が細いため、優しい施術を希望',
            visit_count: 5,
            last_visit_date: '2024-01-15',
            created_at: '2024-01-01',
            updated_at: '2024-01-15',
          },
          {
            id: '2',
            tenant_id: tenant?.id || '',
            name: '佐藤太郎',
            phone_number: '080-9876-5432',
            email: 'sato@example.com',
            notes: '',
            visit_count: 3,
            last_visit_date: '2024-01-20',
            created_at: '2024-01-05',
            updated_at: '2024-01-20',
          },
          {
            id: '3',
            tenant_id: tenant?.id || '',
            name: '鈴木美咲',
            phone_number: '070-5555-1234',
            email: '',
            notes: 'カラーアレルギーあり',
            visit_count: 8,
            last_visit_date: '2024-01-22',
            created_at: '2023-12-15',
            updated_at: '2024-01-22',
          },
        ];

        if (searchTerm) {
          return mockCustomers.filter(customer =>
            customer.name.includes(searchTerm)
          );
        }
        return mockCustomers;
      }

      // 本番環境ではSupabaseから取得
      if (!tenant?.id) return [];

      let query = supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name');

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as Customer[];
    },
    enabled: !!tenant?.id || isDev,
  });
};