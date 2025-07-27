import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { CreateTreatmentInput } from '../types/treatment';

export const useCreateTreatmentRecord = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;

  return useMutation({
    mutationFn: async (data: CreateTreatmentInput) => {
      // 開発環境の場合はモック処理
      if (isDev) {
        // 実際のAPIコールをシミュレート
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 成功を返す
        return {
          id: Date.now().toString(),
          tenant_id: tenant?.id || '',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // 本番環境ではSupabaseに保存
      if (!tenant?.id) {
        throw new Error('テナント情報が見つかりません');
      }

      const { data: record, error } = await supabase
        .from('treatment_records')
        .insert({
          tenant_id: tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return record;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['treatment-records'] });
    },
  });
};