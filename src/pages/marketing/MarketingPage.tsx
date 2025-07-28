import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MegaphoneIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { ReminderSchedulerService } from '../../services/reminder-scheduler';
import { BulkMessagingService } from '../../services/bulk-messaging-service';
import { animations } from '../../styles/design-system';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import BulkMessageComposer from '../../components/marketing/BulkMessageComposer';
import ReminderSettings from '../../components/settings/ReminderSettings';

type ActiveTab = 'bulk_message' | 'reminders' | 'history' | 'analytics';

export default function MarketingPage() {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bulk_message');
  const [reminderService, setReminderService] = useState<ReminderSchedulerService | null>(null);
  const [bulkService, setBulkService] = useState<BulkMessagingService | null>(null);
  const [stats, setStats] = useState({
    pending_reminders: 0,
    sent_messages_today: 0,
    active_campaigns: 0,
    total_recipients_month: 0,
  });

  useEffect(() => {
    if (tenant?.id) {
      const reminderSvc = new ReminderSchedulerService(tenant.id);
      const bulkSvc = new BulkMessagingService(tenant.id);
      
      setReminderService(reminderSvc);
      setBulkService(bulkSvc);
      
      // 統計情報を取得
      loadStats(reminderSvc, bulkSvc);
    }
  }, [tenant?.id]);

  const loadStats = async (reminderSvc: ReminderSchedulerService, bulkSvc: BulkMessagingService) => {
    try {
      // リマインダー統計
      const reminderStats = await reminderSvc.getReminderStats();
      
      // 一斉送信履歴
      const history = await bulkSvc.getBulkMessageHistory();
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);
      
      const sentToday = history.filter(h => 
        h.updated_at.startsWith(today) && h.status === 'completed'
      ).length;
      
      const activeCampaigns = history.filter(h => 
        h.status === 'scheduled' || h.status === 'sending'
      ).length;
      
      const monthlyRecipients = history
        .filter(h => h.updated_at.startsWith(thisMonth) && h.status === 'completed')
        .reduce((sum, h) => sum + (h.total_recipients || 0), 0);

      setStats({
        pending_reminders: reminderStats.total_scheduled - reminderStats.total_sent,
        sent_messages_today: sentToday,
        active_campaigns: activeCampaigns,
        total_recipients_month: monthlyRecipients,
      });
    } catch (error) {
      console.error('Error loading marketing stats:', error);
    }
  };

  const tabs = [
    {
      key: 'bulk_message' as const,
      label: '一斉配信',
      icon: MegaphoneIcon,
      description: 'キャンペーンやお知らせの一斉配信',
    },
    {
      key: 'reminders' as const,
      label: 'リマインダー設定',
      icon: ClockIcon,
      description: '予約前後の自動リマインダー',
    },
    {
      key: 'history' as const,
      label: '配信履歴',
      icon: ChatBubbleLeftRightIcon,
      description: '過去の配信実績と詳細',
    },
    {
      key: 'analytics' as const,
      label: '分析・レポート',
      icon: ChartBarIcon,
      description: '配信効果の分析データ',
    },
  ];

  const statsCards = [
    {
      title: '送信待ちリマインダー',
      value: stats.pending_reminders,
      unit: '件',
      icon: ClockIcon,
      color: 'bg-orange-100 text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
    },
    {
      title: '本日の配信数',
      value: stats.sent_messages_today,
      unit: '件',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
    },
    {
      title: '実行中キャンペーン',
      value: stats.active_campaigns,
      unit: '件',
      icon: MegaphoneIcon,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
    },
    {
      title: '今月の配信先',
      value: stats.total_recipients_month,
      unit: '名',
      icon: UserGroupIcon,
      color: 'bg-purple-100 text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={animations.spring.gentle}
        className="mb-6 lg:mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
            <MegaphoneIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              マーケティング
            </h1>
            <p className="text-gray-600 mt-1">顧客へのメッセージ配信とリマインダー管理</p>
          </div>
        </div>
        
        <div className="mt-4 h-1 bg-gradient-to-r from-primary-200 via-secondary-200 to-accent-200 rounded-full" />
      </motion.div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, ...animations.spring.gentle }}
            className="relative overflow-hidden rounded-2xl shadow-lg"
          >
            <div className={`${stat.bgColor} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${stat.color} bg-white/20 backdrop-blur-sm rounded-xl`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              
              <h3 className="text-sm font-medium opacity-90">{stat.title}</h3>
              <p className="text-3xl font-bold mt-2">
                {stat.value}
                <span className="text-sm font-normal ml-1">{stat.unit}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* タブナビゲーション */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs opacity-70">{tab.description}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* タブコンテンツ */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={animations.spring.gentle}
      >
        {activeTab === 'bulk_message' && bulkService && (
          <BulkMessageComposer
            tenantId={tenant?.id || ''}
            onMessageSent={(messageId) => {
              console.log('Message sent:', messageId);
              // 統計を再読込
              if (reminderService && bulkService) {
                loadStats(reminderService, bulkService);
              }
            }}
          />
        )}

        {activeTab === 'reminders' && (
          <ReminderSettings />
        )}

        {activeTab === 'history' && (
          <Card>
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                配信履歴
              </h3>
              <p className="text-gray-600 mb-6">
                過去の一斉配信履歴と結果を確認できます
              </p>
              <Button variant="secondary">履歴を表示</Button>
            </div>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <Card>
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                分析・レポート
              </h3>
              <p className="text-gray-600 mb-6">
                配信効果と顧客の反応を分析します
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">85%</div>
                  <div className="text-sm text-blue-700">配信成功率</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">32%</div>
                  <div className="text-sm text-green-700">開封率</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">12%</div>
                  <div className="text-sm text-purple-700">予約転換率</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* ライトプラン制限通知 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ...animations.spring.gentle }}
        className="mt-8"
      >
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <MegaphoneIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-primary-800">ライトプラン制限</h3>
              <p className="text-sm text-primary-700">
                月間200通までメッセージ配信が可能です。現在の使用量: {stats.total_recipients_month}/200通
              </p>
            </div>
            <div className="text-primary-600">
              <div className="w-16 h-2 bg-primary-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${Math.min((stats.total_recipients_month / 200) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}