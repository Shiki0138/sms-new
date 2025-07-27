import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCreateMenu } from '../../hooks/useCreateMenu';
import { useUpdateMenu } from '../../hooks/useUpdateMenu';
import { TreatmentMenu } from '../../types/treatment';

interface MenuEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  menu?: TreatmentMenu | null;
}

const MenuEditModal: React.FC<MenuEditModalProps> = ({
  isOpen,
  onClose,
  menu,
}) => {
  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const isEditing = !!menu;

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration_minutes: 60,
    description: '',
    category: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // メニューデータが変更されたら初期値を設定
  useEffect(() => {
    if (menu) {
      setFormData({
        name: menu.name,
        price: menu.price.toString(),
        duration_minutes: menu.duration_minutes,
        description: menu.description || '',
        category: menu.category,
      });
    } else {
      setFormData({
        name: '',
        price: '',
        duration_minutes: 60,
        description: '',
        category: '',
      });
    }
  }, [menu]);

  const categories = [
    'カット',
    'カラー',
    'パーマ',
    'スパ',
    'トリートメント',
    'セット',
    'その他',
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'メニュー名は必須です';
    }

    if (!formData.price || isNaN(Number(formData.price))) {
      newErrors.price = '料金は数字で入力してください';
    }

    if (!formData.category) {
      newErrors.category = 'カテゴリーを選択してください';
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
      const menuData = {
        name: formData.name,
        price: Number(formData.price),
        duration_minutes: formData.duration_minutes,
        description: formData.description,
        category: formData.category,
      };

      if (isEditing && menu) {
        await updateMenu.mutateAsync({
          id: menu.id,
          ...menuData,
        });
        toast.success('メニューを更新しました');
      } else {
        await createMenu.mutateAsync(menuData);
        toast.success('メニューを登録しました');
      }

      onClose();
    } catch (error) {
      toast.error(isEditing ? 'メニューの更新に失敗しました' : 'メニューの登録に失敗しました');
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
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'メニュー編集' : '新規メニュー登録'}
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
            {/* メニュー名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メニュー名 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="カット＆カラー"
              />
            </div>

            {/* カテゴリー */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリー <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`block w-full rounded-lg border px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">カテゴリーを選択</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

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

            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="シャンプー・ブロー込み"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={createMenu.isPending || updateMenu.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? '更新する' : '登録する'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuEditModal;