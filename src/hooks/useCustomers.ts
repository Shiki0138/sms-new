import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Customer } from '../types/customer';
import { useAuth } from './useAuth';
import { usePlanLimitsSafe } from './usePlanLimitsSafe';
import { usePlanUsage } from './usePlanUsage';
import { toast } from 'sonner';

export interface CreateCustomerInput {
  name: string;
  name_kana?: string;
  phone_number?: string;
  email?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  notes?: string;
  line_user_id?: string;
  instagram_id?: string;
  preferred_contact_method?: 'phone' | 'email' | 'line' | 'instagram';
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}

export const useCustomers = (searchTerm: string = '') => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const planLimits = usePlanLimitsSafe();
  const checkCustomerLimit = planLimits?.checkCustomerLimit || (async () => true);
  const showUpgradeModal = planLimits?.showUpgradeModal || (() => {});
  const { updateCustomerCount } = usePlanUsage();
  const isDev = import.meta.env.DEV;

  // 顧客一覧取得
  const customersQuery = useQuery({
    queryKey: ['customers', tenant?.id, searchTerm],
    queryFn: async () => {
      // 開発環境の場合はモックデータを返す
      if (isDev && !tenant?.id) {
        const mockCustomers: Customer[] = [
          {
            id: '1',
            tenant_id: 'mock-tenant',
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
            tenant_id: 'mock-tenant',
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
            tenant_id: 'mock-tenant',
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
        .select(`
          *,
          channels:customer_channels(*)
        `)
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,name_kana.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!tenant?.id || isDev,
  });

  // 顧客作成
  const createCustomer = useMutation({
    mutationFn: async (customerData: CreateCustomerInput) => {
      if (!tenant?.id) throw new Error('テナントが見つかりません');

      // プラン制限チェック
      const canCreate = await checkCustomerLimit();
      if (!canCreate) {
        throw new Error('CUSTOMER_LIMIT_REACHED');
      }

      // 顧客作成
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          tenant_id: tenant.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 使用状況更新
      await updateCustomerCount(true);

      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenant?.id] });
      toast.success('顧客を登録しました');
    },
    onError: (error: Error) => {
      if (error.message === 'CUSTOMER_LIMIT_REACHED') {
        showUpgradeModal('customers');
        toast.error('顧客登録数が上限に達しています');
      } else {
        toast.error('顧客登録に失敗しました');
        console.error('Customer creation error:', error);
      }
    },
  });

  // 顧客更新
  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateCustomerInput) => {
      if (!tenant?.id) throw new Error('テナントが見つかりません');

      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
      toast.success('顧客情報を更新しました');
    },
    onError: (error) => {
      toast.error('顧客情報の更新に失敗しました');
      console.error('Customer update error:', error);
    },
  });

  // 顧客削除
  const deleteCustomer = useMutation({
    mutationFn: async (customerId: string) => {
      if (!tenant?.id) throw new Error('テナントが見つかりません');

      // 関連データの確認
      const { count: reservationCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('tenant_id', tenant.id);

      if (reservationCount && reservationCount > 0) {
        throw new Error('CUSTOMER_HAS_RESERVATIONS');
      }

      // 顧客削除
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      // 使用状況更新
      await updateCustomerCount(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenant?.id] });
      toast.success('顧客を削除しました');
    },
    onError: (error: Error) => {
      if (error.message === 'CUSTOMER_HAS_RESERVATIONS') {
        toast.error('予約履歴のある顧客は削除できません');
      } else {
        toast.error('顧客の削除に失敗しました');
        console.error('Customer deletion error:', error);
      }
    },
  });

  // 顧客検索
  const searchCustomers = async (query: string) => {
    if (!tenant?.id || !query) return [];

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .or(`name.ilike.%${query}%,name_kana.ilike.%${query}%,phone_number.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name_kana', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Customer search error:', error);
      return [];
    }

    return data as Customer[];
  };

  // 顧客詳細取得
  const getCustomerById = async (customerId: string) => {
    if (!tenant?.id) return null;

    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        channels:customer_channels(*),
        reservations(
          id,
          start_time,
          end_time,
          menu_content,
          price,
          status,
          created_at
        ),
        messages(
          id,
          content,
          direction,
          channel_type,
          created_at
        )
      `)
      .eq('id', customerId)
      .eq('tenant_id', tenant.id)
      .single();

    if (error) {
      console.error('Customer fetch error:', error);
      return null;
    }

    return data as Customer;
  };

  // 来店回数による顧客フィルタリング
  const getCustomersByVisitCount = async (minVisits: number, maxVisits?: number) => {
    if (!tenant?.id) return [];

    let query = supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('visit_count', minVisits);

    if (maxVisits !== undefined) {
      query = query.lte('visit_count', maxVisits);
    }

    const { data, error } = await query.order('visit_count', { ascending: false });

    if (error) {
      console.error('Customer filter error:', error);
      return [];
    }

    return data as Customer[];
  };

  // 最終来店日による顧客フィルタリング
  const getCustomersByLastVisit = async (daysAgo: number) => {
    if (!tenant?.id) return [];

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .lte('last_visit_date', targetDate.toISOString())
      .order('last_visit_date', { ascending: false });

    if (error) {
      console.error('Customer filter error:', error);
      return [];
    }

    return data as Customer[];
  };

  return {
    // クエリ
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    error: customersQuery.error,
    refetch: customersQuery.refetch,

    // ミューテーション
    createCustomer: createCustomer.mutate,
    updateCustomer: updateCustomer.mutate,
    deleteCustomer: deleteCustomer.mutate,
    isCreating: createCustomer.isPending,
    isUpdating: updateCustomer.isPending,
    isDeleting: deleteCustomer.isPending,

    // ユーティリティ関数
    searchCustomers,
    getCustomerById,
    getCustomersByVisitCount,
    getCustomersByLastVisit,
  };
};