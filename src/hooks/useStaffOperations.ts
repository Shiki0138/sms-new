import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { StaffService, CreateStaffData, UpdateStaffData } from '../services/staff-service';
import { useAuth } from './useAuth';
import { useTenant } from './useTenant';

export function useStaffOperations() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const staffService = tenant?.id ? new StaffService(tenant.id) : null;

  const createStaff = useCallback(async (data: CreateStaffData) => {
    if (!staffService) {
      toast.error('テナント情報が取得できません');
      return { success: false };
    }

    setLoading(true);
    try {
      const result = await staffService.createStaff(data);
      
      if (result.success) {
        toast.success('スタッフを追加しました');
      } else {
        toast.error(result.error || 'スタッフの追加に失敗しました');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating staff:', error);
      toast.error('スタッフの追加に失敗しました');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [staffService]);

  const updateStaff = useCallback(async (staffId: string, updates: UpdateStaffData) => {
    if (!staffService) {
      toast.error('テナント情報が取得できません');
      return { success: false };
    }

    setLoading(true);
    try {
      const result = await staffService.updateStaff(staffId, updates);
      
      if (result.success) {
        toast.success('スタッフ情報を更新しました');
      } else {
        toast.error(result.error || 'スタッフ情報の更新に失敗しました');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('スタッフ情報の更新に失敗しました');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [staffService]);

  const deleteStaff = useCallback(async (staffId: string) => {
    if (!staffService) {
      toast.error('テナント情報が取得できません');
      return { success: false };
    }

    setLoading(true);
    try {
      const result = await staffService.deleteStaff(staffId);
      
      if (result.success) {
        toast.success('スタッフを削除しました');
      } else {
        toast.error(result.error || 'スタッフの削除に失敗しました');
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('スタッフの削除に失敗しました');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [staffService]);

  return {
    createStaff,
    updateStaff,
    deleteStaff,
    loading,
  };
}