import React, { createContext, useContext, ReactNode } from 'react';
import { useBusinessHours } from '../hooks/useBusinessHours';
import { useAuth } from '../hooks/useAuth';
import { BusinessHour, HolidaySetting } from '../services/business-hours-service';

interface BusinessHoursContextType {
  businessHours: BusinessHour[];
  holidaySettings: HolidaySetting[];
  loading: boolean;
  error: string | null;
  isHoliday: (date: Date) => Promise<boolean>;
  isBusinessTime: (date: Date) => Promise<boolean>;
  getHolidaysInRange: (startDate: Date, endDate: Date) => Promise<Date[]>;
  getHolidayDates: () => Date[];
  getBusinessHoursForDay: (dayOfWeek: number) => BusinessHour | null;
  refreshData: () => Promise<void>;
}

const BusinessHoursContext = createContext<BusinessHoursContextType | undefined>(undefined);

interface BusinessHoursProviderProps {
  children: ReactNode;
}

export const BusinessHoursProvider: React.FC<BusinessHoursProviderProps> = ({ children }) => {
  const { tenant } = useAuth();
  // 開発環境でtenantが存在しない場合はダミーIDを使用
  const tenantId = tenant?.id || 'dev-tenant-id';
  
  const {
    businessHours,
    holidaySettings,
    loading,
    error,
    isHoliday,
    isBusinessTime,
    getHolidaysInRange,
    refreshData,
  } = useBusinessHours(tenantId);

  // 休日設定から実際の休日日付を生成（簡易版 - 実際の計算ロジックは後で改善）
  const getHolidayDates = (): Date[] => {
    const holidays: Date[] = [];
    const today = new Date();
    
    holidaySettings.forEach(setting => {
      if (!setting.isActive) return;
      
      if (setting.holidayType === 'specific_date') {
        if (setting.specificDate) {
          holidays.push(new Date(setting.specificDate));
          
          // 期間指定の場合
          if (setting.endDate) {
            const start = new Date(setting.specificDate);
            const end = new Date(setting.endDate);
            const current = new Date(start);
            
            while (current <= end) {
              holidays.push(new Date(current));
              current.setDate(current.getDate() + 1);
            }
          }
        }
      } else if (setting.holidayType === 'weekly') {
        // 今後3ヶ月分の毎週の定休日を生成
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        
        let current = new Date(today);
        while (current <= end) {
          if (current.getDay() === setting.dayOfWeek) {
            holidays.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
      }
      // monthly の場合は複雑なので後で実装
    });
    
    return holidays;
  };

  // 指定した曜日の営業時間を取得
  const getBusinessHoursForDay = (dayOfWeek: number): BusinessHour | null => {
    return businessHours.find(h => h.dayOfWeek === dayOfWeek) || null;
  };

  const value: BusinessHoursContextType = {
    businessHours,
    holidaySettings,
    loading,
    error,
    isHoliday,
    isBusinessTime,
    getHolidaysInRange,
    getHolidayDates,
    getBusinessHoursForDay,
    refreshData,
  };

  return (
    <BusinessHoursContext.Provider value={value}>
      {children}
    </BusinessHoursContext.Provider>
  );
};

export const useBusinessHoursContext = (): BusinessHoursContextType => {
  const context = useContext(BusinessHoursContext);
  if (context === undefined) {
    throw new Error('useBusinessHoursContext must be used within a BusinessHoursProvider');
  }
  return context;
};