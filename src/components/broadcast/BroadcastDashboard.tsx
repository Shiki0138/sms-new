import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  StopIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface BroadcastStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  deliveryRate: number;
  channelStats: {
    line: { sent: number; delivered: number; read: number };
    instagram: { sent: number; delivered: number; read: number };
    sms: { sent: number; delivered: number; read: number };
    email: { sent: number; delivered: number; read: number };
  };
}

interface Campaign {
  id: string;
  name: string;
  type: 'campaign' | 'holiday' | 'emergency' | 'promotion';
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
  channels: Array<'line' | 'instagram' | 'sms' | 'email'>;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  scheduledAt?: string;
  createdAt: string;
  completedAt?: string;
}

interface BroadcastDashboardProps {
  tenantId: string;
  className?: string;
}

export default function BroadcastDashboard({ 
  tenantId, 
  className = '' 
}: BroadcastDashboardProps) {
  const [stats, setStats] = useState<BroadcastStats>({
    totalCampaigns: 45,
    activeCampaigns: 3,
    totalSent: 12847,
    deliveryRate: 94.2,
    channelStats: {
      line: { sent: 8234, delivered: 7891, read: 6789 },
      instagram: { sent: 2341, delivered: 2198, read: 1876 },
      sms: { sent: 1678, delivered: 1632, read: 1534 },
      email: { sent: 594, delivered: 541, read: 423 },
    },
  });

  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: '春の特別キャンペーン',
      type: 'campaign',
      status: 'sending',
      channels: ['line', 'instagram', 'email'],
      targetCount: 1200,
      sentCount: 856,
      deliveredCount: 823,
      readCount: 654,
      scheduledAt: '2025-08-01T10:00:00Z',
      createdAt: '2025-07-30T14:30:00Z',
    },
    {
      id: '2', 
      name: '年末年始休業のお知らせ',
      type: 'holiday',
      status: 'completed',
      channels: ['line', 'sms', 'email'],
      targetCount: 2340,
      sentCount: 2340,
      deliveredCount: 2198,
      readCount: 1987,
      scheduledAt: '2024-12-25T09:00:00Z',
      createdAt: '2024-12-20T16:00:00Z',
      completedAt: '2024-12-25T12:45:00Z',
    },
    {
      id: '3',
      name: '緊急メンテナンス通知',
      type: 'emergency',
      status: 'scheduled',
      channels: ['line', 'sms'],
      targetCount: 3456,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      scheduledAt: '2025-08-02T08:00:00Z',
      createdAt: '2025-08-01T11:15:00Z',
    },
  ]);

  const [loading, setLoading] = useState(false);

  // リアルタイム更新シミュレーション
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentCampaigns(prev => 
        prev.map(campaign => {
          if (campaign.status === 'sending') {
            const increment = Math.floor(Math.random() * 5) + 1;
            return {
              ...campaign,
              sentCount: Math.min(campaign.sentCount + increment, campaign.targetCount),
              deliveredCount: Math.min(campaign.deliveredCount + increment - 1, campaign.sentCount),
              readCount: Math.min(campaign.readCount + Math.floor(increment * 0.8), campaign.deliveredCount),
            };
          }
          return campaign;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'sending': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return ClockIcon;
      case 'scheduled': return ClockIcon;
      case 'sending': return PaperAirplaneIcon;
      case 'completed': return CheckCircleIcon;
      case 'paused': return StopIcon;
      default: return ClockIcon;
    }
  };

  const getTypeLabel = (type: Campaign['type']) => {
    switch (type) {
      case 'campaign': return { label: 'キャンペーン', icon: '🎉', color: 'text-purple-600' };
      case 'holiday': return { label: '休業通知', icon: '🗓️', color: 'text-blue-600' };
      case 'emergency': return { label: '緊急', icon: '🚨', color: 'text-red-600' };
      case 'promotion': return { label: 'お得情報', icon: '💰', color: 'text-green-600' };
      default: return { label: 'その他', icon: '📢', color: 'text-gray-600' };
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'line': return { icon: ChatBubbleLeftRightIcon, color: 'text-green-500', label: 'LINE' };
      case 'instagram': return { icon: DevicePhoneMobileIcon, color: 'text-pink-500', label: 'Instagram' };
      case 'sms': return { icon: DevicePhoneMobileIcon, color: 'text-blue-500', label: 'SMS' };
      case 'email': return { icon: EnvelopeIcon, color: 'text-gray-500', label: 'メール' };
      default: return { icon: ChatBubbleLeftRightIcon, color: 'text-gray-500', label: channel };
    }
  };

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.targetCount === 0) return 0;
    return (campaign.sentCount / campaign.targetCount) * 100;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配信管理ダッシュボード</h1>
          <p className="text-gray-600">多チャンネル配信システムの統合管理</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" size="sm">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            レポート
          </Button>
          <Button size="sm">
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            新規配信
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="text-center">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-4">
                <ChartBarIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</div>
              <div className="text-sm text-gray-600">総キャンペーン数</div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="text-center">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mb-4">
                <PaperAirplaneIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</div>
              <div className="text-sm text-gray-600">実行中配信</div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="text-center">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-4">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSent.toLocaleString()}</div>
              <div className="text-sm text-gray-600">総送信数</div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="text-center">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-4">
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.deliveryRate}%</div>
              <div className="text-sm text-gray-600">配信成功率</div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* チャンネル別統計 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">チャンネル別配信統計</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(stats.channelStats).map(([channel, stats]) => {
              const channelInfo = getChannelIcon(channel);
              const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : 0;
              const readRate = stats.delivered > 0 ? (stats.read / stats.delivered * 100).toFixed(1) : 0;
              
              return (
                <motion.div
                  key={channel}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <channelInfo.icon className={`h-5 w-5 ${channelInfo.color}`} />
                    <span className="font-medium text-gray-900">{channelInfo.label}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">送信</span>
                      <span className="font-medium">{stats.sent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">配信率</span>
                      <span className="font-medium text-green-600">{deliveryRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">開封率</span>
                      <span className="font-medium text-blue-600">{readRate}%</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* リアルタイム配信状況 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">リアルタイム配信状況</h3>
            <motion.div
              animate={{ rotate: loading ? 360 : 0 }}
              transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
            >
              <Button variant="ghost" size="sm" onClick={() => setLoading(!loading)}>
                🔄 更新
              </Button>
            </motion.div>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {recentCampaigns.map((campaign, index) => {
                const StatusIcon = getStatusIcon(campaign.status);
                const typeInfo = getTypeLabel(campaign.type);
                const progress = calculateProgress(campaign);

                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{typeInfo.icon}</span>
                          <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            <StatusIcon className="h-3 w-3 inline mr-1" />
                            {campaign.status === 'draft' && '下書き'}
                            {campaign.status === 'scheduled' && '予約中'}
                            {campaign.status === 'sending' && '送信中'}
                            {campaign.status === 'completed' && '完了'}
                            {campaign.status === 'paused' && '一時停止'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>対象: {campaign.targetCount.toLocaleString()}名</span>
                          <span>送信: {campaign.sentCount.toLocaleString()}</span>
                          <span>配信: {campaign.deliveredCount.toLocaleString()}</span>
                          <span>開封: {campaign.readCount.toLocaleString()}</span>
                        </div>

                        {/* プログレスバー */}
                        {campaign.status === 'sending' && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>進捗状況</span>
                              <span>{progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div
                                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* チャンネル表示 */}
                        <div className="flex items-center space-x-2 mt-3">
                          {campaign.channels.map(channel => {
                            const channelInfo = getChannelIcon(channel);
                            return (
                              <div
                                key={channel}
                                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                              >
                                <channelInfo.icon className={`h-3 w-3 ${channelInfo.color}`} />
                                <span>{channelInfo.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        {campaign.status === 'sending' && (
                          <Button variant="ghost" size="sm">
                            <StopIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button variant="ghost" size="sm">
                            <PlayIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}