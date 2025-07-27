import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCustomers } from '../hooks/useCustomers';
import { useReservations } from '../hooks/useReservations';
import { Calendar, Users, TrendingUp, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  
  // 今日の予約を取得
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayReservations } = useReservations(today, today);
  
  // 今月の予約と施術記録を取得
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: monthReservations } = useReservations(monthStart, monthEnd);
  

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-600 mt-1">ようこそ、{user?.email}さん</p>
      </div>
        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">本日の予約</p>
                <p className="text-2xl font-semibold text-gray-900">{todayReservations?.length || 0}件</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">登録顧客数</p>
                <p className="text-2xl font-semibold text-gray-900">{customers?.length || 0} / 100名</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今月の予約</p>
                <p className="text-2xl font-semibold text-gray-900">{monthReservations?.length || 0} / 50件</p>
              </div>
            </div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="btn-primary flex items-center justify-center">
              <Plus className="h-5 w-5 mr-2" />
              新規予約を登録
            </button>
            <button 
              onClick={() => navigate('/customers/new')}
              className="btn-secondary flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              新規顧客を登録
            </button>
          </div>
        </div>

        {/* 本日の予約一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">本日の予約</h2>
          </div>
          <div className="p-6">
            {todayReservations && todayReservations.length > 0 ? (
              <div className="space-y-4">
                {todayReservations.map(reservation => (
                  <div key={reservation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-700 font-medium text-sm">
                          {reservation.customer?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.customer?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reservation.menu_content}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(reservation.start_time).toLocaleTimeString('ja-JP', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        ¥{reservation.price?.toLocaleString() || '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                本日の予約はありません
              </p>
            )}
          </div>
        </div>
    </div>
  );
};

export default DashboardPage;