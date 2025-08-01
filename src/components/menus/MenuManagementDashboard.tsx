import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  DollarSign, 
  Clock, 
  Users, 
  Image as ImageIcon,
  Star,
  MoreVertical,
  Copy,
  Archive,
  TrendingUp,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { useTreatmentMenus } from '../../hooks/useTreatmentMenus';
import { useDeleteMenu } from '../../hooks/useDeleteMenu';
import { useBulkMenuOperations } from '../../hooks/useBulkMenuOperations';
import { useMenuAnalytics } from '../../hooks/useMenuAnalytics';
import MenuEditModalEnhanced from './MenuEditModalEnhanced';
import MenuCategoryManager from './MenuCategoryManager';
import MenuPricingOptions from './MenuPricingOptions';
import MenuStaffAssignment from './MenuStaffAssignment';
import MenuBulkActions from './MenuBulkActions';
import { TreatmentMenu } from '../../types/treatment';

interface MenuManagementDashboardProps {
  onMenuSelect?: (menu: TreatmentMenu) => void;
}

const MenuManagementDashboard: React.FC<MenuManagementDashboardProps> = ({ onMenuSelect }) => {
  const { data: menus, isLoading } = useTreatmentMenus();
  const deleteMenu = useDeleteMenu();
  const bulkOperations = useBulkMenuOperations();
  const { data: analytics } = useMenuAnalytics();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<TreatmentMenu | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleAddMenu = () => {
    setEditingMenu(null);
    setShowEditModal(true);
  };

  const handleEditMenu = (menu: TreatmentMenu) => {
    setEditingMenu(menu);
    setShowEditModal(true);
  };

  const handleDuplicateMenu = (menu: TreatmentMenu) => {
    const duplicatedMenu = {
      ...menu,
      id: undefined,
      name: `${menu.name} (コピー)`,
    };
    setEditingMenu(duplicatedMenu as any);
    setShowEditModal(true);
  };

  const handleArchiveMenu = async (menuId: string) => {
    if (window.confirm('このメニューをアーカイブしますか？')) {
      try {
        await deleteMenu.mutateAsync(menuId);
      } catch (error) {
        console.error('Archive error:', error);
      }
    }
  };

  const handleMenuAction = (action: string, menu: TreatmentMenu) => {
    switch (action) {
      case 'edit':
        handleEditMenu(menu);
        break;
      case 'duplicate':
        handleDuplicateMenu(menu);
        break;
      case 'archive':
        handleArchiveMenu(menu.id);
        break;
      case 'pricing':
        setEditingMenu(menu);
        setShowPricingModal(true);
        break;
      case 'staff':
        setEditingMenu(menu);
        setShowStaffModal(true);
        break;
    }
  };

  const groupedMenus = menus?.reduce((acc, menu) => {
    const category = menu.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, TreatmentMenu[]>) || {};

  const categories = ['all', ...Object.keys(groupedMenus)];
  
  const filteredMenus = selectedCategory === 'all' 
    ? menus || []
    : groupedMenus[selectedCategory] || [];

  const popularMenus = menus?.filter(menu => menu.popularity_score && menu.popularity_score > 80) || [];
  
  // Extend menus with analytics data
  const menusWithAnalytics = menus?.map(menu => {
    const menuAnalytics = analytics?.find(a => a.menuId === menu.id);
    return {
      ...menu,
      booking_count: menuAnalytics?.bookingCount || menu.booking_count || 0,
      revenue: menuAnalytics?.revenue || 0,
      trendDirection: menuAnalytics?.trendDirection || 'stable' as const,
      trendPercentage: menuAnalytics?.trendPercentage || 0,
    };
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">メニュー管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              施術メニューの登録・編集・価格設定を管理します
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Button variant="secondary" onClick={() => setShowCategoryModal(true)}>
              <Tag className="h-4 w-4 mr-2" />
              カテゴリー管理
            </Button>
            <Button onClick={handleAddMenu}>
              <Plus className="h-4 w-4 mr-2" />
              新規メニュー追加
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">総メニュー数</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{menus?.length || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">アクティブ</p>
            <p className="mt-1 text-2xl font-semibold text-blue-900">
              {menus?.filter(m => m.is_active).length || 0}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">人気メニュー</p>
            <p className="mt-1 text-2xl font-semibold text-green-900">{popularMenus.length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">平均単価</p>
            <p className="mt-1 text-2xl font-semibold text-purple-900">
              ¥{menus && menus.length > 0 
                ? Math.round(menus.reduce((sum, m) => sum + m.price, 0) / menus.length).toLocaleString()
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900">カテゴリー別表示</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'すべて' : category}
                <span className="ml-2 text-xs">
                  ({category === 'all' ? menus?.length || 0 : groupedMenus[category]?.length || 0})
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedMenus.length > 0 && (
        <MenuBulkActions
          selectedMenus={selectedMenus}
          onComplete={() => setSelectedMenus([])}
        />
      )}

      {/* Menu Grid/List */}
      {isLoading ? (
        <Card>
          <div className="p-6">
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
          </div>
        </Card>
      ) : filteredMenus.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenus.map(menu => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onAction={handleMenuAction}
                isSelected={selectedMenus.includes(menu.id)}
                onToggleSelect={(id) => {
                  setSelectedMenus(prev => 
                    prev.includes(id) 
                      ? prev.filter(m => m !== id)
                      : [...prev, id]
                  );
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-gray-200">
              {filteredMenus.map(menu => (
                <MenuListItem
                  key={menu.id}
                  menu={menu}
                  onAction={handleMenuAction}
                  isSelected={selectedMenus.includes(menu.id)}
                  onToggleSelect={(id) => {
                    setSelectedMenus(prev => 
                      prev.includes(id) 
                        ? prev.filter(m => m !== id)
                        : [...prev, id]
                    );
                  }}
                />
              ))}
            </div>
          </Card>
        )
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

      {/* Modals */}
      <MenuEditModalEnhanced
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        menu={editingMenu}
      />

      {editingMenu && (
        <>
          <MenuPricingOptions
            isOpen={showPricingModal}
            onClose={() => setShowPricingModal(false)}
            menu={editingMenu}
          />
          <MenuStaffAssignment
            isOpen={showStaffModal}
            onClose={() => setShowStaffModal(false)}
            menu={editingMenu}
          />
        </>
      )}

      <MenuCategoryManager
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  );
};

// Menu Card Component
const MenuCard: React.FC<{
  menu: TreatmentMenu;
  onAction: (action: string, menu: TreatmentMenu) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}> = ({ menu, onAction, isSelected, onToggleSelect }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(menu.id)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <div>
              <h3 className="font-medium text-gray-900">{menu.name}</h3>
              <p className="text-sm text-gray-500">{menu.category}</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    onAction('edit', menu);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  編集
                </button>
                <button
                  onClick={() => {
                    onAction('duplicate', menu);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  複製
                </button>
                <button
                  onClick={() => {
                    onAction('pricing', menu);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  価格設定
                </button>
                <button
                  onClick={() => {
                    onAction('staff', menu);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                >
                  <Users className="h-4 w-4 mr-2" />
                  スタッフ設定
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    onAction('archive', menu);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-red-600"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  アーカイブ
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">
              ¥{menu.price.toLocaleString()}
            </span>
            {menu.popularity_score && menu.popularity_score > 80 && (
              <span className="flex items-center text-yellow-500 text-sm">
                <Star className="h-4 w-4 mr-1 fill-current" />
                人気
              </span>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {menu.duration_minutes}分
            </span>
            {menu.booking_count && (
              <span className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                {menu.booking_count}回
              </span>
            )}
          </div>

          {menu.description && (
            <p className="text-sm text-gray-600 mt-2">{menu.description}</p>
          )}

          {menu.image_url && (
            <div className="mt-3">
              <img
                src={menu.image_url}
                alt={menu.name}
                className="w-full h-32 object-cover rounded"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Menu List Item Component
const MenuListItem: React.FC<{
  menu: TreatmentMenu;
  onAction: (action: string, menu: TreatmentMenu) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}> = ({ menu, onAction, isSelected, onToggleSelect }) => {
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(menu.id)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <div>
            <h3 className="font-medium text-gray-900">{menu.name}</h3>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-500">{menu.category}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{menu.duration_minutes}分</span>
              {menu.description && (
                <>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{menu.description}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-lg font-semibold text-gray-900">
            ¥{menu.price.toLocaleString()}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAction('edit', menu)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onAction('archive', menu)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuManagementDashboard;