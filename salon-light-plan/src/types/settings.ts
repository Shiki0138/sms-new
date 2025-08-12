export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
  } | null;
}

export interface BusinessSettings {
  id: string;
  tenant_id: string;
  business_hours: BusinessHours;
  weekly_closed_days: number[]; // 0=日曜, 1=月曜, ..., 6=土曜
  created_at: string;
  updated_at: string;
}

export interface ServiceMenu {
  id: string;
  tenant_id: string;
  name: string;
  category?: string;
  duration: number; // 分単位
  price: number;
  description?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceMenuInput {
  name: string;
  category?: string;
  duration: number;
  price: number;
  description?: string;
  display_order?: number;
}

export interface UpdateServiceMenuInput extends Partial<CreateServiceMenuInput> {
  id: string;
  is_active?: boolean;
}

export interface PlanUsage {
  id: string;
  tenant_id: string;
  month: string; // YYYY-MM-01形式
  customer_count: number;
  reservation_count: number;
  created_at: string;
  updated_at: string;
}