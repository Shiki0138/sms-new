import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PageLoader } from '../components/common/LoadingSpinner';
import {
  Users,
  Calendar,
  DollarSign,
  UserPlus,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  Phone,
  Settings,
} from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  todayReservations: number;
  monthlyRevenue: number;
  newCustomersThisMonth: number;
}

const Dashboard: React.FC = () => {
  const { tenant } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    todayReservations: 0,
    monthlyRevenue: 0,
    newCustomersThisMonth: 0,
  });
  const [todayReservations, setTodayReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      fetchDashboardData();
    }
  }, [tenant]);

  const fetchDashboardData = async () => {
    if (!tenant) return;

    // デモモードの場合はモックデータを使用
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      setLoading(true);
      setTimeout(() => {
        setStats({
          totalCustomers: 45,
          todayReservations: 8,
          monthlyRevenue: 285000,
          newCustomersThisMonth: 12,
        });
        setTodayReservations([
          {
            id: '1',
            start_time: new Date().toISOString(),
            customer: { name: '田中 太郎' },
            menu_content: 'カット + カラー',
            status: 'CONFIRMED',
          },
          {
            id: '2',
            start_time: new Date(Date.now() + 3600000).toISOString(),
            customer: { name: '鈴木 花子' },
            menu_content: 'パーマ',
            status: 'TENTATIVE',
          },
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      setLoading(true);
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // 顧客総数
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      // 今日の予約
      const { data: reservations, count: reservationCount } = await supabase
        .from('reservations')
        .select(`
          *,
          customers (
            name,
            phone_number
          )
        `)
        .eq('tenant_id', tenant.id)
        .gte('start_time', today.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      // 今月の売上
      const { data: sales } = await supabase
        .from('sales')
        .select('amount')
        .eq('tenant_id', tenant.id)
        .gte('created_at', startOfMonth.toISOString());

      const monthlyRevenue = sales?.reduce((sum, sale) => sum + sale.amount, 0) || 0;

      // 今月の新規顧客
      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('created_at', startOfMonth.toISOString());

      setStats({
        totalCustomers: customerCount || 0,
        todayReservations: reservationCount || 0,
        monthlyRevenue,
        newCustomersThisMonth: newCustomers || 0,
      });

      setTodayReservations(reservations || []);
    } catch (error) {
      console.error('ダッシュボードデータの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (loading) {
    return <PageLoader message="ダッシュボードを読み込み中..." />;
  }

  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダーセクション */}
        <div className="mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900">
                おはようございます！
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {currentDate} | {tenant?.name || 'サロン'}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Link
                to="/reservations"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                新規予約
              </Link>
              <Link
                to="/customers"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                顧客登録
              </Link>
            </div>
          </div>
        </div>

        {/* 統計カード - 改良版 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
            <dt>
              <div className="absolute bg-indigo-500 rounded-md p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">顧客総数</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCustomers}</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                <span className="sr-only">増加</span>
                人
              </p>
            </dd>
          </div>

          <div className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
            <dt>
              <div className="absolute bg-green-500 rounded-md p-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">本日の予約</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stats.todayReservations}</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                <span className="sr-only">件</span>
                件
              </p>
            </dd>
          </div>

          <div className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
            <dt>
              <div className="absolute bg-yellow-500 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">今月の売上</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
            </dd>
          </div>

          <div className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
            <dt>
              <div className="absolute bg-purple-500 rounded-md p-3">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">今月の新規顧客</p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stats.newCustomersThisMonth}</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                <span className="sr-only">人</span>
                人
              </p>
            </dd>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 本日の予約一覧 - 改良版 */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    本日の予約スケジュール
                  </h3>
                  <Link
                    to="/reservations"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center"
                  >
                    すべて見る
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
                
                {todayReservations.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">本日の予約はありません</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      新しい予約を追加して、スケジュールを管理しましょう。
                    </p>
                    <div className="mt-6">
                      <Link
                        to="/reservations"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        予約を追加
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {todayReservations.map((reservation, index) => (
                        <li key={reservation.id}>
                          <div className="relative pb-8">
                            {index !== todayReservations.length - 1 && (
                              <span
                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex items-start space-x-3">
                              <div className="relative">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                                  reservation.status === 'CONFIRMED'
                                    ? 'bg-green-500'
                                    : reservation.status === 'CANCELLED'
                                    ? 'bg-red-500'
                                    : 'bg-yellow-500'
                                }`}>
                                  <Clock className="h-5 w-5 text-white" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div>
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {formatTime(reservation.start_time)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-sm text-gray-500">
                                    {reservation.customer?.name || '顧客名なし'}
                                  </p>
                                </div>
                                <div className="mt-2 text-sm text-gray-700">
                                  <p>{reservation.menu_content}</p>
                                </div>
                                <div className="mt-2 flex items-center space-x-2">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      reservation.status === 'CONFIRMED'
                                        ? 'bg-green-100 text-green-800'
                                        : reservation.status === 'CANCELLED'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {reservation.status === 'CONFIRMED'
                                      ? '確定'
                                      : reservation.status === 'CANCELLED'
                                      ? 'キャンセル'
                                      : '仮予約'}
                                  </span>
                                  {reservation.customer?.phone_number && (
                                    <span className="inline-flex items-center text-sm text-gray-500">
                                      <Phone className="h-4 w-4 mr-1" />
                                      {reservation.customer.phone_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* クイックアクション */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  クイックアクション
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/reservations"
                    className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    予約管理
                  </Link>
                  <Link
                    to="/customers"
                    className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Users className="h-5 w-5 text-gray-400 mr-3" />
                    顧客管理
                  </Link>
                  <Link
                    to="/sales"
                    className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                    売上管理
                  </Link>
                  <Link
                    to="/settings"
                    className="w-full flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-5 w-5 text-gray-400 mr-3" />
                    設定
                  </Link>
                </div>
              </div>
            </div>

            {/* プラン情報 */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-white mb-2">
                  現在のプラン
                </h3>
                <p className="text-purple-100 text-sm mb-4">
                  {tenant?.plan === 'light' ? 'ライトプラン' : 
                   tenant?.plan === 'standard' ? 'スタンダードプラン' : 
                   'プレミアムプラン'}
                </p>
                <button className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors">
                  プランを確認
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;