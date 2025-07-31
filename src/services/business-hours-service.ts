import { supabase } from '../lib/supabase';

export interface BusinessHour {
  id?: string;
  tenantId: string;
  dayOfWeek: number; // 0=日曜
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

/**
 * 営業時間・休日管理サービス
 */
export class BusinessHoursService {
  private tenantId: string;

  constructor(tenantId: string) {
    // テナントIDの正規化とバリデーション
    this.tenantId = this.validateAndNormalizeTenantId(tenantId);
    console.log(
      '[BusinessHoursService] Initialized with tenant ID:',
      this.tenantId
    );
  }

  private validateAndNormalizeTenantId(tenantId: string): string {
    if (!tenantId) {
      console.error('[BusinessHoursService] No tenant ID provided');
      return '';
    }

    // UUIDの正規表現パターン
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 既にUUID形式の場合はそのまま返す
    if (uuidRegex.test(tenantId)) {
      return tenantId;
    }

    // 開発環境用のテナントIDまたはデフォルトUUIDの場合
    if (tenantId === 'dev-tenant' || tenantId === 'dev-tenant-id' || tenantId === '01HZTEST001' || 
        tenantId === '00000000-0000-0000-0000-000000000001') {
      console.warn(
        '[BusinessHoursService] Development/default tenant ID detected:',
        tenantId
      );
      // デフォルトUUIDの場合は、UUID形式として処理を続ける
      if (tenantId === '00000000-0000-0000-0000-000000000001') {
        return tenantId;
      }
      // その他の開発用IDの場合はモックサービスで処理されるため、そのまま返す
      return tenantId;
    }

    console.error('[BusinessHoursService] Invalid tenant ID format:', tenantId);
    return tenantId; // 無効な形式でも返すが、後続の処理でエラーになる
  }

  /**
   * 営業時間を取得
   */
  async getBusinessHours(): Promise<BusinessHour[]> {
    try {
      // テナントIDが無効な場合は空配列を返す
      if (!this.tenantId) {
        console.warn(
          '[getBusinessHours] No valid tenant ID, returning empty array'
        );
        return [];
      }

      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      return data?.map(this.mapDatabaseToBusinessHour) || [];
    } catch (error) {
      console.error('Error fetching business hours:', error);
      return [];
    }
  }

  /**
   * 営業時間を更新/作成
   */
  async updateBusinessHours(
    dayOfWeek: number,
    hours: Partial<BusinessHour>
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        tenant_id: this.tenantId,
        day_of_week: dayOfWeek,
      };

      if (hours.isOpen !== undefined) updateData.is_open = hours.isOpen;
      if (hours.openTime !== undefined) updateData.open_time = hours.openTime;
      if (hours.closeTime !== undefined)
        updateData.close_time = hours.closeTime;
      if (hours.breakStartTime !== undefined)
        updateData.break_start_time = hours.breakStartTime || null;
      if (hours.breakEndTime !== undefined)
        updateData.break_end_time = hours.breakEndTime || null;

      const { error } = await supabase
        .from('business_hours')
        .upsert(updateData, {
          onConflict: 'tenant_id,day_of_week',
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating business hours:', error);
      return false;
    }
  }

  /**
   * 初期営業時間設定を作成
   */
  async createDefaultBusinessHours(): Promise<boolean> {
    try {
      const defaultHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
        tenant_id: this.tenantId,
        day_of_week: dayOfWeek,
        is_open: dayOfWeek !== 0, // 日曜日以外は営業
        open_time: '09:00',
        close_time: '18:00',
        break_start_time: '12:00',
        break_end_time: '13:00',
      }));

      const { error } = await supabase
        .from('business_hours')
        .upsert(defaultHours, {
          onConflict: 'tenant_id,day_of_week',
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error creating default business hours:', error);
      return false;
    }
  }

  /**
   * 休日設定を取得
   */
  async getHolidaySettings(): Promise<HolidaySetting[]> {
    try {
      console.log('[getHolidaySettings] Fetching for tenant:', this.tenantId);

      // テナントIDが無効な場合は空配列を返す
      if (!this.tenantId) {
        console.warn(
          '[getHolidaySettings] No valid tenant ID, returning empty array'
        );
        return [];
      }

      const { data, error } = await supabase
        .from('holiday_settings')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[getHolidaySettings] Supabase error:', error);
        console.error('[getHolidaySettings] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('[getHolidaySettings] Fetched data:', data);
      console.log('[getHolidaySettings] Data count:', data?.length || 0);
      return data?.map(this.mapDatabaseToHolidaySetting) || [];
    } catch (error) {
      console.error(
        '[getHolidaySettings] Error fetching holiday settings:',
        error
      );
      return [];
    }
  }

  /**
   * 休日設定を追加
   */
  async createHolidaySetting(holidayData: CreateHolidayData): Promise<{
    holiday: HolidaySetting | null;
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('[createHolidaySetting] Starting with data:', holidayData);
      console.log('[createHolidaySetting] Tenant ID:', this.tenantId);

      // テナントIDが存在するか確認
      if (!this.tenantId) {
        console.error('[createHolidaySetting] No tenant ID provided');
        return {
          holiday: null,
          success: false,
          error: 'テナント情報が見つかりません',
        };
      }

      // テナントIDのフォーマットチェック（既にコンストラクタで正規化されている）
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(this.tenantId)) {
        console.error(
          '[createHolidaySetting] Invalid tenant ID format after normalization:',
          this.tenantId
        );

        // テナントIDが正規化後も無効な場合
        return {
          holiday: null,
          success: false,
          error:
            'テナント情報の取得に問題があります。再度ログインしてください。',
        };
      }

      // 重複チェック
      if (
        holidayData.holidayType === 'weekly' &&
        holidayData.dayOfWeek !== undefined
      ) {
        const existing = await supabase
          .from('holiday_settings')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .eq('holiday_type', 'weekly')
          .eq('day_of_week', holidayData.dayOfWeek)
          .eq('is_active', true)
          .single();

        if (existing.data) {
          return {
            holiday: null,
            success: false,
            error: 'この曜日の定休日は既に設定されています',
          };
        }
      }

      const insertData: Record<string, unknown> = {
        tenant_id: this.tenantId,
        holiday_type: holidayData.holidayType,
        description: holidayData.description,
        is_active: holidayData.isActive ?? true,
      };

      if (holidayData.dayOfWeek !== undefined)
        insertData.day_of_week = holidayData.dayOfWeek;
      if (holidayData.weekOfMonth !== undefined)
        insertData.week_of_month = holidayData.weekOfMonth;
      if (holidayData.specificDate !== undefined)
        insertData.specific_date = holidayData.specificDate;
      if (holidayData.endDate !== undefined)
        insertData.end_date = holidayData.endDate;

      console.log('[createHolidaySetting] Insert data:', insertData);

      const { data, error } = await supabase
        .from('holiday_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[createHolidaySetting] Supabase error:', error);
        console.error('[createHolidaySetting] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // より具体的なエラーメッセージ
        if (error.code === '42P01') {
          return {
            holiday: null,
            success: false,
            error:
              'holiday_settingsテーブルが存在しません。データベースの設定を確認してください。',
          };
        }

        throw error;
      }

      console.log('[createHolidaySetting] Success, created holiday:', data);

      return {
        holiday: this.mapDatabaseToHolidaySetting(data),
        success: true,
      };
    } catch (error) {
      console.error('[createHolidaySetting] Unexpected error:', error);
      return {
        holiday: null,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '休日設定の追加に失敗しました',
      };
    }
  }

  /**
   * 休日設定を更新
   */
  async updateHolidaySetting(
    holidayId: string,
    updates: Partial<HolidaySetting>
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.isActive !== undefined)
        updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('holiday_settings')
        .update(updateData)
        .eq('id', holidayId)
        .eq('tenant_id', this.tenantId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating holiday setting:', error);
      return false;
    }
  }

  /**
   * 休日設定を削除
   */
  async deleteHolidaySetting(holidayId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('holiday_settings')
        .delete()
        .eq('id', holidayId)
        .eq('tenant_id', this.tenantId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting holiday setting:', error);
      return false;
    }
  }

  /**
   * 指定日が休日かどうかを判定
   */
  async isHoliday(date: Date): Promise<boolean> {
    try {
      const holidays = await this.getHolidaySettings();
      const activeHolidays = holidays.filter((h) => h.isActive);

      for (const holiday of activeHolidays) {
        switch (holiday.holidayType) {
          case 'weekly':
            if (date.getDay() === holiday.dayOfWeek) {
              return true;
            }
            break;

          case 'monthly':
            if (
              this.isNthWeekdayOfMonth(
                date,
                holiday.weekOfMonth!,
                holiday.dayOfWeek!
              )
            ) {
              return true;
            }
            break;

          case 'specific_date':
            if (holiday.specificDate) {
              const holidayStart = new Date(holiday.specificDate);
              const holidayEnd = holiday.endDate
                ? new Date(holiday.endDate)
                : holidayStart;

              if (date >= holidayStart && date <= holidayEnd) {
                return true;
              }
            }
            break;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking if date is holiday:', error);
      return false;
    }
  }

  /**
   * 指定日が営業時間内かどうかを判定
   */
  async isBusinessTime(date: Date): Promise<boolean> {
    try {
      // 休日チェック
      if (await this.isHoliday(date)) {
        return false;
      }

      // 営業時間チェック
      const businessHours = await this.getBusinessHours();
      const dayOfWeek = date.getDay();
      const todayHours = businessHours.find((h) => h.dayOfWeek === dayOfWeek);

      if (!todayHours || !todayHours.isOpen) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking business time:', error);
      return false;
    }
  }

  /**
   * 営業時間を営業日ごとに取得（カレンダー用）
   */
  async getBusinessHoursForCalendar(): Promise<{
    [dayOfWeek: number]: BusinessHour;
  }> {
    try {
      const businessHours = await this.getBusinessHours();
      const result: { [dayOfWeek: number]: BusinessHour } = {};

      businessHours.forEach((hour) => {
        result[hour.dayOfWeek] = hour;
      });

      return result;
    } catch (error) {
      console.error('Error getting business hours for calendar:', error);
      return {};
    }
  }

  /**
   * 期間内の休日一覧を取得
   */
  async getHolidaysInRange(startDate: Date, endDate: Date): Promise<Date[]> {
    try {
      const holidays = await this.getHolidaySettings();
      const activeHolidays = holidays.filter((h) => h.isActive);
      const holidayDates: Date[] = [];

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        for (const holiday of activeHolidays) {
          switch (holiday.holidayType) {
            case 'weekly':
              if (currentDate.getDay() === holiday.dayOfWeek) {
                holidayDates.push(new Date(currentDate));
              }
              break;

            case 'monthly':
              if (
                this.isNthWeekdayOfMonth(
                  currentDate,
                  holiday.weekOfMonth!,
                  holiday.dayOfWeek!
                )
              ) {
                holidayDates.push(new Date(currentDate));
              }
              break;

            case 'specific_date':
              if (holiday.specificDate) {
                const holidayStart = new Date(holiday.specificDate);
                const holidayEnd = holiday.endDate
                  ? new Date(holiday.endDate)
                  : holidayStart;

                if (currentDate >= holidayStart && currentDate <= holidayEnd) {
                  holidayDates.push(new Date(currentDate));
                }
              }
              break;
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return holidayDates;
    } catch (error) {
      console.error('Error getting holidays in range:', error);
      return [];
    }
  }

  // プライベートメソッド

  private mapDatabaseToBusinessHour(
    data: Record<string, unknown>
  ): BusinessHour {
    return {
      id: data.id as string,
      tenantId: data.tenant_id as string,
      dayOfWeek: data.day_of_week as number,
      isOpen: data.is_open as boolean,
      openTime: data.open_time as string,
      closeTime: data.close_time as string,
      breakStartTime: data.break_start_time as string | undefined,
      breakEndTime: data.break_end_time as string | undefined,
    };
  }

  private mapDatabaseToHolidaySetting(
    data: Record<string, unknown>
  ): HolidaySetting {
    return {
      id: data.id as string,
      tenantId: data.tenant_id as string,
      holidayType: data.holiday_type as 'weekly' | 'monthly' | 'specific_date',
      dayOfWeek: data.day_of_week as number | undefined,
      weekOfMonth: data.week_of_month as number | undefined,
      specificDate: data.specific_date as string | undefined,
      endDate: data.end_date as string | undefined,
      description: data.description as string,
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
    };
  }

  private isNthWeekdayOfMonth(
    date: Date,
    week: number,
    dayOfWeek: number
  ): boolean {
    if (date.getDay() !== dayOfWeek) {
      return false;
    }

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstWeekday = firstDay.getDay();

    // 第1週の該当曜日の日付を計算
    const firstOccurrence = 1 + ((dayOfWeek - firstWeekday + 7) % 7);

    // 第n週の該当曜日の日付を計算
    const nthOccurrence = firstOccurrence + (week - 1) * 7;

    return date.getDate() === nthOccurrence;
  }
}
