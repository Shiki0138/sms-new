import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useTenant = () => {
  const { tenant: authTenant } = useAuth();
  const isDev = import.meta.env.DEV;

  return useQuery({
    queryKey: ['tenant', authTenant?.id],
    queryFn: async () => {
      // 開発環境の場合はモックデータを返す
      if (isDev) {
        return {
          id: authTenant?.id || 'dev-tenant',
          name: '美容室サンプル',
          phone_number: '03-1234-5678',
          email: 'salon@example.com',
          address: '東京都渋谷区〇〇1-2-3',
          plan: 'light',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        };
      }

      // 本番環境ではSupabaseから取得
      if (!authTenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', authTenant.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!authTenant?.id || isDev,
  });
};