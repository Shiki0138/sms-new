import { useState, useEffect } from 'react';
import { StaffService, Staff, CreateStaffData, UpdateStaffData } from '../services/staff-service';

interface UseStaffOptions {
  includeInactive?: boolean;
  autoRefresh?: boolean;
}

interface UseStaffReturn {
  staff: Staff[];
  loading: boolean;
  error: string | null;
  createStaff: (data: CreateStaffData) => Promise<{ success: boolean; error?: string }>;
  updateStaff: (id: string, data: UpdateStaffData) => Promise<{ success: boolean; error?: string }>;
  deleteStaff: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshStaff: () => Promise<void>;
  getStaffById: (id: string) => Staff | undefined;
  activeStaffCount: number;
  availableColors: string[];
}

/**
 * スタッフ管理用カスタムフック
 */
export function useStaff(
  tenantId: string,
  options: UseStaffOptions = {}
): UseStaffReturn {
  const { includeInactive = true, autoRefresh = false } = options;
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  const staffService = new StaffService(tenantId);

  const fetchStaff = async () => {
    try {
      setError(null);
      const staffData = await staffService.getStaff(includeInactive);
      setStaff(staffData);
      
      // 利用可能な色を取得
      const colors = await staffService.getAvailableColors();
      setAvailableColors(colors);
    } catch (err) {
      setError('スタッフ情報の取得に失敗しました');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshStaff = async () => {
    await fetchStaff();
  };

  const createStaff = async (data: CreateStaffData): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const result = await staffService.createStaff(data);
      
      if (result.success && result.staff) {
        setStaff(prev => [...prev, result.staff!]);
        // 利用可能な色を更新
        const colors = await staffService.getAvailableColors();
        setAvailableColors(colors);
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (err) {
      const errorMessage = 'スタッフの追加に失敗しました';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const updateStaff = async (id: string, data: UpdateStaffData): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const result = await staffService.updateStaff(id, data);
      
      if (result.success && result.staff) {
        setStaff(prev => prev.map(s => s.id === id ? result.staff! : s));
        // 利用可能な色を更新
        const colors = await staffService.getAvailableColors();
        setAvailableColors(colors);
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (err) {
      const errorMessage = 'スタッフ情報の更新に失敗しました';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const deleteStaff = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const result = await staffService.deleteStaff(id);
      
      if (result.success) {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, isActive: false } : s));
        // 利用可能な色を更新
        const colors = await staffService.getAvailableColors();
        setAvailableColors(colors);
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'スタッフの削除に失敗しました';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const getStaffById = (id: string): Staff | undefined => {
    return staff.find(s => s.id === id);
  };

  const activeStaffCount = staff.filter(s => s.isActive).length;

  useEffect(() => {
    fetchStaff();
  }, [tenantId, includeInactive]);

  // 自動更新の設定
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStaff();
    }, 30000); // 30秒ごとに更新

    return () => clearInterval(interval);
  }, [autoRefresh, tenantId, includeInactive]);

  return {
    staff,
    loading,
    error,
    createStaff,
    updateStaff,
    deleteStaff,
    refreshStaff,
    getStaffById,
    activeStaffCount,
    availableColors,
  };
}