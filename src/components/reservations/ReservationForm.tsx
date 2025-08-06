import React, { useState } from 'react';
import { X, Calendar, Clock, User, DollarSign } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { format } from 'date-fns';
import type { Customer } from '../../types/customer';
import type { CreateReservationInput } from '../../types/reservation';

interface ReservationFormProps {
  onSubmit: (data: CreateReservationInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
  customers?: Customer[];
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  customers = [],
}) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    duration: 60,
    menu_content: '',
    price: '',
    staff_name: '',
    notes: '',
  });

  // メニューオプション
  const menuOptions = [
    { value: 'カット', price: 4500, duration: 60 },
    { value: 'カット & カラー', price: 8500, duration: 120 },
    { value: 'カット & パーマ', price: 9500, duration: 150 },
    { value: 'カラー', price: 6000, duration: 90 },
    { value: 'パーマ', price: 7000, duration: 120 },
    { value: 'トリートメント', price: 3000, duration: 30 },
    { value: 'ヘッドスパ', price: 4000, duration: 45 },
    { value: 'セットアップ', price: 3500, duration: 45 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDateTime = new Date(`${formData.date}T${formData.time}`);
    const endDateTime = new Date(
      startDateTime.getTime() + formData.duration * 60 * 1000
    );

    onSubmit({
      ...formData,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      price: parseInt(formData.price) || 0,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // メニュー選択時に価格と時間を自動設定
    if (name === 'menu_content') {
      const selectedMenu = menuOptions.find((menu) => menu.value === value);
      if (selectedMenu) {
        setFormData((prev) => ({
          ...prev,
          menu_content: value,
          price: selectedMenu.price.toString(),
          duration: selectedMenu.duration,
        }));
      }
    }
  };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    const customer = customers.find((c) => c.id === customerId);

    setFormData((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer ? customer.name : '',
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">新規予約登録</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 顧客選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline-block h-4 w-4 mr-1" />
              顧客 <span className="text-red-500">*</span>
            </label>
            {customers.length > 0 ? (
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleCustomerSelect}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">顧客を選択してください</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone_number || 'TEL未登録'})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
                placeholder="顧客名を入力"
              />
            )}
          </div>

          {/* 日時選択 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline-block h-4 w-4 mr-1" />
                予約日 <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline-block h-4 w-4 mr-1" />
                開始時間 <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
                step="900" // 15分刻み
              />
            </div>
          </div>

          {/* メニュー選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              施術メニュー <span className="text-red-500">*</span>
            </label>
            <select
              name="menu_content"
              value={formData.menu_content}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">メニューを選択してください</option>
              {menuOptions.map((menu) => (
                <option key={menu.value} value={menu.value}>
                  {menu.value} (¥{menu.price.toLocaleString()} / {menu.duration}
                  分)
                </option>
              ))}
              <option value="その他">その他（カスタムメニュー）</option>
            </select>
          </div>

          {/* 所要時間と料金 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所要時間（分） <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="15"
                step="15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline-block h-4 w-4 mr-1" />
                料金 <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          {/* 担当スタッフ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当スタッフ
            </label>
            <Input
              type="text"
              name="staff_name"
              value={formData.staff_name}
              onChange={handleChange}
              placeholder="担当スタッフ名"
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="特記事項があれば入力してください"
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || !formData.customer_name || !formData.menu_content
              }
            >
              {isLoading ? '登録中...' : '予約を登録'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationForm;
