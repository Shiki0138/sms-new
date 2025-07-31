import React, { createContext, useContext, ReactNode, useCallback } from 'react';
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
  // 開発環境でtenantが存在しない場合は固定UUIDを使用
  const tenantId = tenant?.id || '00000000-0000-0000-0000-000000000001';
  
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
  const getHolidayDates = useCallback((): Date[] => {
    const holidays: Date[] = [];
    const today = new Date();
    
    console.log('BusinessHoursContext - Getting holiday dates, settings:', holidaySettings);
    
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
            current.setDate(current.getDate() + 1); // 開始日は既に追加されているので翌日から
            
            while (current <= end) {
              holidays.push(new Date(current));
              current.setDate(current.getDate() + 1);
            }
          }
        }
      } else if (setting.holidayType === 'weekly') {
        // 過去1年から今後1年分の毎週の定休日を生成（より広い範囲をカバー）
        const start = new Date();
        start.setFullYear(start.getFullYear() - 1); // 過去1年から開始
        
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1); // 今後1年まで
        
        const current = new Date(start);
        while (current <= end) {
          if (current.getDay() === setting.dayOfWeek) {
            holidays.push(new Date(current));
            // デバッグログを減らすため、最初と最後の日付のみログ出力
            if (holidays.length === 1 || current.getTime() === end.getTime()) {
              console.log(`Weekly holiday added: ${current.toISOString().split('T')[0]} (dayOfWeek: ${setting.dayOfWeek})`);
            }
          }
          current.setDate(current.getDate() + 1);
        }
        console.log(`Total ${holidays.filter(h => h.getDay() === setting.dayOfWeek).length} holidays added for dayOfWeek: ${setting.dayOfWeek}`);
      } else if (setting.holidayType === 'monthly') {
        // 毎月第n曜日の休日を生成
        if (setting.dayOfWeek !== undefined && setting.weekOfMonth) {
          const monthsToGenerate = 3; // 今後3ヶ月分
          
          for (let monthOffset = 0; monthOffset < monthsToGenerate; monthOffset++) {
            const targetMonth = new Date(today);
            targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
            
            // その月の最初の日を取得
            // const firstDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
            
            // 第n週の該当曜日を計算
            let dayCount = 0;
            for (let day = 1; day <= 31; day++) {
              const currentDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
              
              // 月が変わったら終了
              if (currentDate.getMonth() !== targetMonth.getMonth()) break;
              
              if (currentDate.getDay() === setting.dayOfWeek) {
                dayCount++;
                if (dayCount === setting.weekOfMonth) {
                  holidays.push(new Date(currentDate));
                  break;
                }
              }
            }
          }
        }
      }
    });
    
    console.log('BusinessHoursContext - Generated holidays:', holidays);
    return holidays;
  }, [holidaySettings]);

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

  // デバッグ用: コンテキストの状態を定期的にログ出力
  React.useEffect(() => {
    console.log('BusinessHoursContext state:', {
      tenantId,
      loading,
      error,
      businessHoursCount: businessHours.length,
      holidaySettingsCount: holidaySettings.length,
      holidaySettings: holidaySettings
    });
  }, [tenantId, loading, error, businessHours, holidaySettings]);

  return (
    <BusinessHoursContext.Provider value={value}>
      {children}
    </BusinessHoursContext.Provider>
  );
};

// Hook to use BusinessHours context
export function useBusinessHoursContext(): BusinessHoursContextType {
  const context = useContext(BusinessHoursContext);
  if (context === undefined) {
    throw new Error('useBusinessHoursContext must be used within a BusinessHoursProvider');
  }
  return context;
}