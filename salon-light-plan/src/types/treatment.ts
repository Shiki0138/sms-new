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
  // Extended fields for enhanced menu management
  image_url?: string;
  display_order?: number;
  popularity_score?: number;
  booking_count?: number;
  member_price?: number;
  peak_price?: number;
  off_peak_price?: number;
  staff_assignments?: StaffMenuAssignment[];
  pricing_options?: MenuPricingOption[];
  tags?: string[];
  is_online_bookable?: boolean;
  is_featured?: boolean;
  min_advance_booking_hours?: number;
  max_advance_booking_days?: number;
}

export interface StaffMenuAssignment {
  staff_id: string;
  menu_id: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  can_perform: boolean;
  custom_duration_minutes?: number;
  commission_rate?: number;
  notes?: string;
}

export interface MenuPricingOption {
  id: string;
  menu_id: string;
  type: 'member' | 'time' | 'day' | 'package' | 'campaign';
  name: string;
  price: number;
  discount_percentage?: number;
  conditions?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
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