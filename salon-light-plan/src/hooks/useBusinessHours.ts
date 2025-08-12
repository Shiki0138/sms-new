import { useState, useEffect } from 'react';
import {
  BusinessHoursService,
  BusinessHour,
  HolidaySetting,
  CreateHolidayData,
} from '../services/business-hours-service';
import { MockBusinessHoursService } from '../services/mock-business-hours-service';

interface UseBusinessHoursReturn {
  businessHours: BusinessHour[];
  holidaySettings: HolidaySetting[];
  loading: boolean;
  error: string | null;
  updateBusinessHour: (
    dayOfWeek: number,
    hours: Partial<BusinessHour>
  ) => Promise<boolean>;
  createHolidaySetting: (
    data: CreateHolidayData
  ) => Promise<{ success: boolean; error?: string }>;
  updateHolidaySetting: (
    id: string,
    updates: Partial<HolidaySetting>
  ) => Promise<boolean>;
  deleteHolidaySetting: (id: string) => Promise<boolean>;
  isHoliday: (date: Date) => Promise<boolean>;
  isBusinessTime: (date: Date) => Promise<boolean>;
  getHolidaysInRange: (startDate: Date, endDate: Date) => Promise<Date[]>;
  refreshData: () => Promise<void>;
}

/**
 * 営業時間・休日管理用カスタムフック
 */
export function useBusinessHours(tenantId: string): UseBusinessHoursReturn {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [holidaySettings, setHolidaySettings] = useState<HolidaySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 開発環境またはデフォルトテナントIDの場合はモックサービスを使用
  const shouldUseMock = import.meta.env.DEV || 
    tenantId === '00000000-0000-0000-0000-000000000001' ||
    tenantId === 'dev-tenant-id';
    
  const service = shouldUseMock
    ? new MockBusinessHoursService(tenantId) as any
    : new BusinessHoursService(tenantId);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);

      const [hoursData, holidaysData] = await Promise.all([
        service.getBusinessHours(),
        service.getHolidaySettings(),
      ]);

      // 営業時間が未設定の場合は初期設定を作成
      if (hoursData.length === 0) {
        await service.createDefaultBusinessHours();
        const defaultHours = await service.getBusinessHours();
        setBusinessHours(defaultHours);
      } else {
        setBusinessHours(hoursData);
      }

      setHolidaySettings(holidaysData);
    } catch (err) {
      setError('営業時間・休日設定の取得に失敗しました');
      console.error('Error fetching business hours data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchData();
  };

  const updateBusinessHour = async (
    dayOfWeek: number,
    hours: Partial<BusinessHour>
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await service.updateBusinessHours(dayOfWeek, hours);

      if (success) {
        // ローカル状態を更新
        setBusinessHours((prev) =>
          prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...hours } : h))
        );
      }

      return success;
    } catch (err) {
      setError('営業時間の更新に失敗しました');
      console.error('Error updating business hour:', err);
      return false;
    }
  };

  const createHolidaySetting = async (
    data: CreateHolidayData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const result = await service.createHolidaySetting(data);

      if (result.success && result.holiday) {
        setHolidaySettings((prev) => [...prev, result.holiday!]);
      }

      return {
        success: result.success,
        error: result.error,
      };
    } catch {
      const errorMessage = '休日設定の追加に失敗しました';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const updateHolidaySetting = async (
    id: string,
    updates: Partial<HolidaySetting>
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await service.updateHolidaySetting(id, updates);

      if (success) {
        setHolidaySettings((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
        );
      }

      return success;
    } catch (err) {
      setError('休日設定の更新に失敗しました');
      console.error('Error updating holiday setting:', err);
      return false;
    }
  };

  const deleteHolidaySetting = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await service.deleteHolidaySetting(id);

      if (success) {
        setHolidaySettings((prev) => prev.filter((h) => h.id !== id));
      }

      return success;
    } catch (err) {
      setError('休日設定の削除に失敗しました');
      console.error('Error deleting holiday setting:', err);
      return false;
    }
  };

  const isHoliday = async (date: Date): Promise<boolean> => {
    return await service.isHoliday(date);
  };

  const isBusinessTime = async (date: Date): Promise<boolean> => {
    return await service.isBusinessTime(date);
  };

  const getHolidaysInRange = async (
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> => {
    return await service.getHolidaysInRange(startDate, endDate);
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    businessHours,
    holidaySettings,
    loading,
    error,
    updateBusinessHour,
    createHolidaySetting,
    updateHolidaySetting,
    deleteHolidaySetting,
    isHoliday,
    isBusinessTime,
    getHolidaysInRange,
    refreshData,
  };
}
