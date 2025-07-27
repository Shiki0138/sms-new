export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone_number?: string;
  email?: string;
  notes?: string;
  visit_count: number;
  last_visit_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone_number?: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}

export interface CustomerFilters {
  searchTerm: string;
  sortBy: 'name' | 'last_visit_date' | 'visit_count';
  sortOrder: 'asc' | 'desc';
}