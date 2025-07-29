import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { animations } from '../../styles/design-system';
import PlanLimitWarning from './PlanLimitWarning';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { useAuth } from '../../hooks/useAuth';

const navigation = [
  {
    name: 'ダッシュボード',
    href: '/',
    icon: HomeIcon,
  },
  {
    name: '予約管理',
    href: '/reservations',
    icon: CalendarDaysIcon,
  },
  {
    name: '顧客管理',
    href: '/customers',
    icon: UserGroupIcon,
  },
  {
    name: 'メッセージ',
    href: '/messages',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: '設定',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
];

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className = '' }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { tenant } = useAuth();

  // プラン制限管理
  const { planStatus, warnings } = usePlanLimits(tenant?.id || '');

  const handleUpgrade = () => {
    console.log('プランアップグレード処理');
    // 実際の実装では決済ページに遷移
  };

  const dismissWarning = (index: number) => {
    console.log('警告を非表示:', index);
    // 実際の実装では警告の非表示状態を保存
  };

  return (
    <>
      {/* デスクトップナビゲーション */}
      <nav
        className={`hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 ${className}`}
      >
        <div className="flex flex-col h-full">
          {/* ロゴ */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg"></div>
              <span className="font-bold text-xl text-gray-800">
                Salon Light
              </span>
            </div>
          </div>

          {/* プラン情報 */}
          {planStatus && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {planStatus.planType.charAt(0).toUpperCase() +
                      planStatus.planType.slice(1)}
                    プラン
                  </div>
                  <div className="text-xs text-gray-600">¥4,980/月</div>
                </div>
                <CreditCardIcon className="h-5 w-5 text-gray-400" />
              </div>

              {/* 利用状況 */}
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">顧客</span>
                  <span className="text-gray-800">
                    {planStatus.currentUsage.totalCustomers}/
                    {planStatus.limits.customerLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-primary-500 h-1 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (planStatus.currentUsage.totalCustomers / planStatus.limits.customerLimit) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* ナビゲーションメニュー */}
          <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.name} to={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 ${
                        isActive
                          ? 'text-primary-600'
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                    {item.name}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* プラン制限警告 */}
          {warnings.length > 0 && (
            <div className="px-4 pb-4">
              <PlanLimitWarning
                warnings={warnings}
                onUpgrade={handleUpgrade}
                onDismiss={dismissWarning}
              />
            </div>
          )}

          {/* フッター */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © 2024 Salon Light Plan
            </div>
          </div>
        </div>
      </nav>

      {/* モバイルナビゲーション */}
      <div className="lg:hidden">
        {/* モバイルヘッダー */}
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg"></div>
            <span className="font-bold text-xl text-gray-800">Salon Light</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <Bars3Icon className="h-6 w-6" />
          </motion.button>
        </div>

        {/* モバイルメニューオーバーレイ */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={animations.spring.smooth}
                className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50"
              >
                <div className="flex flex-col h-full">
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg"></div>
                      <span className="font-bold text-xl text-gray-800">
                        Salon Light
                      </span>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </motion.button>
                  </div>

                  {/* プラン情報 */}
                  {planStatus && (
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {planStatus.planType.charAt(0).toUpperCase() +
                              planStatus.planType.slice(1)}
                            プラン
                          </div>
                          <div className="text-xs text-gray-600">¥4,980/月</div>
                        </div>
                        <CreditCardIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  )}

                  {/* ナビゲーションメニュー */}
                  <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {navigation.map((item, index) => {
                      const isActive = location.pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: index * 0.05,
                              ...animations.spring.gentle,
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                              isActive
                                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                            }`}
                          >
                            <Icon
                              className={`mr-3 h-5 w-5 ${
                                isActive
                                  ? 'text-primary-600'
                                  : 'text-gray-400 group-hover:text-gray-600'
                              }`}
                            />
                            {item.name}
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* プラン制限警告 */}
                  {warnings.length > 0 && (
                    <div className="px-4 pb-4">
                      <PlanLimitWarning
                        warnings={warnings.slice(0, 1)} // モバイルでは1つだけ表示
                        onUpgrade={handleUpgrade}
                        onDismiss={dismissWarning}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
