import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCustomers } from '../../hooks/useCustomers';
import { useCreateReservation } from '../../hooks/useCreateReservation';
import { useReservations } from '../../hooks/useReservations';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedHour?: number;
}

const NewReservationModal: React.FC<NewReservationModalProps> = ({
  isOpen,
  onClose,
  selectedDate = new Date(),
  selectedHour = 10,
}) => {
  const { data: customers } = useCustomers();
  const createReservation = useCreateReservation();
  
  // 今月の予約数をチェック
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: monthReservations } = useReservations(monthStart, monthEnd);

  const [formData, setFormData] = useState({
    customer_id: '',
    date: format(selectedDate, 'yyyy-MM-dd'),
    start_time: `${selectedHour.toString().padStart(2, '0')}:00`,
    duration: 60, // 分
    menu_content: '',
    price: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = '顧客を選択してください';
    }

    if (!formData.menu_content.trim()) {
      newErrors.menu_content = 'メニュー内容は必須です';
    }

    if (!formData.start_time) {
      newErrors.start_time = '開始時間は必須です';
    }

    if (formData.price && isNaN(Number(formData.price))) {
      newErrors.price = '料金は数字で入力してください';
    }

    // 月間予約数上限チェック
    if (monthReservations && monthReservations.length >= 50) {
      newErrors.limit = '今月の予約数が上限（50件）に達しています。ライトプランでは月間50件まで予約可能です。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const startDateTime = `${formData.date}T${formData.start_time}:00`;
      const endTime = new Date(startDateTime);
      endTime.setMinutes(endTime.getMinutes() + formData.duration);
      const endDateTime = endTime.toISOString();

      await createReservation.mutateAsync({
        customer_id: formData.customer_id,
        start_time: startDateTime,
        end_time: endDateTime,
        menu_content: formData.menu_content,
        price: formData.price ? Number(formData.price) : undefined,
        notes: formData.notes,
      });

      toast.success('予約を登録しました');
      onClose();
    } catch (error) {
      toast.error('予約の登録に失敗しました');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">新規予約登録</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* プラン制限警告 */}
        {errors.limit && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{errors.limit}</p>
                <p className="text-xs mt-1">スタンダードプランにアップグレードすると月間500件まで予約可能です。</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 顧客選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧客 <span className="text-red-500">*</span>
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className={`block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.customer_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">顧客を選択してください</option>
                {customers?.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone_number})
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
              )}
            </div>

            {/* 日付と時間 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日付 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時間 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  error={errors.start_time}
                />
              </div>
            </div>

            {/* 所要時間 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所要時間（分）
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={30}>30分</option>
                <option value={60}>1時間</option>
                <option value={90}>1時間30分</option>
                <option value={120}>2時間</option>
                <option value={150}>2時間30分</option>
                <option value={180}>3時間</option>
              </select>
            </div>

            {/* メニュー内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メニュー内容 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="menu_content"
                value={formData.menu_content}
                onChange={handleChange}
                error={errors.menu_content}
                placeholder="カット、カラー、パーマなど"
              />
            </div>

            {/* 料金 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                料金（円）
              </label>
              <Input
                type="text"
                name="price"
                value={formData.price}
                onChange={handleChange}
                error={errors.price}
                placeholder="5000"
              />
            </div>

            {/* 備考 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="特記事項があれば入力してください"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={createReservation.isPending || !!errors.limit}>
              予約を登録
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewReservationModal;