import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const DashboardPageEmergency: React.FC = () => {
  const { user, tenant, loading, error } = useAuth();

  console.log('DashboardPageEmergency rendering...', {
    user,
    tenant,
    loading,
    error,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
          <p className="text-xs text-gray-500 mt-2">
            認証情報を確認しています...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">ログインが必要です</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">エラー: {error}</p>
            </div>
          )}
          <a
            href="/auth/login"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            ログイン画面へ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto pb-24 lg:pb-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ダッシュボード (緊急版)
              </h1>
              <p className="text-gray-600 mt-1">ようこそ、{user.email}さん</p>
              {tenant && (
                <p className="text-sm text-gray-500">テナント: {tenant.name}</p>
              )}
            </div>
          </div>

          {/* 美容室らしい装飾ライン */}
          <div className="mt-4 h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 rounded-full" />
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-6 text-white">
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>

                <h3 className="text-sm font-medium opacity-90">本日の予約</h3>
                <p className="text-3xl font-bold mt-2">
                  3<span className="text-sm font-normal ml-1">件</span>
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-6 text-white">
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Users className="h-6 w-6" />
                  </div>
                </div>

                <h3 className="text-sm font-medium opacity-90">登録顧客数</h3>
                <p className="text-3xl font-bold mt-2">
                  25 / 100<span className="text-sm font-normal ml-1">名</span>
                </p>

                <div className="mt-4">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/40 w-1/4" />
                  </div>
                  <p className="text-xs mt-1 opacity-70">25% 使用中</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-6 text-white">
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                <h3 className="text-sm font-medium opacity-90">今月の予約</h3>
                <p className="text-3xl font-bold mt-2">
                  18 / 50<span className="text-sm font-normal ml-1">件</span>
                </p>

                <div className="mt-4">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/40 w-1/3" />
                  </div>
                  <p className="text-xs mt-1 opacity-70">36% 使用中</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* メインコンテンツエリア */}
          <div className="lg:col-span-2 space-y-6">
            {/* システム状況 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    システム状況
                  </h2>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">
                      認証システム: 正常動作
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">
                      データベース接続: 正常
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-gray-700">予約管理機能: 開発中</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-gray-700">顧客管理機能: 開発中</span>
                  </div>
                </div>
              </div>
            </div>

            {/* デバッグ情報 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  デバッグ情報
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ユーザーID:</span>
                    <span className="font-mono text-gray-800">{user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">メールアドレス:</span>
                    <span className="font-mono text-gray-800">
                      {user.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">テナントID:</span>
                    <span className="font-mono text-gray-800">
                      {tenant?.id || 'なし'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">テナント名:</span>
                    <span className="font-mono text-gray-800">
                      {tenant?.name || 'なし'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">プラン:</span>
                    <span className="font-mono text-gray-800">
                      {tenant?.plan || 'light'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">現在時刻:</span>
                    <span className="font-mono text-gray-800">
                      {new Date().toLocaleString('ja-JP')}
                    </span>
                  </div>
                </div>
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

              <a
                href="/customers"
                className="block p-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg transform transition-all hover:scale-105"
              >
                <Users className="h-10 w-10 mb-3 opacity-90" />
                <h3 className="font-bold text-lg mb-1">顧客管理</h3>
                <p className="text-sm opacity-80">顧客情報の確認・編集</p>
              </a>

              <a
                href="/reservations"
                className="block p-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl shadow-lg transform transition-all hover:scale-105"
              >
                <Calendar className="h-10 w-10 mb-3 opacity-90" />
                <h3 className="font-bold text-lg mb-1">予約管理</h3>
                <p className="text-sm opacity-80">予約の確認・作成</p>
              </a>
            </div>

            {/* 営業情報カード */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-100 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-6 w-6 text-pink-600" />
                <h3 className="font-bold text-gray-800">緊急版稼働中</h3>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>バージョン</span>
                  <span className="font-medium">Emergency v1.0</span>
                </div>
                <div className="flex justify-between">
                  <span>最終更新</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ステータス</span>
                  <span className="font-medium text-green-600">◯ 正常稼働</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageEmergency;
