import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Move, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

interface Category {
  id: string;
  name: string;
  displayOrder: number;
  color: string;
  icon?: string;
}

interface MenuCategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuCategoryManager: React.FC<MenuCategoryManagerProps> = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'カット', displayOrder: 1, color: '#3B82F6' },
    { id: '2', name: 'カラー', displayOrder: 2, color: '#10B981' },
    { id: '3', name: 'パーマ', displayOrder: 3, color: '#F59E0B' },
    { id: '4', name: 'トリートメント', displayOrder: 4, color: '#8B5CF6' },
    { id: '5', name: 'スパ', displayOrder: 5, color: '#EC4899' },
    { id: '6', name: 'セット', displayOrder: 6, color: '#6366F1' },
    { id: '7', name: 'その他', displayOrder: 7, color: '#6B7280' },
  ]);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('カテゴリー名を入力してください');
      return;
    }

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      displayOrder: categories.length + 1,
      color: newCategoryColor,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
    setShowAddForm(false);
    toast.success('カテゴリーを追加しました');
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    ));
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('このカテゴリーを削除してもよろしいですか？')) {
      setCategories(categories.filter(cat => cat.id !== id));
      toast.success('カテゴリーを削除しました');
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(fromIndex, 1);
    newCategories.splice(toIndex, 0, movedItem);
    
    // Update display orders
    const reorderedCategories = newCategories.map((cat, index) => ({
      ...cat,
      displayOrder: index + 1,
    }));
    
    setCategories(reorderedCategories);
  };

  const handleSave = async () => {
    try {
      // Save categories logic here
      toast.success('カテゴリー設定を保存しました');
      onClose();
    } catch (error) {
      toast.error('保存に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">カテゴリー管理</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* カテゴリーリスト */}
          <Card>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">カテゴリー一覧</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        カテゴリー名
                      </label>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="新規カテゴリー"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        カラー
                      </label>
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                    <Button onClick={handleAddCategory}>追加</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewCategoryName('');
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}

              {/* Category List */}
              <div className="space-y-2">
                {categories.sort((a, b) => a.displayOrder - b.displayOrder).map((category, index) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <button className="cursor-move p-1 text-gray-400 hover:text-gray-600">
                        <Move className="h-4 w-4" />
                      </button>
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      {editingCategory?.id === category.id ? (
                        <Input
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({
                            ...editingCategory,
                            name: e.target.value,
                          })}
                          className="w-48"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{category.name}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingCategory?.id === category.id ? (
                        <>
                          <button
                            onClick={() => {
                              handleUpdateCategory(category.id, { name: editingCategory.name });
                              setEditingCategory(null);
                              toast.success('カテゴリー名を更新しました');
                            }}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Category Settings */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">カテゴリー設定</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                    defaultChecked
                  />
                  <span className="text-sm text-gray-700">
                    予約時にカテゴリーを表示する
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                    defaultChecked
                  />
                  <span className="text-sm text-gray-700">
                    カテゴリーごとに色分けする
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                  />
                  <span className="text-sm text-gray-700">
                    カテゴリーアイコンを使用する
                  </span>
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存する
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuCategoryManager;