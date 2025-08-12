import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TreatmentMenu } from '../types/treatment';
import { useAuth } from './useAuth';

export const useTreatmentMenus = () => {
  const { tenant } = useAuth();
  const isDev = import.meta.env.DEV;

  return useQuery({
    queryKey: ['treatment-menus', tenant?.id],
    queryFn: async () => {
      // 開発環境の場合はモックデータを返す
      if (isDev) {
        const mockMenus: TreatmentMenu[] = [
          {
            id: '1',
            tenant_id: tenant?.id || '',
            name: 'カット',
            price: 4500,
            duration_minutes: 60,
            description: 'シャンプー・ブロー込み',
            category: 'カット',
            is_active: true,
            created_at: '2024-01-01T00:00:00',
            updated_at: '2024-01-01T00:00:00',
          },
          {
            id: '2',
            tenant_id: tenant?.id || '',
            name: 'カット＆カラー',
            price: 8000,
            duration_minutes: 120,
            description: 'カット・カラー・シャンプー・ブロー込み',
            category: 'カラー',
            is_active: true,
            created_at: '2024-01-01T00:00:00',
            updated_at: '2024-01-01T00:00:00',
          },
          {
            id: '3',
            tenant_id: tenant?.id || '',
            name: 'パーマ',
            price: 7500,
            duration_minutes: 150,
            description: 'カット・パーマ・シャンプー・ブロー込み',
            category: 'パーマ',
            is_active: true,
            created_at: '2024-01-01T00:00:00',
            updated_at: '2024-01-01T00:00:00',
          },
          {
            id: '4',
            tenant_id: tenant?.id || '',
            name: 'ヘッドスパ',
            price: 3000,
            duration_minutes: 45,
            description: 'リラクゼーション効果のあるヘッドスパ',
            category: 'スパ',
            is_active: true,
            created_at: '2024-01-01T00:00:00',
            updated_at: '2024-01-01T00:00:00',
          },
        ];

        return mockMenus.filter(menu => menu.is_active);
      }

      // 本番環境ではSupabaseから取得
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from('treatment_menus')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as TreatmentMenu[];
    },
    enabled: !!tenant?.id || isDev,
  });
};