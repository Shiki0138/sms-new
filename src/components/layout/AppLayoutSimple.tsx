import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  Menu,
  X,
  LogOut,
  MessageCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import BottomNavigation from './BottomNavigation';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: '顧客管理', href: '/customers', icon: Users },
  { name: '予約管理', href: '/reservations', icon: Calendar },
  { name: 'メッセージ', href: '/messages', icon: MessageCircle },
  { name: '設定', href: '/settings', icon: Settings },
];

const AppLayoutSimple: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  // useAuthは必ずAuthProvider内で使用する必要がある
  const { tenant, user, logout } = useAuth();
  const isDev = import.meta.env.DEV;

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // サイドバーを閉じる
  const closeSidebar = () => {
    setSidebarOpen(false);
    // 軽い振動効果（サポートされている場合）
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50">
      {/* モバイルサイドバー */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          />
          <div className="fixed inset-y-0 left-0 flex w-80 flex-col bg-white shadow-2xl transform transition-transform">
            <div className="flex h-16 items-center justify-between px-6 bg-gradient-to-r from-purple-500 to-blue-500">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  {tenant?.name || 'サロン管理'}
                </h2>
              </div>
              <button
                onClick={closeSidebar}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-4 py-4 text-base font-medium rounded-xl transition-all min-h-[44px] ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                    onClick={closeSidebar}
                  >
                    <div
                      className={`p-2 rounded-lg mr-4 ${
                        isActive
                          ? 'bg-purple-200'
                          : 'bg-gray-200 group-hover:bg-gray-300'
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 ${
                          isActive ? 'text-purple-600' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    {item.name}
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-purple-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* モバイル専用ユーザー情報 */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <div className="h-10 w-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500">オーナー</p>
                </div>
                {!isDev && (
                  <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* デスクトップサイドバー */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200 shadow-lg">
          <div className="flex h-16 items-center justify-between px-6 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {tenant?.name || 'サロン管理'}
              </h2>
            </div>
            {isDev && (
              <span className="text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full font-medium">
                開発
              </span>
            )}
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full" />
                  )}
                  <div
                    className={`p-2 rounded-lg mr-4 ${
                      isActive
                        ? 'bg-purple-200'
                        : 'bg-gray-200 group-hover:bg-gray-300'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${
                        isActive
                          ? 'text-purple-600'
                          : 'text-gray-500 group-hover:text-gray-700'
                      }`}
                    />
                  </div>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">サロンオーナー</p>
              </div>
              {!isDev && (
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="lg:pl-72">
        {/* モバイルヘッダー */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 lg:hidden shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {tenant?.name || 'サロン管理'}
              </h1>
            </div>
            <div className="w-[44px]" /> {/* バランス用のスペーサー */}
          </div>
        </div>

        {/* ページコンテンツ */}
        <main className="flex-1 min-h-screen">
          <div className="h-full">
            <Outlet />
          </div>
        </main>

        {/* フローティングアクションボタン - モバイル専用 */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-30">
            <button
              onClick={() => {
                // 新規予約画面に遷移（実装予定）
                console.log('新規予約を追加');
              }}
              className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transform transition-all hover:scale-110"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* モバイル専用ボトムナビゲーション */}
        {isMobile && <BottomNavigation />}
      </div>
    </div>
  );
};

export default AppLayoutSimple;
