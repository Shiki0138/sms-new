import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useTreatmentMenus } from '../../hooks/useTreatmentMenus';
import { useCreateTreatmentRecord } from '../../hooks/useCreateTreatmentRecord';
import { format } from 'date-fns';

interface TreatmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

const TreatmentHistoryModal: React.FC<TreatmentHistoryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
}) => {
  const { data: menus } = useTreatmentMenus();
  const createTreatmentRecord = useCreateTreatmentRecord();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    menu_name: '',
    custom_menu_name: '',
    price: '',
    duration_minutes: 60,
    notes: '',
    staff_notes: '',
    before_image: null as File | null,
    after_image: null as File | null,
  });

  const [isCustomMenu, setIsCustomMenu] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = '施術日は必須です';
    }

    const menuName = isCustomMenu ? formData.custom_menu_name : formData.menu_name;
    if (!menuName.trim()) {
      newErrors.menu = 'メニューは必須です';
    }

    if (!formData.price || isNaN(Number(formData.price))) {
      newErrors.price = '料金は数字で入力してください';
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
      const menuName = isCustomMenu ? formData.custom_menu_name : formData.menu_name;
      
      await createTreatmentRecord.mutateAsync({
        customer_id: customerId,
        date: formData.date,
        menu_name: menuName,
        price: Number(formData.price),
        duration_minutes: formData.duration_minutes,
        notes: formData.notes,
        staff_notes: formData.staff_notes,
        // TODO: 画像アップロード処理
      });

      toast.success('施術記録を追加しました');
      onClose();
      // フォームリセット
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        menu_name: '',
        custom_menu_name: '',
        price: '',
        duration_minutes: 60,
        notes: '',
        staff_notes: '',
        before_image: null,
        after_image: null,
      });
      setIsCustomMenu(false);
    } catch (error) {
      toast.error('施術記録の追加に失敗しました');
    }
  };

  const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMenuId = e.target.value;
    if (selectedMenuId === 'custom') {
      setIsCustomMenu(true);
      setFormData(prev => ({ ...prev, menu_name: '', price: '', duration_minutes: 60 }));
    } else {
      setIsCustomMenu(false);
      const selectedMenu = menus?.find(menu => menu.id === selectedMenuId);
      if (selectedMenu) {
        setFormData(prev => ({
          ...prev,
          menu_name: selectedMenu.name,
          price: selectedMenu.price.toString(),
          duration_minutes: selectedMenu.duration_minutes,
        }));
      }
    }
  };

  const handleImageUpload = (field: 'before_image' | 'after_image') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
          <h2 className="text-xl font-bold text-gray-900">
            施術記録を追加 - {customerName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 施術日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                施術日 <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                error={errors.date}
              />
            </div>

            {/* メニュー選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メニュー <span className="text-red-500">*</span>
              </label>
              <select
                onChange={handleMenuChange}
                className={`block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.menu ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">メニューを選択してください</option>
                {menus?.map(menu => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name} (¥{menu.price.toLocaleString()} / {menu.duration_minutes}分)
                  </option>
                ))}
                <option value="custom">カスタムメニュー</option>
              </select>
              {errors.menu && (
                <p className="mt-1 text-sm text-red-600">{errors.menu}</p>
              )}
            </div>

            {/* カスタムメニュー名 */}
            {isCustomMenu && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カスタムメニュー名 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  name="custom_menu_name"
                  value={formData.custom_menu_name}
                  onChange={handleChange}
                  placeholder="オリジナルメニュー名"
                />
              </div>
            )}

            {/* 料金と時間 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  料金（円） <span className="text-red-500">*</span>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  施術時間（分）
                </label>
                <select
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={30}>30分</option>
                  <option value={45}>45分</option>
                  <option value={60}>1時間</option>
                  <option value={90}>1時間30分</option>
                  <option value={120}>2時間</option>
                  <option value={150}>2時間30分</option>
                  <option value={180}>3時間</option>
                </select>
              </div>
            </div>

            {/* お客様メモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                お客様からの要望・注意事項
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="お客様からの要望や注意事項があれば入力してください"
              />
            </div>

            {/* スタッフメモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                スタッフメモ（施術記録）
              </label>
              <textarea
                name="staff_notes"
                rows={3}
                value={formData.staff_notes}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="施術内容や次回への申し送り事項などを入力してください"
              />
            </div>

            {/* 画像アップロード */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ビフォー画像
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('before_image')}
                    className="hidden"
                    id="before-image"
                  />
                  <label
                    htmlFor="before-image"
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
                  >
                    画像を選択
                  </label>
                  {formData.before_image && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.before_image.name}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  アフター画像
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('after_image')}
                    className="hidden"
                    id="after-image"
                  />
                  <label
                    htmlFor="after-image"
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
                  >
                    画像を選択
                  </label>
                  {formData.after_image && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.after_image.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={createTreatmentRecord.isPending}>
              記録を保存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TreatmentHistoryModal;