import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { supabase } from '../lib/supabase';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  todayReservations: number;
  monthlyRevenue: number;
  newCustomersThisMonth: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    todayReservations: 0,
    monthlyRevenue: 0,
    newCustomersThisMonth: 0,
  });
  const [todayReservations, setTodayReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      fetchDashboardData();
    }
  }, [currentTenant]);

  const fetchDashboardData = async () => {
    if (!currentTenant) return;

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
        .eq('tenant_id', currentTenant.id);

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
        .eq('tenant_id', currentTenant.id)
        .gte('start_time', today.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      // 今月の売上
      const { data: sales } = await supabase
        .from('sales')
        .select('amount')
        .eq('tenant_id', currentTenant.id)
        .gte('created_at', startOfMonth.toISOString());

      const monthlyRevenue = sales?.reduce((sum, sale) => sum + sale.amount, 0) || 0;

      // 今月の新規顧客
      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
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
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">ダッシュボード</h1>

        {/* 統計カード */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      顧客総数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalCustomers}人
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      本日の予約
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.todayReservations}件
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      今月の売上
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats.monthlyRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserPlus className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      今月の新規顧客
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.newCustomersThisMonth}人
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 本日の予約一覧 */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">本日の予約</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {todayReservations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">予約がありません</h3>
                <p className="mt-1 text-sm text-gray-500">本日の予約はまだありません。</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {todayReservations.map((reservation) => (
                  <li key={reservation.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" />
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(reservation.start_time)}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <span
                            className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                              reservation.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : reservation.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {reservation.status === 'confirmed'
                              ? '確定'
                              : reservation.status === 'cancelled'
                              ? 'キャンセル'
                              : '仮予約'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {reservation.customers?.name || '顧客名なし'}
                          </p>
                          {reservation.customers?.phone_number && (
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              {reservation.customers.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;