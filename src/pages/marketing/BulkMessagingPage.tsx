import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  BellIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import BulkMessageComposer from '../../components/marketing/BulkMessageComposer';
import CustomerPreferencesPanel from '../../components/messaging/CustomerPreferencesPanel';
import ReminderSettingsPanel from '../../components/messaging/ReminderSettingsPanel';
import CampaignManagementPanel from '../../components/messaging/CampaignManagementPanel';
import MessageTemplateManager from '../../components/messaging/MessageTemplateManager';
import { useTenant } from '../../hooks/useTenant';
import { useCustomers } from '../../hooks/useCustomers';
import { animations } from '../../styles/design-system';

type TabType = 'compose' | 'campaigns' | 'reminders' | 'templates' | 'preferences' | 'settings';

export default function BulkMessagingPage() {
  const { tenant } = useTenant();
  const { customers = [] } = useCustomers();
  const [activeTab, setActiveTab] = useState<TabType>('compose');

  const tabs = [
    { 
      id: 'compose' as TabType, 
      label: '新規メッセージ', 
      icon: ChatBubbleLeftRightIcon,
      description: '顧客にメッセージを一斉配信',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    { 
      id: 'campaigns' as TabType, 
      label: 'キャンペーン', 
      icon: MegaphoneIcon,
      description: 'マーケティングキャンペーンを管理',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    { 
      id: 'reminders' as TabType, 
      label: 'リマインダー', 
      icon: BellIcon,
      description: '自動リマインダーを設定',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    { 
      id: 'templates' as TabType, 
      label: 'テンプレート', 
      icon: DocumentTextIcon,
      description: 'メッセージテンプレートを管理',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    { 
      id: 'preferences' as TabType, 
      label: '顧客設定', 
      icon: UserGroupIcon,
      description: '顧客の配信設定を管理',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    { 
      id: 'settings' as TabType, 
      label: '詳細設定', 
      icon: Cog6ToothIcon,
      description: 'メッセージ配信の詳細設定',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  if (!tenant) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">一斉メッセージ配信</h1>
              <p className="text-gray-600 mt-1">
                顧客セグメントに基づいてメッセージを効率的に配信
              </p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`p-3 rounded-lg ${tab.bgColor} mb-3 mx-auto w-fit`}>
                <tab.icon className={`h-6 w-6 ${tab.color}`} />
              </div>
              <div className="text-sm font-medium text-gray-900">{tab.label}</div>
              <div className="text-xs text-gray-500 mt-1 hidden md:block">
                {tab.description}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Active Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'compose' && (
            <BulkMessageComposer
              tenantId={tenant.id}
              onMessageSent={(messageId) => {
                console.log('Message sent:', messageId);
                // Optionally switch to campaigns tab
                setActiveTab('campaigns');
              }}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignManagementPanel
              tenantId={tenant.id}
              onCampaignUpdate={() => {
                console.log('Campaigns updated');
              }}
            />
          )}

          {activeTab === 'reminders' && (
            <ReminderSettingsPanel
              tenantId={tenant.id}
              onSettingsUpdate={() => {
                console.log('Reminder settings updated');
              }}
            />
          )}

          {activeTab === 'templates' && (
            <MessageTemplateManager
              tenantId={tenant.id}
              onTemplateUpdate={() => {
                console.log('Templates updated');
              }}
            />
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Bulk Preference Management */}
              <Card>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">一括配信設定管理</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    複数の顧客の配信設定を一括で更新
                  </p>
                </div>
                <CustomerPreferencesPanel
                  tenantId={tenant.id}
                  customers={customers}
                  mode="bulk"
                  onPreferenceUpdate={() => {
                    console.log('Bulk preferences updated');
                  }}
                />
              </Card>

              {/* Individual Customer List */}
              <Card>
                <h3 className="text-lg font-medium text-gray-900 mb-4">個別顧客設定</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.email || customer.phone_number || '連絡先未登録'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Open individual preference modal
                          console.log('Edit preferences for', customer.id);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        設定を編集
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid gap-6">
              {/* Delivery Settings */}
              <Card>
                <h3 className="text-lg font-medium text-gray-900 mb-4">配信設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">配信時間の最適化</div>
                        <div className="text-sm text-gray-500">顧客ごとに最適な配信時間を自動計算</div>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">重複配信の防止</div>
                        <div className="text-sm text-gray-500">24時間以内の重複配信を自動的に防止</div>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">配信エラーの自動リトライ</div>
                        <div className="text-sm text-gray-500">失敗したメッセージを自動的に再送信</div>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>
              </Card>

              {/* Channel Settings */}
              <Card>
                <h3 className="text-lg font-medium text-gray-900 mb-4">チャンネル設定</h3>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">💬</span>
                        <span className="font-medium text-gray-900">LINE</span>
                      </div>
                      <span className="text-sm text-green-600">接続済み</span>
                    </div>
                    <p className="text-sm text-gray-500">LINE公式アカウントと連携済み</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">✉️</span>
                        <span className="font-medium text-gray-900">メール</span>
                      </div>
                      <button className="text-sm text-primary-600 hover:text-primary-700">
                        設定
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">SendGridまたはAWS SESを設定</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">📱</span>
                        <span className="font-medium text-gray-900">SMS</span>
                      </div>
                      <button className="text-sm text-primary-600 hover:text-primary-700">
                        設定
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">Twilioアカウントを設定</p>
                  </div>
                </div>
              </Card>

              {/* Statistics */}
              <Card>
                <h3 className="text-lg font-medium text-gray-900 mb-4">配信統計</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-900">1,248</div>
                    <div className="text-sm text-gray-500">今月の送信数</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">92.5%</div>
                    <div className="text-sm text-gray-500">平均到達率</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">68.3%</div>
                    <div className="text-sm text-gray-500">平均開封率</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}