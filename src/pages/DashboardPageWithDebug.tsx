import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar,
  Users,
  TrendingUp,
  Plus,
  Sparkles,
  Clock,
  Heart,
  Star,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { animations } from '../styles/design-system';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const DashboardPage: React.FC = () => {
  const authData = useAuth();

  // デバッグ情報を表示
  useEffect(() => {
    console.log('[Dashboard] Auth data:', authData);
    console.log('[Dashboard] User:', authData?.user);
    console.log('[Dashboard] Tenant:', authData?.tenant);
  }, [authData]);

  const { user, tenant } = authData || {};

  // 顧客数を取得（直接Supabaseから取得）
  const { data: customersCount = 0, error: customersError } = useQuery({
    queryKey: ['customers-count', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;

      console.log(
        '[Dashboard] Fetching customers count for tenant:',
        tenant.id
      );

      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      if (error) {
        console.error('[Dashboard] Error fetching customers count:', error);
        throw error;
      }

      console.log('[Dashboard] Customers count:', count);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // 今日の予約を取得
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayReservations = [], error: reservationsError } = useQuery({
    queryKey: ['reservations-today', tenant?.id, today],
    queryFn: async () => {
      if (!tenant?.id) return [];

      console.log(
        '[Dashboard] Fetching today reservations for tenant:',
        tenant.id
      );

      const { data, error } = await supabase
        .from('reservations')
        .select(
          `
          *,
          customer:customers(id, name, phone, email)
        `
        )
        .eq('tenant_id', tenant.id)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[Dashboard] Error fetching today reservations:', error);
        throw error;
      }

      console.log('[Dashboard] Today reservations:', data);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // 今月の予約を取得
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: monthReservationsCount = 0, error: monthError } = useQuery({
    queryKey: ['reservations-month', tenant?.id, monthStart, monthEnd],
    queryFn: async () => {
      if (!tenant?.id) return 0;

      console.log(
        '[Dashboard] Fetching month reservations count for tenant:',
        tenant.id
      );

      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('start_time', `${monthStart}T00:00:00`)
        .lte('start_time', `${monthEnd}T23:59:59`);

      if (error) {
        console.error(
          '[Dashboard] Error fetching month reservations count:',
          error
        );
        throw error;
      }

      console.log('[Dashboard] Month reservations count:', count);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // 認証情報がない場合のエラー表示
  if (!authData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">認証エラー</h3>
            <p className="text-red-700 text-sm mt-1">
              認証情報が取得できません。再度ログインしてください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // テナント情報がない場合のエラー表示
  if (!tenant) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-800 font-medium">テナント情報エラー</h3>
            <p className="text-yellow-700 text-sm mt-1">
              テナント情報が取得できません。管理者にお問い合わせください。
            </p>
            <pre className="text-xs mt-2 bg-yellow-100 p-2 rounded">
              {JSON.stringify({ user: user?.email, tenant }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // エラーがある場合の表示
  if (customersError || reservationsError || monthError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">データ取得エラー</h3>
            <p className="text-red-700 text-sm mt-1">
              データの取得中にエラーが発生しました。
            </p>
            <pre className="text-xs mt-2 bg-red-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(
                {
                  customersError: customersError?.message,
                  reservationsError: reservationsError?.message,
                  monthError: monthError?.message,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // 統計カードのデザイン設定
  const statsCards = [
    {
      title: '本日の予約',
      value: todayReservations.length,
      unit: '件',
      icon: Calendar,
      gradient: 'bg-gradient-to-br from-primary-400 to-primary-600',
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      title: '登録顧客数',
      value: customersCount,
      limit: 100,
      unit: '名',
      icon: Users,
      gradient: 'bg-gradient-to-br from-secondary-400 to-secondary-600',
      iconBg: 'bg-secondary-100',
      iconColor: 'text-secondary-600',
    },
    {
      title: '今月の予約',
      value: monthReservationsCount,
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
      {/* デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-xs">
          <p className="font-mono">User: {user?.email}</p>
          <p className="font-mono">Tenant ID: {tenant.id}</p>
          <p className="font-mono">Date: {today}</p>
        </div>
      )}

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
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <stat.icon className="h-6 w-6" />
                  </div>
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
        {/* 本日の予約一覧 */}
        <div className="lg:col-span-2 space-y-6">
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
              {todayReservations.length > 0 ? (
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
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {reservation.customer?.name || '名前なし'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {reservation.menu_content}
                          </p>
                        </div>
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

            <Link
              to="/reservations"
              className="block p-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl shadow-lg transform transition-all"
            >
              <Calendar className="h-10 w-10 mb-3 opacity-90" />
              <h3 className="font-bold text-lg mb-1">新規予約を登録</h3>
              <p className="text-sm opacity-80">今すぐ予約を追加</p>
            </Link>

            <Link
              to="/customers/new"
              className="block p-6 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white rounded-2xl shadow-lg transform transition-all"
            >
              <Users className="h-10 w-10 mb-3 opacity-90" />
              <h3 className="font-bold text-lg mb-1">新規顧客を登録</h3>
              <p className="text-sm opacity-80">顧客情報を登録</p>
            </Link>
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
