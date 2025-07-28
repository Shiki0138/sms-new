import { supabase } from '../lib/supabase';

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffData {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  color: string;
  isActive?: boolean;
}

export interface UpdateStaffData {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  color?: string;
  isActive?: boolean;
}

/**
 * スタッフ管理サービス
 * スタッフの登録、更新、削除、取得を管理
 */
export class StaffService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * スタッフ一覧を取得
   */
  async getStaff(includeInactive = true): Promise<Staff[]> {
    try {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('created_at', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(this.mapDatabaseToStaff) || [];
    } catch (error) {
      console.error('Error fetching staff:', error);
      return [];
    }
  }

  /**
   * 特定のスタッフを取得
   */
  async getStaffById(staffId: string): Promise<Staff | null> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .eq('tenant_id', this.tenantId)
        .single();

      if (error) throw error;

      return data ? this.mapDatabaseToStaff(data) : null;
    } catch (error) {
      console.error('Error fetching staff by ID:', error);
      return null;
    }
  }

  /**
   * 新しいスタッフを追加
   */
  async createStaff(staffData: CreateStaffData): Promise<{ staff: Staff | null; success: boolean; error?: string }> {
    try {
      // Light plan制限チェック
      const existingStaff = await this.getStaff(false);
      const lightPlanLimit = 3;

      if (existingStaff.length >= lightPlanLimit) {
        return {
          staff: null,
          success: false,
          error: `ライトプランでは最大${lightPlanLimit}名までのスタッフ登録が可能です`,
        };
      }

      // 名前の重複チェック
      const duplicateCheck = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', this.tenantId)
        .eq('name', staffData.name)
        .eq('is_active', true)
        .single();

      if (duplicateCheck.data) {
        return {
          staff: null,
          success: false,
          error: '同じ名前のスタッフが既に登録されています',
        };
      }

      // 色の重複チェック
      const colorCheck = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', this.tenantId)
        .eq('color', staffData.color)
        .eq('is_active', true)
        .single();

      if (colorCheck.data) {
        return {
          staff: null,
          success: false,
          error: 'この色は既に他のスタッフが使用しています',
        };
      }

      const { data, error } = await supabase
        .from('staff')
        .insert({
          tenant_id: this.tenantId,
          name: staffData.name,
          email: staffData.email || null,
          phone: staffData.phone || null,
          position: staffData.position || null,
          color: staffData.color,
          is_active: staffData.isActive ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        staff: this.mapDatabaseToStaff(data),
        success: true,
      };
    } catch (error) {
      console.error('Error creating staff:', error);
      return {
        staff: null,
        success: false,
        error: 'スタッフの追加に失敗しました',
      };
    }
  }

  /**
   * スタッフ情報を更新
   */
  async updateStaff(staffId: string, updates: UpdateStaffData): Promise<{ staff: Staff | null; success: boolean; error?: string }> {
    try {
      // 名前の重複チェック（自分以外）
      if (updates.name) {
        const duplicateCheck = await supabase
          .from('staff')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .eq('name', updates.name)
          .eq('is_active', true)
          .neq('id', staffId)
          .single();

        if (duplicateCheck.data) {
          return {
            staff: null,
            success: false,
            error: '同じ名前のスタッフが既に登録されています',
          };
        }
      }

      // 色の重複チェック（自分以外）
      if (updates.color) {
        const colorCheck = await supabase
          .from('staff')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .eq('color', updates.color)
          .eq('is_active', true)
          .neq('id', staffId)
          .single();

        if (colorCheck.data) {
          return {
            staff: null,
            success: false,
            error: 'この色は既に他のスタッフが使用しています',
          };
        }
      }

      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.position !== undefined) updateData.position = updates.position || null;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', staffId)
        .eq('tenant_id', this.tenantId)
        .select()
        .single();

      if (error) throw error;

      return {
        staff: this.mapDatabaseToStaff(data),
        success: true,
      };
    } catch (error) {
      console.error('Error updating staff:', error);
      return {
        staff: null,
        success: false,
        error: 'スタッフ情報の更新に失敗しました',
      };
    }
  }

  /**
   * スタッフを削除（論理削除）
   */
  async deleteStaff(staffId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 関連する予約があるかチェック
      const { data: reservations, error: reservationError } = await supabase
        .from('reservations')
        .select('id')
        .eq('staff_id', staffId)
        .eq('tenant_id', this.tenantId)
        .gte('start_time', new Date().toISOString())
        .limit(1);

      if (reservationError) throw reservationError;

      if (reservations && reservations.length > 0) {
        return {
          success: false,
          error: 'このスタッフには今後の予約が入っているため削除できません',
        };
      }

      // 論理削除（is_activeをfalseにする）
      const { error } = await supabase
        .from('staff')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId)
        .eq('tenant_id', this.tenantId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting staff:', error);
      return {
        success: false,
        error: 'スタッフの削除に失敗しました',
      };
    }
  }

  /**
   * 有効なスタッフ数を取得
   */
  async getActiveStaffCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting active staff count:', error);
      return 0;
    }
  }

  /**
   * スタッフの色一覧を取得（重複チェック用）
   */
  async getUsedColors(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('color')
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(item => item.color) || [];
    } catch (error) {
      console.error('Error getting used colors:', error);
      return [];
    }
  }

  /**
   * 利用可能な色を取得
   */
  async getAvailableColors(): Promise<string[]> {
    const defaultColors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151',
    ];

    const usedColors = await this.getUsedColors();
    return defaultColors.filter(color => !usedColors.includes(color));
  }

  /**
   * データベースレコードをStaffオブジェクトにマッピング
   */
  private mapDatabaseToStaff(data: any): Staff {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      position: data.position,
      color: data.color,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}