import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cog6ToothIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../styles/design-system';
import HolidaySettingsCard from '../components/settings/HolidaySettingsCard';
import StaffRegistrationCard from '../components/staff/StaffRegistrationCard';
import { useStaff } from '../hooks/useStaff';
import { useBusinessHours } from '../hooks/useBusinessHours';

// 仮のテナントID（実際は認証システムから取得）
const TENANT_ID = '01HZTEST001';

const tabs = [
  {
    id: 'business_hours',
    name: '営業時間・休日',
    icon: ClockIcon,
    description: '営業時間と定休日・特別休業日の設定',
  },
  {
    id: 'staff',
    name: 'スタッフ管理',
    icon: UserGroupIcon,
    description: 'スタッフの登録と管理',
  },
  {
    id: 'plan',
    name: 'プラン情報',
    icon: CreditCardIcon,
    description: 'ライトプランの利用状況',
  },
  {
    id: 'notifications',
    name: '通知設定',
    icon: BellIcon,
    description: 'リマインダーと通知の設定',
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business_hours');
  
  // カスタムフックでデータ管理
  const {
    staff,
    loading: staffLoading,
    error: staffError,
    createStaff,
    updateStaff,
    deleteStaff,
    activeStaffCount,
  } = useStaff(TENANT_ID);

  const {
    businessHours,
    holidaySettings,
    loading: businessHoursLoading,
    error: businessHoursError,
    updateBusinessHour,
    createHolidaySetting,
    updateHolidaySetting,
    deleteHolidaySetting,
  } = useBusinessHours(TENANT_ID);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'business_hours':
        return (
          <HolidaySettingsCard
            holidays={holidaySettings}
            businessHours={businessHours}
            onAddHoliday={async (holiday) => {
              const result = await createHolidaySetting(holiday);
              if (!result.success && result.error) {
                alert(result.error);
              }
            }}
            onUpdateHoliday={async (id, updates) => {
              await updateHolidaySetting(id, updates);
            }}
            onDeleteHoliday={async (id) => {
              if (window.confirm('この休日設定を削除しますか？')) {
                await deleteHolidaySetting(id);
              }
            }}
            onUpdateBusinessHours={async (dayOfWeek, hours) => {
              await updateBusinessHour(dayOfWeek, hours);
            }}
            className="max-w-none"
          />
        );

      case 'staff':
        return (
          <StaffRegistrationCard
            staff={staff}
            onAddStaff={async (staffData) => {
              const result = await createStaff(staffData);
              if (!result.success && result.error) {
                alert(result.error);
              }
              return result;
            }}
            onUpdateStaff={async (id, updates) => {
              const result = await updateStaff(id, updates);
              if (!result.success && result.error) {
                alert(result.error);
              }
              return result;
            }}
            onDeleteStaff={async (id) => {
              const result = await deleteStaff(id);
              if (!result.success && result.error) {
                alert(result.error);
              }
              return result;
            }}
            maxStaff={3} // ライトプラン制限
            className="max-w-none"
          />
        );

      case 'plan':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 -m-6 mb-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <CreditCardIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">ライトプラン</h3>
                  <p className="text-sm text-gray-600">¥4,980/月</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* プラン詳細 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">プラン詳細</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">顧客管理</div>
                    <div className="text-xl font-bold text-gray-800">100名まで</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">月間予約数</div>
                    <div className="text-xl font-bold text-gray-800">50件まで</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">スタッフ登録</div>
                    <div className="text-xl font-bold text-gray-800">3名まで</div>
                  </div>
                </div>
              </div>

              {/* 利用状況 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">今月の利用状況</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-600">登録顧客数</span>
                      <span className="text-xs text-blue-500">67/100</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-green-600">今月の予約数</span>
                      <span className="text-xs text-green-500">32/50</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '64%' }}></div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-purple-600">登録スタッフ数</span>
                      <span className="text-xs text-purple-500">{activeStaffCount}/3</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(activeStaffCount / 3) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 機能一覧 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">利用可能機能</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    '顧客管理（100名まで）',
                    '予約管理（50件/月）',
                    'スタッフ管理（3名まで）',
                    'メッセージ管理（LINE・Instagram）',
                    'AI自動返信機能',
                    '施術履歴管理',
                    '営業時間・休日設定',
                    'カレンダー表示（日・週・月）',
                    'プレミアムデザイン',
                    'モバイル対応',
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 -m-6 mb-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <BellIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">通知設定</h3>
                  <p className="text-sm text-gray-600">リマインダーと通知の設定</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="text-center py-12">
                <BellIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">通知設定機能</p>
                <p className="text-sm text-gray-400">今後のアップデートで追加予定です</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Cog6ToothIcon className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          </div>
          <p className="text-gray-600">サロンの基本設定とプラン管理</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800">設定メニュー</h2>
              </div>
              <nav className="space-y-1 p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{tab.name}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={animations.spring.gentle}
            >
              {renderTabContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}