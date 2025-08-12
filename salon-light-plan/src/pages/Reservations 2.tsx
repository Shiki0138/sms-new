import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlanLimitModal } from '../components/common/PlanLimitModal';
import { ReservationForm } from '../components/reservations/ReservationForm';
import { PageLoader } from '../components/common/LoadingSpinner';

interface Reservation {
  id: string;
  customer_id: string;
  staff_id?: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at: string;
  customers?: {
    name: string;
    phone_number: string;
  };
  staff?: {
    name: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    status: string;
    customerName: string;
    staffName?: string;
    notes?: string;
  };
}

const Reservations: React.FC = () => {
  const { tenant } = useAuth();
  const { checkReservationLimit } = usePlan();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (tenant) {
      fetchReservations();
    }
  }, [tenant]);

  const fetchReservations = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          customers (
            name,
            phone_number
          ),
          staff (
            name
          )
        `)
        .eq('tenant_id', tenant.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setReservations(data || []);
      setEvents(formatReservationsToEvents(data || []));
    } catch (error) {
      console.error('予約データの取得エラー:', error);
      toast.error('予約データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatReservationsToEvents = (reservations: Reservation[]): CalendarEvent[] => {
    return reservations.map((reservation) => ({
      id: reservation.id,
      title: reservation.customers?.name || '顧客名なし',
      start: reservation.start_time,
      end: reservation.end_time,
      backgroundColor: getStatusColor(reservation.status),
      borderColor: getStatusColor(reservation.status),
      extendedProps: {
        status: reservation.status,
        customerName: reservation.customers?.name || '顧客名なし',
        staffName: reservation.staff?.name,
        notes: reservation.notes,
      },
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const handleDateSelect = useCallback(async (selectInfo: any) => {
    const canAdd = await checkReservationLimit();
    if (!canAdd) {
      setShowLimitModal(true);
      return;
    }
    
    setSelectedDate(selectInfo.start);
    setShowAddModal(true);
  }, [checkReservationLimit]);

  const handleEventClick = useCallback((clickInfo: any) => {
    const reservation = reservations.find((r) => r.id === clickInfo.event.id);
    if (reservation) {
      setSelectedReservation(reservation);
      setShowEditModal(true);
    }
  }, [reservations]);

  if (loading) {
    return <PageLoader message="予約データを読み込み中..." />;
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">予約管理</h1>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={async () => {
                const canAdd = await checkReservationLimit();
                if (!canAdd) {
                  setShowLimitModal(true);
                  return;
                }
                setShowAddModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              新規予約
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            locale="ja"
            firstDay={1}
            slotMinTime="09:00:00"
            slotMaxTime="21:00:00"
            slotDuration="00:30:00"
            height="auto"
            events={events}
            selectable={true}
            selectMirror={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              startTime: '09:00',
              endTime: '20:00',
            }}
            eventDisplay="block"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
            }}
          />
        </div>

        {/* プラン制限モーダル */}
        <PlanLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          limitType="reservations"
        />

        {/* 予約登録/編集モーダル */}
        <ReservationForm
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedReservation(null);
            setSelectedDate(null);
          }}
          reservation={showEditModal ? selectedReservation : null}
          selectedDate={showAddModal ? selectedDate : null}
          onSuccess={fetchReservations}
        />
      </div>
    </div>
  );
};

export default Reservations;