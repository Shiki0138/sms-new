import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SalesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  name: string;
  phone_number: string;
}

interface Reservation {
  id: string;
  start_time: string;
  customers: {
    name: string;
  } | null;
}

interface FormData {
  customer_id: string;
  reservation_id: string;
  amount: number;
  payment_method: 'cash' | 'credit' | 'other';
  description: string;
}

export const SalesForm: React.FC<SalesFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { tenant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [formData, setFormData] = useState<FormData>({
    customer_id: '',
    reservation_id: '',
    amount: 0,
    payment_method: 'cash',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenant && isOpen) {
      fetchCustomers();
      fetchReservations();
    }
  }, [tenant, isOpen]);

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

  const fetchReservations = async () => {
    if (!tenant) return;

    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          start_time,
          customers (
            name
          )
        `)
        .eq('tenant_id', tenant.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('status', 'COMPLETED')
        .order('start_time', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('予約データの取得エラー:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);

    try {
      const salesData = {
        customer_id: formData.customer_id || null,
        reservation_id: formData.reservation_id || null,
        amount: formData.amount,
        payment_method: formData.payment_method,
        description: formData.description || null,
        tenant_id: tenant.id,
      };

      const { error } = await supabase.from('sales').insert([salesData]);

      if (error) throw error;

      toast.success('売上を登録しました');
      onSuccess();
      onClose();
      
      // フォームをリセット
      setFormData({
        customer_id: '',
        reservation_id: '',
        amount: 0,
        payment_method: 'cash',
        description: '',
      });
    } catch (error) {
      console.error('売上登録エラー:', error);
      toast.error('売上の登録に失敗しました');
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
                売上登録
              </h3>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                    顧客
                  </label>
                  <select
                    id="customer"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">選択してください（任意）</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reservation" className="block text-sm font-medium text-gray-700">
                    関連予約
                  </label>
                  <select
                    id="reservation"
                    value={formData.reservation_id}
                    onChange={(e) => setFormData({ ...formData, reservation_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">選択してください（任意）</option>
                    {reservations.map((reservation) => (
                      <option key={reservation.id} value={reservation.id}>
                        {new Date(reservation.start_time).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {reservation.customers?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    金額 <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">¥</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      required
                      min="0"
                      step="1"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
                    支払方法 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="payment_method"
                    required
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="cash">現金</option>
                    <option value="credit">クレジットカード</option>
                    <option value="other">その他</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    サービス内容・説明
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="カット、カラー、パーマなど"
                  />
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '登録中...' : '登録'}
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