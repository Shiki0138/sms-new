import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';
import { useMessages } from '../../hooks/useMessages';
import { useReservations } from '../../hooks/useReservations';

interface NavItem {
  icon: React.ElementType;
  activeIcon: React.ElementType;
  label: string;
  path: string;
  badge?: number | null;
}

export default function MobileBottomNavigation() {
  const location = useLocation();
  const { messages } = useMessages();
  const { reservations } = useReservations();

  // 未読メッセージ数を計算
  const unreadMessagesCount = messages?.filter(m => !m.is_read && m.direction === 'received').length || 0;

  // 今日の予約数を計算
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayReservationsCount = reservations?.filter(r => {
    const startTime = new Date(r.start_time);
    return startTime >= today && startTime < tomorrow && r.status !== 'CANCELLED';
  }).length || 0;

  const navItems: NavItem[] = [
    {
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
      label: 'ホーム',
      path: '/dashboard',
      badge: null,
    },
    {
      icon: CalendarDaysIcon,
      activeIcon: CalendarDaysIconSolid,
      label: '予約',
      path: '/reservations',
      badge: todayReservationsCount > 0 ? todayReservationsCount : null,
    },
    {
      icon: UserGroupIcon,
      activeIcon: UserGroupIconSolid,
      label: '顧客',
      path: '/customers',
      badge: null,
    },
    {
      icon: ChatBubbleOvalLeftEllipsisIcon,
      activeIcon: ChatBubbleOvalLeftEllipsisIconSolid,
      label: 'メッセージ',
      path: '/messages',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
    },
    {
      icon: Cog6ToothIcon,
      activeIcon: Cog6ToothIconSolid,
      label: '設定',
      path: '/settings',
      badge: null,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* スペーサー（ボトムナビの高さ分） */}
      <div className="h-16 md:hidden" />

      {/* ボトムナビゲーション本体 */}
      <nav className="
        fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-gray-200
        pb-safe md:hidden
        shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
      ">
        <div className="flex justify-around items-stretch">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = active ? item.activeIcon : item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="
                  relative flex flex-col items-center justify-center
                  min-h-[60px] min-w-[60px] flex-1
                  text-gray-600 hover:text-primary-600
                  active:bg-gray-50 transition-all duration-200
                  touch-manipulation select-none
                "
              >
                {/* アクティブ状態のインジケーター */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-500 rounded-b-full"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>

                {/* アイコンとバッジ */}
                <div className="relative mb-1">
                  <Icon 
                    className={`
                      h-6 w-6 transition-all duration-200
                      ${active ? 'text-primary-600 scale-110' : 'text-gray-600'}
                    `}
                  />
                  
                  {/* バッジ */}
                  {item.badge !== null && item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="
                        absolute -top-2 -right-2
                        bg-red-500 text-white text-xs font-medium
                        rounded-full h-5 min-w-[20px] px-1
                        flex items-center justify-center
                        shadow-sm
                      "
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                </div>

                {/* ラベル */}
                <span className={`
                  text-xs font-medium transition-all duration-200
                  ${active ? 'text-primary-600' : 'text-gray-600'}
                `}>
                  {item.label}
                </span>

                {/* タップフィードバック */}
                <span className="absolute inset-0 rounded-lg overflow-hidden">
                  <span className="
                    absolute inset-0 bg-gray-200 opacity-0
                    active:opacity-20 transition-opacity duration-200
                  " />
                </span>
              </Link>
            );
          })}
        </div>

        {/* iPhone X以降のホームインジケーター対応 */}
        <div className="h-safe-bottom bg-white" />
      </nav>
    </>
  );
}

// タブバーを非表示にするパスを管理するコンポーネント
export const MobileNavVisibilityProvider: React.FC<{
  children: React.ReactNode;
  hiddenPaths?: string[];
}> = ({ children, hiddenPaths = [] }) => {
  const location = useLocation();
  
  const shouldHide = hiddenPaths.some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <>
      {children}
      {!shouldHide && <MobileBottomNavigation />}
    </>
  );
};