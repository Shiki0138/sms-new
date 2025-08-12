import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ReservationFormProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation | null;
  selectedDate?: Date | null;
  onSuccess: () => void;
}

interface Reservation {
  id: string;
  customer_id: string;
  staff_id?: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  phone_number: string;
}

interface Staff {
  id: string;
  name: string;
}

interface FormData {
  customer_id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
}

export const ReservationForm: React.FC<ReservationFormProps> = ({
  isOpen,
  onClose,
  reservation,
  selectedDate,
  onSuccess,
}) => {
  const { tenant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    staff_id: '',
    date: '',
    start_time: '',
    end_time: '',
    status: 'pending',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenant) {
      fetchCustomers();
      fetchStaff();
    }
  }, [tenant]);

  useEffect(() => {
    if (reservation) {
      const startDate = new Date(reservation.start_time);
      const endDate = new Date(reservation.end_time);
      
      setFormData({
        customer_id: reservation.customer_id,
        staff_id: reservation.staff_id || '',
        date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_time: format(endDate, 'HH:mm'),
        status: reservation.status,
        notes: reservation.notes || '',
      });
    } else if (selectedDate) {
      setFormData({
        ...formData,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: format(selectedDate, 'HH:mm'),
        end_time: format(new Date(selectedDate.getTime() + 60 * 60 * 1000), 'HH:mm'),
      });
    }
  }, [reservation, selectedDate]);

  const fetchCustomers = async () => {
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone_number')
        .eq('tenant_id', tenant.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('顧客データの取得エラー:', error);
    }
  };

  const fetchStaff = async () => {
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('スタッフデータの取得エラー:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}`);

      const reservationData = {
        customer_id: formData.customer_id,
        staff_id: formData.staff_id || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: formData.status,
        notes: formData.notes || null,
        tenant_id: tenant.id,
      };

      if (reservation) {
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', reservation.id)
          .eq('tenant_id', tenant.id);

        if (error) throw error;
        toast.success('予約を更新しました');
      } else {
        const { error } = await supabase.from('reservations').insert([reservationData]);

        if (error) throw error;
        toast.success('予約を作成しました');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('予約保存エラー:', error);
      toast.error(reservation ? '予約の更新に失敗しました' : '予約の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {reservation ? '予約編集' : '新規予約'}
              </h3>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                    顧客 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="customer"
                    required
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">選択してください</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="staff" className="block text-sm font-medium text-gray-700">
                    担当スタッフ
                  </label>
                  <select
                    id="staff"
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">未選択</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    日付 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                      開始時間 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="start_time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                      終了時間 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="end_time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    ステータス
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="pending">仮予約</option>
                    <option value="confirmed">確定</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    メモ
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '保存中...' : reservation ? '更新' : '作成'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};