import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useTreatmentMenus } from '../../hooks/useTreatmentMenus';
import MenuEditModal from '../../components/menus/MenuEditModal';

const MenuManagePage: React.FC = () => {
  const { data: menus, isLoading } = useTreatmentMenus();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);

  const handleAddMenu = () => {
    setEditingMenu(null);
    setShowEditModal(true);
  };

  const handleEditMenu = (menu: any) => {
    setEditingMenu(menu);
    setShowEditModal(true);
  };

  const groupedMenus = menus?.reduce((acc, menu) => {
    const category = menu.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const categories = Object.keys(groupedMenus);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">メニュー管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              施術メニューの登録・編集・削除を行います
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={handleAddMenu}>
              <Plus className="h-4 w-4 mr-2" />
              新規メニュー追加
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : categories.length > 0 ? (
        <div className="space-y-6">
          {categories.map(category => (
            <Card key={category}>
              <h2 className="text-lg font-medium text-gray-900 mb-4">{category}</h2>
              <div className="space-y-3">
                {groupedMenus[category].map(menu => (
                  <div
                    key={menu.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{menu.name}</h3>
                        <span className="text-lg font-semibold text-gray-900">
                          ¥{menu.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>施術時間: {menu.duration_minutes}分</span>
                        {menu.description && <span>{menu.description}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditMenu(menu)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          // TODO: 削除機能の実装
                          toast('削除機能は開発中です');
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Package}
            title="メニューが登録されていません"
            description="施術メニューを登録して、予約や施術記録で使用できるようにしましょう"
            action={
              <Button onClick={handleAddMenu}>
                <Plus className="h-4 w-4 mr-2" />
                最初のメニューを登録
              </Button>
            }
          />
        </Card>
      )}

      {/* メニュー編集モーダル */}
      <MenuEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        menu={editingMenu}
      />
    </div>
  );
};

export default MenuManagePage;