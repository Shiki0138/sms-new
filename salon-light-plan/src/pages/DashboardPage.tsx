import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useCustomers } from '../hooks/useCustomers';
import { useReservations } from '../hooks/useReservations';
import {
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Sparkles,
  Clock,
  Heart,
  Star,
  Phone,
  Mail,
  Scissors,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { animations } from '../styles/design-system';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { customers = [] } = useCustomers();

  // 今日の予約を取得
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayReservations } = useReservations(today, today);

  // 今月の予約と施術記録を取得
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: monthReservations } = useReservations(monthStart, monthEnd);

  // 統計カードのデザイン設定
  const statsCards = [
    {
      title: '本日の予約',
      value: todayReservations?.length || 0,
      unit: '件',
      icon: Calendar,
      gradient: 'bg-gradient-to-br from-primary-400 to-primary-600',
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      title: '登録顧客数',
      value: customers.length || 0,
      limit: 100,
      unit: '名',
      icon: Users,
      gradient: 'bg-gradient-to-br from-secondary-400 to-secondary-600',
      iconBg: 'bg-secondary-100',
      iconColor: 'text-secondary-600',
    },
    {
      title: '今月の予約',
      value: monthReservations?.length || 0,
      limit: 50,
      unit: '件',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-accent-400 to-accent-600',
      iconBg: 'bg-accent-100',
      iconColor: 'text-accent-600',
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={animations.spring.gentle}
        className="mb-6 lg:mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
            <Sparkles className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              ダッシュボード
            </h1>
            <p className="text-gray-600 mt-1">ようこそ、{user?.email}さん</p>
          </div>
        </div>

        {/* 美容室らしい装飾ライン */}
        <div className="mt-4 h-1 bg-gradient-to-r from-primary-200 via-secondary-200 to-accent-200 rounded-full" />
      </motion.div>
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, ...animations.spring.gentle }}
            className="relative overflow-hidden rounded-2xl shadow-lg"
          >
            <div className={`${stat.gradient} p-6 text-white`}>
              {/* 背景パターン */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
                <Scissors className="h-32 w-32 transform rotate-45" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <Sparkles className="h-6 w-6 opacity-60" />
                  </motion.div>
                </div>

                <h3 className="text-sm font-medium opacity-90">{stat.title}</h3>
                <p className="text-3xl font-bold mt-2">
                  {stat.value}
                  {stat.limit && ` / ${stat.limit}`}
                  <span className="text-sm font-normal ml-1">{stat.unit}</span>
                </p>

                {stat.limit && (
                  <div className="mt-4">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(stat.value / stat.limit) * 100}%`,
                        }}
                        transition={animations.spring.smooth}
                        className="h-full bg-white/40"
                      />
                    </div>
                    <p className="text-xs mt-1 opacity-70">
                      {((stat.value / stat.limit) * 100).toFixed(0)}% 使用中
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* メインコンテンツエリア */}
        <div className="lg:col-span-2 space-y-6">
          {/* 本日の予約一覧 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={animations.spring.gentle}
            className="bg-white rounded-2xl shadow-elegant overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Calendar className="h-6 w-6 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    本日の予約
                  </h2>
                </div>
                <Link
                  to="/reservations"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  すべて見る →
                </Link>
              </div>
            </div>

            <div className="p-6">
              {todayReservations && todayReservations.length > 0 ? (
                <div className="space-y-4">
                  {todayReservations.map((reservation, index) => (
                    <motion.div
                      key={reservation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.1,
                        ...animations.spring.gentle,
                      }}
                      className="group hover:shadow-md transition-all rounded-xl overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-gray-50 via-primary-50/30 to-secondary-50/30 p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                                {reservation.customer?.name?.charAt(0) || '?'}
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white" />
                            </div>
                          </div>

                          <div className="ml-4 flex-grow">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-800">
                                {reservation.customer?.name}
                              </h3>
                              <span className="text-xl">
                                {['💇‍♀️', '💆‍♀️', '✨'][index % 3]}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {reservation.menu_content}
                            </p>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="flex items-center space-x-1 text-gray-700">
                                <Clock className="h-4 w-4" />
                                <span className="font-semibold">
                                  {new Date(
                                    reservation.start_time
                                  ).toLocaleTimeString('ja-JP', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-primary-600 font-medium mt-1">
                                ¥{reservation.price?.toLocaleString() || '-'}
                              </p>
                            </div>

                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                <Phone className="h-5 w-5" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                <Mail className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">本日の予約はありません</p>
                  <Link
                    to="/reservations"
                    className="inline-flex items-center mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    予約を追加
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* サイドバー */}
        <div className="space-y-4 lg:space-y-6">
          {/* クイックアクション */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={animations.spring.gentle}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-800">
              クイックアクション
            </h2>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={animations.spring.smooth}
            >
              <Link
                to="/reservations"
                className="block p-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl shadow-lg transform transition-all"
              >
                <Calendar className="h-10 w-10 mb-3 opacity-90" />
                <h3 className="font-bold text-lg mb-1">新規予約を登録</h3>
                <p className="text-sm opacity-80">今すぐ予約を追加</p>
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={animations.spring.smooth}
            >
              <Link
                to="/customers/new"
                className="block p-6 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white rounded-2xl shadow-lg transform transition-all"
              >
                <Users className="h-10 w-10 mb-3 opacity-90" />
                <h3 className="font-bold text-lg mb-1">新規顧客を登録</h3>
                <p className="text-sm opacity-80">顧客情報を登録</p>
              </Link>
            </motion.div>
          </motion.div>

          {/* 営業情報カード */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ...animations.spring.gentle }}
            className="bg-gradient-to-br from-accent-50 to-accent-100 rounded-2xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="h-6 w-6 text-accent-600" />
              <h3 className="font-bold text-gray-800">今日も素敵な一日を</h3>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>営業時間</span>
                <span className="font-medium">9:00 - 19:00</span>
              </div>
              <div className="flex items-center justify-between">
                <span>予約可能枠</span>
                <span className="font-medium text-green-600">◯ 空きあり</span>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-accent-400 text-accent-400"
                />
              ))}
              <span className="text-xs text-gray-600 ml-2">お客様満足度</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
