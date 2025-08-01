import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Archive, 
  Tag, 
  DollarSign, 
  Users, 
  Copy,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface MenuBulkActionsProps {
  selectedMenus: string[];
  onComplete: () => void;
}

const MenuBulkActions: React.FC<MenuBulkActionsProps> = ({ selectedMenus, onComplete }) => {
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [priceAdjustment, setPriceAdjustment] = useState({ type: 'percentage', value: 0 });
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleBulkAction = async (action: string) => {
    try {
      switch (action) {
        case 'activate':
          // Activate selected menus
          toast.success(`${selectedMenus.length}件のメニューを有効化しました`);
          break;
        case 'deactivate':
          // Deactivate selected menus
          toast.success(`${selectedMenus.length}件のメニューを無効化しました`);
          break;
        case 'archive':
          if (window.confirm(`${selectedMenus.length}件のメニューをアーカイブしますか？`)) {
            // Archive selected menus
            toast.success(`${selectedMenus.length}件のメニューをアーカイブしました`);
          }
          break;
        case 'delete':
          if (window.confirm(`${selectedMenus.length}件のメニューを削除しますか？この操作は取り消せません。`)) {
            // Delete selected menus
            toast.success(`${selectedMenus.length}件のメニューを削除しました`);
          }
          break;
        case 'duplicate':
          // Duplicate selected menus
          toast.success(`${selectedMenus.length}件のメニューを複製しました`);
          break;
      }
      onComplete();
    } catch (error) {
      toast.error('操作に失敗しました');
    }
  };

  const handlePriceAdjustment = () => {
    if (priceAdjustment.value === 0) {
      toast.error('価格調整値を入力してください');
      return;
    }

    // Apply price adjustment
    const adjustmentText = priceAdjustment.type === 'percentage' 
      ? `${priceAdjustment.value}%` 
      : `¥${priceAdjustment.value}`;
    toast.success(`${selectedMenus.length}件のメニューの価格を${adjustmentText}調整しました`);
    setShowPriceModal(false);
    onComplete();
  };

  const handleCategoryChange = () => {
    if (!selectedCategory) {
      toast.error('カテゴリーを選択してください');
      return;
    }

    // Change category
    toast.success(`${selectedMenus.length}件のメニューのカテゴリーを変更しました`);
    setShowCategoryModal(false);
    onComplete();
  };

  const categories = [
    'カット',
    'カラー',
    'パーマ',
    'トリートメント',
    'スパ',
    'セット',
    'その他',
  ];

  return (
    <>
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <span className="font-medium text-gray-900">
                {selectedMenus.length}件のメニューを選択中
              </span>
            </div>
            <button
              onClick={onComplete}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowPriceModal(true)}
            >
              <DollarSign className="h-4 w-4 mr-1" />
              価格一括変更
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowCategoryModal(true)}
            >
              <Tag className="h-4 w-4 mr-1" />
              カテゴリー変更
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkAction('duplicate')}
            >
              <Copy className="h-4 w-4 mr-1" />
              複製
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkAction('activate')}
            >
              <ToggleRight className="h-4 w-4 mr-1" />
              有効化
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkAction('deactivate')}
            >
              <ToggleLeft className="h-4 w-4 mr-1" />
              無効化
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleBulkAction('archive')}
            >
              <Archive className="h-4 w-4 mr-1" />
              アーカイブ
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              削除
            </Button>
          </div>
        </div>
      </Card>

      {/* Price Adjustment Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">価格一括変更</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  調整方法
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPriceAdjustment({ ...priceAdjustment, type: 'percentage' })}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      priceAdjustment.type === 'percentage'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    パーセント
                  </button>
                  <button
                    onClick={() => setPriceAdjustment({ ...priceAdjustment, type: 'fixed' })}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      priceAdjustment.type === 'fixed'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    固定額
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {priceAdjustment.type === 'percentage' ? '調整率（%）' : '調整額（円）'}
                </label>
                <input
                  type="number"
                  value={priceAdjustment.value}
                  onChange={(e) => setPriceAdjustment({ ...priceAdjustment, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={priceAdjustment.type === 'percentage' ? '例: 10, -5' : '例: 500, -200'}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {priceAdjustment.type === 'percentage' 
                    ? 'プラスで値上げ、マイナスで値下げ'
                    : 'プラスで加算、マイナスで減算'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowPriceModal(false)}>
                キャンセル
              </Button>
              <Button onClick={handlePriceAdjustment}>
                適用する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Change Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">カテゴリー一括変更</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新しいカテゴリー
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">カテゴリーを選択</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCategoryChange}>
                変更する
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuBulkActions;