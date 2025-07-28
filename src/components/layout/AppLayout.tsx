import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { animations } from '../../styles/design-system';
import BottomNavigation from './BottomNavigation';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: '顧客管理', href: '/customers', icon: Users },
  { name: '予約管理', href: '/reservations', icon: Calendar },
  { name: 'メッセージ', href: '/messages', icon: MessageCircle },
  { name: '設定', href: '/settings', icon: Settings },
];

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
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

  // サイドバーを閉じる際のハプティックフィードバック（擬似）
  const closeSidebar = () => {
    setSidebarOpen(false);
    // 軽い振動効果（サポートされている場合）
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-gray-50 to-secondary-50">
      {/* モバイルサイドバー - アニメーション対応 */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={animations.spring.gentle}
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
              onClick={closeSidebar}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={animations.spring.smooth}
              className="fixed inset-y-0 left-0 flex w-80 flex-col bg-white shadow-2xl"
            >
              <div className="flex h-header items-center justify-between px-6 bg-gradient-to-r from-primary-500 to-secondary-500">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {tenant?.name || 'サロン管理'}
                  </h2>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={closeSidebar}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors min-w-touch min-h-touch flex items-center justify-center"
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>
              
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item, index) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                    >
                      <Link
                        to={item.href}
                        className={`group flex items-center px-4 py-4 text-base font-medium rounded-xl transition-all min-h-touch ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-700 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                        onClick={closeSidebar}
                      >
                        <div className={`p-2 rounded-lg mr-4 ${
                          isActive ? 'bg-primary-200' : 'bg-gray-200 group-hover:bg-gray-300'
                        }`}>
                          <item.icon className={`h-5 w-5 ${
                            isActive ? 'text-primary-600' : 'text-gray-500'
                          }`} />
                        </div>
                        {item.name}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="ml-auto w-2 h-2 bg-primary-500 rounded-full"
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
              
              {/* モバイル専用ユーザー情報 */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                  <div className="h-10 w-10 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
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
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={logout}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors min-w-touch min-h-touch flex items-center justify-center"
                    >
                      <LogOut className="h-5 w-5" />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* デスクトップサイドバー - エレガントデザイン */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200 shadow-elegant">
          <div className="flex h-header items-center justify-between px-6 bg-gradient-to-r from-primary-50 to-secondary-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-xl">
                <Sparkles className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
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
                <motion.div
                  key={item.name}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={animations.spring.gentle}
                >
                  <Link
                    to={item.href}
                    className={`group flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-100 to-secondary-100 text-primary-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktopActiveTab"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-secondary-500 rounded-r-full"
                      />
                    )}
                    <div className={`p-2 rounded-lg mr-4 ${
                      isActive ? 'bg-primary-200' : 'bg-gray-200 group-hover:bg-gray-300'
                    }`}>
                      <item.icon className={`h-5 w-5 ${
                        isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
                      }`} />
                    </div>
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
          
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="h-12 w-12 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">サロンオーナー</p>
              </div>
              {!isDev && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="h-5 w-5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="lg:pl-72">
        {/* モバイルヘッダー - エレガントデザイン */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 lg:hidden shadow-sm">
          <div className="flex h-header items-center justify-between px-6 safe-top">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all min-w-touch min-h-touch flex items-center justify-center"
            >
              <Menu className="h-6 w-6" />
            </motion.button>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary-600" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                {tenant?.name || 'サロン管理'}
              </h1>
            </div>
            <div className="w-touch" /> {/* バランス用のスペーサー */}
          </div>
        </div>

        {/* ページコンテンツ */}
        <main className="flex-1 min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={animations.spring.gentle}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
        
        {/* フローティングアクションボタン - モバイル専用 */}
        {isMobile && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, ...animations.spring.smooth }}
            className="fixed bottom-6 right-6 z-30"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                // 新規予約画面に遷移（実装予定）
                console.log('新規予約を追加');
              }}
              className="w-fab h-fab bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full shadow-elegant flex items-center justify-center"
            >
              <Plus className="h-6 w-6" />
            </motion.button>
          </motion.div>
        )}
        
        {/* モバイル専用ボトムナビゲーション */}
        {isMobile && <BottomNavigation />}
      </div>
    </div>
  );
};

export default AppLayout;