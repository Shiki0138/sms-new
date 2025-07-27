import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Calendar, Users, TrendingUp, Plus } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user, tenant, logout } = useAuth();
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tenant?.name || 'サロン管理システム'}
                {isDev && (
                  <span className="ml-2 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    開発環境
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600">ようこそ、{user?.email}さん</p>
            </div>
            {!isDev && (
              <button
                onClick={logout}
                className="btn-secondary"
              >
                ログアウト
              </button>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">本日の予約</p>
                <p className="text-2xl font-semibold text-gray-900">0件</p>
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
                <p className="text-2xl font-semibold text-gray-900">0 / 100名</p>
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
                <p className="text-2xl font-semibold text-gray-900">0 / 50件</p>
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
            <button className="btn-secondary flex items-center justify-center">
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
            <p className="text-gray-500 text-center py-8">
              本日の予約はありません
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;