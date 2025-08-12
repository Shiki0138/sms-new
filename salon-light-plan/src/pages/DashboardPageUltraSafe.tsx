import React from 'react';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { getConfigWarning } from '../lib/supabase-safe';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// 環境変数未設定時でも表示できるセーフなダッシュボード
const DashboardPageUltraSafe: React.FC = () => {
  const configWarning = getConfigWarning();
  const isDemoMode =
    new URLSearchParams(window.location.search).get('demo') === 'true';

  const stats = {
    customers: isDemoMode ? 45 : '---',
    reservations: isDemoMode ? 28 : '---',
    todayReservations: isDemoMode ? 5 : '---',
    messages: isDemoMode ? 156 : '---',
  };

  const features = [
    {
      icon: UserGroupIcon,
      title: '顧客管理',
      description: '顧客情報と来店履歴を管理',
      link: '/customers',
      color: 'bg-blue-500',
    },
    {
      icon: CalendarIcon,
      title: '予約管理',
      description: '予約スケジュールを管理',
      link: '/reservations',
      color: 'bg-green-500',
    },
    {
      icon: ChatBubbleLeftIcon,
      title: 'メッセージ',
      description: '顧客とのコミュニケーション',
      link: '/messages',
      color: 'bg-purple-500',
    },
    {
      icon: BellIcon,
      title: '一斉送信',
      description: 'キャンペーンやお知らせの配信',
      link: '/marketing/bulk-messaging',
      color: 'bg-orange-500',
    },
    {
      icon: ChartBarIcon,
      title: 'レポート',
      description: '売上・顧客分析レポート',
      link: '/reports',
      color: 'bg-indigo-500',
    },
    {
      icon: CogIcon,
      title: '設定',
      description: 'システム設定とAPI連携',
      link: '/settings',
      color: 'bg-gray-500',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* 設定警告 */}
      {configWarning && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {configWarning.title}
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {configWarning.message}
              </p>
              {isDemoMode && (
                <p className="mt-2 text-sm text-yellow-600">
                  現在デモモードで表示しています。実際のデータベース接続には環境変数の設定が必要です。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <HomeIcon className="h-8 w-8" />
          美容サロン管理システム
        </h1>
        <p className="mt-2 text-gray-600">
          {isDemoMode ? 'デモモード' : 'ダッシュボード'}
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総顧客数</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.customers}
              </p>
            </div>
            <UserGroupIcon className="h-12 w-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">今月の予約</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.reservations}
              </p>
            </div>
            <CalendarIcon className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">本日の予約</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.todayReservations}
              </p>
            </div>
            <CalendarIcon className="h-12 w-12 text-orange-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">メッセージ</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.messages}
              </p>
            </div>
            <ChatBubbleLeftIcon className="h-12 w-12 text-purple-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* 機能グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.link} to={feature.link}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start">
                  <div className={`p-3 ${feature.color} text-white rounded-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* クイックアクション */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          クイックアクション
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/reservations">
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              新規予約
            </Button>
          </Link>
          <Link to="/customers/new">
            <Button variant="outline" size="sm">
              <UserGroupIcon className="h-4 w-4 mr-2" />
              顧客登録
            </Button>
          </Link>
          <Link to="/messages">
            <Button variant="outline" size="sm">
              <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
              メッセージ送信
            </Button>
          </Link>
          <Link to="/marketing/bulk-messaging">
            <Button variant="outline" size="sm">
              <BellIcon className="h-4 w-4 mr-2" />
              一斉送信
            </Button>
          </Link>
        </div>
      </div>

      {/* フッター情報 */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">プラン情報</h3>
            <p>ライトプラン</p>
            <p>顧客上限: 100名</p>
            <p>月間予約: 50件</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">サポート</h3>
            <p>営業時間: 9:00-18:00</p>
            <p>Email: support@salon-system.jp</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">システム情報</h3>
            <p>バージョン: 1.0.0</p>
            <p>最終更新: 2025年8月1日</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageUltraSafe;
