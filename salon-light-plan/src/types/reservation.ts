export type ReservationStatus = 
  | 'TENTATIVE' 
  | 'CONFIRMED' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW';

export interface Reservation {
  id: string;
  tenant_id: string;
  customer_id: string;
  staff_id?: string;
  start_time: string;
  end_time: string;
  menu_content: string;
  status: ReservationStatus;
  price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: {
    name: string;
    phone_number?: string;
  };
}

export interface CreateReservationInput {
  customer_id: string;
  start_time: string;
  end_time: string;
  menu_content: string;
  price?: number;
  notes?: string;
}

export interface UpdateReservationInput extends Partial<CreateReservationInput> {
  id: string;
  status?: ReservationStatus;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarProps {
  view: CalendarView;
  onReservationClick: (reservation: Reservation) => void;
  onTimeSlotClick: (date: Date) => void;
}