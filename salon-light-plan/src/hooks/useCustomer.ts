import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Customer } from '../types/customer';
import { useAuth } from './useAuth';

export const useCustomer = (customerId: string) => {
  const { tenant } = useAuth();
  const isDev = import.meta.env.DEV;

  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      // 開発環境の場合はモックデータから取得
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

        const customer = mockCustomers.find(c => c.id === customerId);
        if (!customer) {
          throw new Error('顧客が見つかりません');
        }
        return customer;
      }

      // 本番環境ではSupabaseから取得
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('tenant_id', tenant.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Customer;
    },
    enabled: !!customerId && (!!tenant?.id || isDev),
  });
};