import React from 'react';
import { Link } from 'react-router-dom';
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
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

const DashboardPageSimple: React.FC = () => {
  // モックデータで表示を安定化
  const mockUser = { email: 'demo@salon.com' };

  const mockCustomers = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `顧客${i + 1}`,
    email: `customer${i + 1}@example.com`,
  }));

  const mockTodayReservations = [
    {
      id: 1,
      customer: { name: '田中花子' },
      menu_content: 'カット&カラー',
      start_time: new Date().toISOString(),
      price: 8500,
    },
    {
      id: 2,
      customer: { name: '佐藤美咲' },
      menu_content: 'パーマ&トリートメント',
      start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      price: 12000,
    },
    {
      id: 3,
      customer: { name: '山田太郎' },
      menu_content: 'メンズカット',
      start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      price: 4500,
    },
  ];

  const mockMonthReservations = Array.from({ length: 35 }, (_, i) => ({
    id: i + 1,
    date: format(new Date(), 'yyyy-MM-dd'),
  }));

  // 統計カードのデザイン設定
  const statsCards = [
    {
      title: '本日の予約',
      value: mockTodayReservations.length,
      unit: '件',
      icon: Calendar,
      gradient: 'bg-gradient-to-br from-purple-400 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      title: '登録顧客数',
      value: mockCustomers.length,
      limit: 100,
      unit: '名',
      icon: Users,
      gradient: 'bg-gradient-to-br from-blue-400 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: '今月の予約',
      value: mockMonthReservations.length,
      limit: 50,
      unit: '件',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-green-400 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      {/* ヘッダー */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
            <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ダッシュボード
            </h1>
            <p className="text-gray-600 mt-1">ようこそ、{mockUser.email}さん</p>
          </div>
        </div>

        {/* 美容室らしい装飾ライン */}
        <div className="mt-4 h-1 bg-gradient-to-r from-purple-200 via-blue-200 to-green-200 rounded-full" />
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {statsCards.map((stat) => (
          <div
            key={stat.title}
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
                  <Sparkles className="h-6 w-6 opacity-60" />
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
                      <div
                        style={{ width: `${(stat.value / stat.limit) * 100}%` }}
                        className="h-full bg-white/40 transition-all duration-500"
                      />
                    </div>
                    <p className="text-xs mt-1 opacity-70">
                      {((stat.value / stat.limit) * 100).toFixed(0)}% 使用中
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* メインコンテンツエリア */}
        <div className="lg:col-span-2 space-y-6">
          {/* 本日の予約一覧 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    本日の予約
                  </h2>
                </div>
                <Link
                  to="/reservations"
                  className="flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
                >
                  すべて見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>

            <div className="p-6">
              {mockTodayReservations.length > 0 ? (
                <div className="space-y-4">
                  {mockTodayReservations.map((reservation, index) => (
                    <div
                      key={reservation.id}
                      className="group hover:shadow-md transition-all rounded-xl overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-gray-50 via-purple-50/30 to-blue-50/30 p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
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
                              <p className="text-sm text-purple-600 font-medium mt-1">
                                ¥{reservation.price?.toLocaleString() || '-'}
                              </p>
                            </div>

                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                                <Phone className="h-5 w-5" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                                <Mail className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">本日の予約はありません</p>
                  <Link
                    to="/reservations"
                    className="inline-flex items-center mt-4 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    予約を追加
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-4 lg:space-y-6">
          {/* クイックアクション */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              クイックアクション
            </h2>

            <Link
              to="/reservations"
              className="block p-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl shadow-lg transform transition-all hover:scale-[1.02]"
            >
              <Calendar className="h-10 w-10 mb-3 opacity-90" />
              <h3 className="font-bold text-lg mb-1">新規予約を登録</h3>
              <p className="text-sm opacity-80">今すぐ予約を追加</p>
            </Link>

            <Link
              to="/customers"
              className="block p-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg transform transition-all hover:scale-[1.02]"
            >
              <Users className="h-10 w-10 mb-3 opacity-90" />
              <h3 className="font-bold text-lg mb-1">新規顧客を登録</h3>
              <p className="text-sm opacity-80">顧客情報を登録</p>
            </Link>
          </div>

          {/* 営業情報カード */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="h-6 w-6 text-green-600" />
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
                  className="h-4 w-4 fill-green-400 text-green-400"
                />
              ))}
              <span className="text-xs text-gray-600 ml-2">お客様満足度</span>
            </div>
          </div>

          {/* システム状態カード */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800">システム状態</h3>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>アプリケーション</span>
                <span className="font-medium text-green-600">✅ 正常稼働</span>
              </div>
              <div className="flex items-center justify-between">
                <span>データベース</span>
                <span className="font-medium text-green-600">✅ 接続正常</span>
              </div>
              <div className="flex items-center justify-between">
                <span>最終更新</span>
                <span className="font-medium">
                  {new Date().toLocaleTimeString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageSimple;
