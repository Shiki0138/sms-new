import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  Tag,
  Clock,
  Calendar,
  Globe,
  Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { useCreateMenu } from '../../hooks/useCreateMenu';
import { useUpdateMenu } from '../../hooks/useUpdateMenu';
import { TreatmentMenu } from '../../types/treatment';

interface MenuEditModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  menu?: TreatmentMenu | null;
}

const MenuEditModalEnhanced: React.FC<MenuEditModalEnhancedProps> = ({
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
    image_url: '',
    is_online_bookable: true,
    is_featured: false,
    min_advance_booking_hours: 24,
    max_advance_booking_days: 30,
    tags: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (menu) {
      setFormData({
        name: menu.name,
        price: menu.price.toString(),
        duration_minutes: menu.duration_minutes,
        description: menu.description || '',
        category: menu.category,
        image_url: menu.image_url || '',
        is_online_bookable: menu.is_online_bookable ?? true,
        is_featured: menu.is_featured ?? false,
        min_advance_booking_hours: menu.min_advance_booking_hours || 24,
        max_advance_booking_days: menu.max_advance_booking_days || 30,
        tags: menu.tags || [],
      });
      setImagePreview(menu.image_url || null);
    } else {
      setFormData({
        name: '',
        price: '',
        duration_minutes: 60,
        description: '',
        category: '',
        image_url: '',
        is_online_bookable: true,
        is_featured: false,
        min_advance_booking_hours: 24,
        max_advance_booking_days: 30,
        tags: [],
      });
      setImagePreview(null);
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
        image_url: formData.image_url,
        is_online_bookable: formData.is_online_bookable,
        is_featured: formData.is_featured,
        min_advance_booking_hours: formData.min_advance_booking_hours,
        max_advance_booking_days: formData.max_advance_booking_days,
        tags: formData.tags,
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
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              基本情報
            </button>
            <button
              onClick={() => setActiveTab('display')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'display'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              表示設定
            </button>
            <button
              onClick={() => setActiveTab('booking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'booking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              予約設定
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メニュー画像
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Menu preview"
                            className="mx-auto h-48 w-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData(prev => ({ ...prev, image_url: '' }));
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                              <span>画像をアップロード</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleImageUpload}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display Settings Tab */}
          {activeTab === 'display' && (
            <div className="space-y-6">
              <Card>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-4">表示オプション</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_featured"
                        checked={formData.is_featured}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">おすすめメニューとして表示</span>
                        <p className="text-xs text-gray-500">トップページや予約画面で優先的に表示されます</p>
                      </div>
                    </label>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-4">タグ設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="タグを入力"
                        className="flex-1"
                      />
                      <Button type="button" onClick={addTag} size="sm">
                        追加
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      検索や分類に使用されるタグを設定できます
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Booking Settings Tab */}
          {activeTab === 'booking' && (
            <div className="space-y-6">
              <Card>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-4">オンライン予約設定</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_online_bookable"
                        checked={formData.is_online_bookable}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">オンライン予約を許可</span>
                        <p className="text-xs text-gray-500">お客様がオンラインでこのメニューを予約できるようになります</p>
                      </div>
                    </label>

                    {formData.is_online_bookable && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            最小予約受付時間（時間前）
                          </label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              name="min_advance_booking_hours"
                              value={formData.min_advance_booking_hours}
                              onChange={handleChange}
                              min="0"
                              max="168"
                            />
                            <span className="text-gray-600">時間前まで</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            予約可能な最短時間を設定します（例：24時間前まで）
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            最大予約受付期間（日後）
                          </label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              name="max_advance_booking_days"
                              value={formData.max_advance_booking_days}
                              onChange={handleChange}
                              min="1"
                              max="365"
                            />
                            <span className="text-gray-600">日後まで</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            予約可能な最長期間を設定します（例：30日後まで）
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Actions */}
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

export default MenuEditModalEnhanced;