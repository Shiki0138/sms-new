export interface TreatmentRecord {
  id: string;
  tenant_id: string;
  customer_id: string;
  date: string;
  menu_name: string;
  price: number;
  duration_minutes: number;
  notes?: string;
  staff_notes?: string;
  before_image?: string;
  after_image?: string;
  created_at: string;
  updated_at: string;
  // 関連データ
  customer?: {
    id: string;
    name: string;
  };
}

export interface CreateTreatmentInput {
  customer_id: string;
  date: string;
  menu_name: string;
  price: number;
  duration_minutes: number;
  notes?: string;
  staff_notes?: string;
  before_image?: string;
  after_image?: string;
}

export interface UpdateTreatmentInput extends Partial<CreateTreatmentInput> {
  id: string;
}

export interface TreatmentMenu {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuInput {
  name: string;
  price: number;
  duration_minutes: number;
  description?: string;
  category: string;
}

export interface UpdateMenuInput extends Partial<CreateMenuInput> {
  id: string;
  is_active?: boolean;
}