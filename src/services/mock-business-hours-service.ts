// 開発環境用のモックBusinessHoursService
export interface BusinessHour {
  id?: string;
  tenantId: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface HolidaySetting {
  id: string;
  tenantId: string;
  holidayType: 'weekly' | 'monthly' | 'specific_date';
  dayOfWeek?: number;
  weekOfMonth?: number;
  specificDate?: string;
  endDate?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateHolidayData {
  holidayType: 'weekly' | 'monthly' | 'specific_date';
  dayOfWeek?: number;
  weekOfMonth?: number;
  specificDate?: string;
  endDate?: string;
  description: string;
  isActive?: boolean;
}

// ローカルストレージキー
const BUSINESS_HOURS_KEY = 'dev_business_hours';
const HOLIDAYS_KEY = 'dev_holidays';

export class MockBusinessHoursService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    console.log('[MockBusinessHoursService] Initialized with tenant ID:', tenantId);
  }

  async getBusinessHours(): Promise<BusinessHour[]> {
    const stored = localStorage.getItem(BUSINESS_HOURS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // デフォルト営業時間
    const defaultHours: BusinessHour[] = [
      { tenantId: this.tenantId, dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
      { tenantId: this.tenantId, dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { tenantId: this.tenantId, dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { tenantId: this.tenantId, dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { tenantId: this.tenantId, dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { tenantId: this.tenantId, dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { tenantId: this.tenantId, dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    ];

    localStorage.setItem(BUSINESS_HOURS_KEY, JSON.stringify(defaultHours));
    return defaultHours;
  }

  async getHolidaySettings(): Promise<HolidaySetting[]> {
    const stored = localStorage.getItem(HOLIDAYS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // デフォルトの休日設定（月曜・火曜）
    const defaultHolidays: HolidaySetting[] = [
      {
        id: 'default_monday',
        tenantId: this.tenantId,
        holidayType: 'weekly',
        dayOfWeek: 1, // 月曜日
        description: '毎週月曜日',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default_tuesday',
        tenantId: this.tenantId,
        holidayType: 'weekly',
        dayOfWeek: 2, // 火曜日
        description: '毎週火曜日',
        isActive: true,
        createdAt: new Date().toISOString(),
      }
    ];
    
    // デフォルトをローカルストレージに保存
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(defaultHolidays));
    return defaultHolidays;
  }

  async createDefaultBusinessHours(): Promise<void> {
    await this.getBusinessHours(); // これがデフォルトを作成する
  }

  async updateBusinessHours(dayOfWeek: number, hours: Partial<BusinessHour>): Promise<boolean> {
    const businessHours = await this.getBusinessHours();
    const index = businessHours.findIndex(h => h.dayOfWeek === dayOfWeek);
    
    if (index !== -1) {
      businessHours[index] = { ...businessHours[index], ...hours };
      localStorage.setItem(BUSINESS_HOURS_KEY, JSON.stringify(businessHours));
      return true;
    }
    return false;
  }

  async createHolidaySetting(data: CreateHolidayData): Promise<{ success: boolean; holiday?: HolidaySetting; error?: string }> {
    try {
      const holidays = await this.getHolidaySettings();
      const newHoliday: HolidaySetting = {
        id: `holiday_${Date.now()}`,
        tenantId: this.tenantId,
        ...data,
        isActive: data.isActive ?? true,
        createdAt: new Date().toISOString(),
      };
      
      holidays.push(newHoliday);
      localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
      
      return { success: true, holiday: newHoliday };
    } catch (error) {
      return { success: false, error: '休日設定の作成に失敗しました' };
    }
  }

  async updateHolidaySetting(id: string, updates: Partial<HolidaySetting>): Promise<boolean> {
    const holidays = await this.getHolidaySettings();
    const index = holidays.findIndex(h => h.id === id);
    
    if (index !== -1) {
      holidays[index] = { ...holidays[index], ...updates };
      localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
      return true;
    }
    return false;
  }

  async deleteHolidaySetting(id: string): Promise<boolean> {
    const holidays = await this.getHolidaySettings();
    const filtered = holidays.filter(h => h.id !== id);
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(filtered));
    return true;
  }

  async isHoliday(date: Date): Promise<boolean> {
    const holidays = await this.getHolidaySettings();
    const activeHolidays = holidays.filter(h => h.isActive);
    
    for (const holiday of activeHolidays) {
      if (holiday.holidayType === 'weekly' && holiday.dayOfWeek === date.getDay()) {
        return true;
      }
      
      if (holiday.holidayType === 'specific_date' && holiday.specificDate) {
        const holidayDate = new Date(holiday.specificDate);
        if (date.toDateString() === holidayDate.toDateString()) {
          return true;
        }
      }
    }
    
    return false;
  }

  async isBusinessTime(date: Date): Promise<boolean> {
    const hours = await this.getBusinessHours();
    const dayHour = hours.find(h => h.dayOfWeek === date.getDay());
    return dayHour?.isOpen ?? false;
  }

  async getHolidaysInRange(startDate: Date, endDate: Date): Promise<Date[]> {
    const holidays = await this.getHolidaySettings();
    const result: Date[] = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      if (await this.isHoliday(current)) {
        result.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return result;
  }
}