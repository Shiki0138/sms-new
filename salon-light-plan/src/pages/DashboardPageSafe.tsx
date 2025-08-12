import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Sparkles,
  Clock,
  Heart,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import { animations } from '../styles/design-system';
import ErrorBoundary from '../components/ErrorBoundary';

const DashboardPage: React.FC = () => {
  // 統計カードのデザイン設定（固定値を使用）
  const statsCards = [
    {
      title: '本日の予約',
      value: 0,
      unit: '件',
      icon: Calendar,
      gradient: 'bg-gradient-to-br from-primary-400 to-primary-600',
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      title: '登録顧客数',
      value: 0,
      limit: 100,
      unit: '名',
      icon: Users,
      gradient: 'bg-gradient-to-br from-secondary-400 to-secondary-600',
      iconBg: 'bg-secondary-100',
      iconColor: 'text-secondary-600',
    },
    {
      title: '今月の予約',
      value: 0,
      limit: 50,
      unit: '件',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-tertiary-400 to-tertiary-600',
      iconBg: 'bg-tertiary-100',
      iconColor: 'text-tertiary-600',
    },
  ];

  const quickActions = [
    {
      title: '予約を追加',
      description: '新しい予約を登録',
      icon: Plus,
      href: '/reservations',
      color: 'primary',
    },
    {
      title: '顧客管理',
      description: '顧客情報を管理',
      icon: Users,
      href: '/customers',
      color: 'secondary',
    },
    {
      title: 'メッセージ',
      description: 'メッセージを確認',
      icon: Heart,
      href: '/messages',
      color: 'tertiary',
    },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {/* ヘッダー */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={animations.spring.gentle}
          >
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <span>ダッシュボード</span>
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {format(new Date(), 'yyyy年M月d日')}の営業状況
            </p>
          </motion.div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                ...animations.spring.gentle,
              }}
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden rounded-2xl shadow-lg"
            >
              <div className={`${stat.gradient} p-6`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white/90 text-sm font-medium">
                      {stat.title}
                    </p>
                    <div className="mt-2 flex items-baseline space-x-1">
                      <p className="text-3xl font-bold text-white">
                        {stat.value}
                      </p>
                      <span className="text-white/80 text-sm">{stat.unit}</span>
                      {stat.limit && (
                        <span className="text-white/60 text-sm">
                          / {stat.limit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`${stat.iconBg} p-3 rounded-xl`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* クイックアクション */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <span>クイックアクション</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.05,
                  ...animations.spring.bouncy,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to={action.href}
                  className={`block p-6 rounded-xl border-2 border-${action.color}-200 hover:border-${action.color}-300 bg-white hover:shadow-lg transition-all`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-${action.color}-100`}>
                      <action.icon
                        className={`h-6 w-6 text-${action.color}-600`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* お知らせ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...animations.spring.gentle }}
          className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-6 border border-primary-200"
        >
          <div className="flex items-center space-x-3 mb-3">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">今日のヒント</h3>
          </div>
          <p className="text-gray-700">
            定期的にお客様にメッセージを送ることで、リピート率が向上します。
            メッセージ機能を活用して、お客様との関係を深めましょう！
          </p>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;
