import { supabase } from '../lib/supabase';

export interface StaffSchedule {
  id: string;
  tenantId: string;
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAvailability {
  id: string;
  tenantId: string;
  staffId: string;
  date: string;
  availabilityType: 'available' | 'unavailable' | 'limited';
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffService {
  id: string;
  tenantId: string;
  staffId: string;
  serviceId: string;
  proficiencyLevel: 'beginner' | 'standard' | 'expert';
  isActive: boolean;
  createdAt: string;
}

export interface CreateScheduleData {
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isActive?: boolean;
}

export interface CreateAvailabilityData {
  staffId: string;
  date: string;
  availabilityType: 'available' | 'unavailable' | 'limited';
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface CreateStaffServiceData {
  staffId: string;
  serviceId: string;
  proficiencyLevel?: 'beginner' | 'standard' | 'expert';
  isActive?: boolean;
}

/**
 * スタッフスケジューリングサービス
 */
export class StaffSchedulingService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * スタッフの週間スケジュールを取得
   */
  async getStaffSchedules(staffId?: string): Promise<StaffSchedule[]> {
    try {
      let query = supabase
        .from('staff_schedules')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('day_of_week', { ascending: true });

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(this.mapDatabaseToSchedule) || [];
    } catch (error) {
      console.error('Error fetching staff schedules:', error);
      return [];
    }
  }

  /**
   * スタッフスケジュールを作成または更新
   */
  async upsertStaffSchedule(data: CreateScheduleData): Promise<{ success: boolean; schedule?: StaffSchedule; error?: string }> {
    try {
      const scheduleData = {
        tenant_id: this.tenantId,
        staff_id: data.staffId,
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        break_start_time: data.breakStartTime || null,
        break_end_time: data.breakEndTime || null,
        is_active: data.isActive ?? true,
      };

      const { data: result, error } = await supabase
        .from('staff_schedules')
        .upsert(scheduleData, {
          onConflict: 'tenant_id,staff_id,day_of_week',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        schedule: this.mapDatabaseToSchedule(result),
      };
    } catch (error) {
      console.error('Error upserting staff schedule:', error);
      return {
        success: false,
        error: 'スケジュールの保存に失敗しました',
      };
    }
  }

  /**
   * スタッフの特定期間の出勤可能状況を取得
   */
  async getStaffAvailability(staffId: string, startDate: string, endDate: string): Promise<StaffAvailability[]> {
    try {
      const { data, error } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      return data?.map(this.mapDatabaseToAvailability) || [];
    } catch (error) {
      console.error('Error fetching staff availability:', error);
      return [];
    }
  }

  /**
   * スタッフの出勤可能状況を設定
   */
  async setStaffAvailability(data: CreateAvailabilityData): Promise<{ success: boolean; availability?: StaffAvailability; error?: string }> {
    try {
      const availabilityData = {
        tenant_id: this.tenantId,
        staff_id: data.staffId,
        date: data.date,
        availability_type: data.availabilityType,
        start_time: data.startTime || null,
        end_time: data.endTime || null,
        reason: data.reason || null,
      };

      const { data: result, error } = await supabase
        .from('staff_availability')
        .upsert(availabilityData, {
          onConflict: 'tenant_id,staff_id,date',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        availability: this.mapDatabaseToAvailability(result),
      };
    } catch (error) {
      console.error('Error setting staff availability:', error);
      return {
        success: false,
        error: '出勤状況の設定に失敗しました',
      };
    }
  }

  /**
   * スタッフの出勤可能状況を削除
   */
  async deleteStaffAvailability(staffId: string, date: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('staff_availability')
        .delete()
        .eq('tenant_id', this.tenantId)
        .eq('staff_id', staffId)
        .eq('date', date);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting staff availability:', error);
      return {
        success: false,
        error: '出勤状況の削除に失敗しました',
      };
    }
  }

  /**
   * スタッフが対応可能なサービスを取得
   */
  async getStaffServices(staffId?: string): Promise<StaffService[]> {
    try {
      let query = supabase
        .from('staff_services')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true);

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(this.mapDatabaseToStaffService) || [];
    } catch (error) {
      console.error('Error fetching staff services:', error);
      return [];
    }
  }

  /**
   * スタッフにサービスを割り当て
   */
  async assignServiceToStaff(data: CreateStaffServiceData): Promise<{ success: boolean; staffService?: StaffService; error?: string }> {
    try {
      const staffServiceData = {
        tenant_id: this.tenantId,
        staff_id: data.staffId,
        service_id: data.serviceId,
        proficiency_level: data.proficiencyLevel || 'standard',
        is_active: data.isActive ?? true,
      };

      const { data: result, error } = await supabase
        .from('staff_services')
        .upsert(staffServiceData, {
          onConflict: 'tenant_id,staff_id,service_id',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        staffService: this.mapDatabaseToStaffService(result),
      };
    } catch (error) {
      console.error('Error assigning service to staff:', error);
      return {
        success: false,
        error: 'サービスの割り当てに失敗しました',
      };
    }
  }

  /**
   * スタッフからサービスの割り当てを解除
   */
  async unassignServiceFromStaff(staffId: string, serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('staff_services')
        .update({ is_active: false })
        .eq('tenant_id', this.tenantId)
        .eq('staff_id', staffId)
        .eq('service_id', serviceId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error unassigning service from staff:', error);
      return {
        success: false,
        error: 'サービスの割り当て解除に失敗しました',
      };
    }
  }

  /**
   * 特定の日時にスタッフが勤務可能かチェック
   */
  async isStaffAvailable(staffId: string, date: Date, startTime: string, endTime: string): Promise<boolean> {
    try {
      // 1. 曜日の定期スケジュールをチェック
      const dayOfWeek = date.getDay();
      const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('staff_id', staffId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();

      if (!schedule) return false;

      // 時間が勤務時間内かチェック
      if (startTime < schedule.start_time || endTime > schedule.end_time) {
        return false;
      }

      // 休憩時間と重なっていないかチェック
      if (schedule.break_start_time && schedule.break_end_time) {
        if (
          (startTime >= schedule.break_start_time && startTime < schedule.break_end_time) ||
          (endTime > schedule.break_start_time && endTime <= schedule.break_end_time)
        ) {
          return false;
        }
      }

      // 2. 特定日の出勤状況をチェック
      const dateStr = date.toISOString().split('T')[0];
      const { data: availability } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('staff_id', staffId)
        .eq('date', dateStr)
        .single();

      if (availability) {
        if (availability.availability_type === 'unavailable') {
          return false;
        }
        if (availability.availability_type === 'limited') {
          if (startTime < availability.start_time || endTime > availability.end_time) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return false;
    }
  }

  /**
   * データベースレコードをScheduleオブジェクトにマッピング
   */
  private mapDatabaseToSchedule(data: any): StaffSchedule {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      staffId: data.staff_id,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
      breakStartTime: data.break_start_time,
      breakEndTime: data.break_end_time,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * データベースレコードをAvailabilityオブジェクトにマッピング
   */
  private mapDatabaseToAvailability(data: any): StaffAvailability {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      staffId: data.staff_id,
      date: data.date,
      availabilityType: data.availability_type,
      startTime: data.start_time,
      endTime: data.end_time,
      reason: data.reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * データベースレコードをStaffServiceオブジェクトにマッピング
   */
  private mapDatabaseToStaffService(data: any): StaffService {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      staffId: data.staff_id,
      serviceId: data.service_id,
      proficiencyLevel: data.proficiency_level,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }
}