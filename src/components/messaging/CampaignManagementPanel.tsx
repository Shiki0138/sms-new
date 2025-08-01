import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MegaphoneIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  PaperAirplaneIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { BulkMessagingService } from '../../services/bulk-messaging-service';
import { 
  Campaign,
  CampaignAnalytics,
  MessageTemplate,
  CustomerSegment,
  BulkMessageRequest,
  SchedulingOptions,
} from '../../types/bulk-messaging';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CampaignManagementPanelProps {
  tenantId: string;
  onCampaignUpdate?: () => void;
}

const CAMPAIGN_STATUS_CONFIG = {
  draft: { label: '下書き', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: '📝' },
  scheduled: { label: '予約済み', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '⏰' },
  active: { label: '配信中', color: 'text-green-600', bgColor: 'bg-green-100', icon: '🚀' },
  paused: { label: '一時停止', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '⏸️' },
  completed: { label: '完了', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: '✅' },
  cancelled: { label: 'キャンセル', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❌' },
};

export default function CampaignManagementPanel({
  tenantId,
  onCampaignUpdate,
}: CampaignManagementPanelProps) {
  const [service] = useState(() => new BulkMessagingService(tenantId));
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled' | 'completed' | 'all'>('active');

  // Form state
  const [formData, setFormData] = useState<BulkMessageRequest>({
    campaign_name: '',
    description: '',
    template_id: '',
    subject: '',
    content: '',
    target_segments: [],
    target_filters: {},
    send_channels: ['line'],
    scheduled_at: '',
  });

  const [schedulingOptions, setSchedulingOptions] = useState<SchedulingOptions>({
    send_immediately: true,
    respect_customer_preferences: true,
    optimal_send_time: false,
    batch_size: 100,
    batch_delay_minutes: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, segmentsData] = await Promise.all([
        service.getMessageTemplates('campaign'),
        service.getCustomerSegments(),
      ]);
      setTemplates(templatesData);
      setSegments(segmentsData);
      
      // TODO: Load campaigns from database
      // For now, use mock data
      setCampaigns([
        {
          id: '1',
          tenant_id: tenantId,
          name: '春のキャンペーン',
          description: '春の新メニュー紹介',
          campaign_type: 'one_time',
          status: 'completed',
          send_channels: ['line', 'email'],
          total_recipients: 250,
          sent_count: 248,
          delivered_count: 245,
          read_count: 180,
          click_count: 45,
          error_count: 2,
          target_segments: ['all-customers'],
          target_filters: {},
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          tenant_id: tenantId,
          name: '誕生日クーポン',
          description: '今月誕生日の顧客への特別オファー',
          campaign_type: 'recurring',
          status: 'active',
          send_channels: ['line'],
          total_recipients: 45,
          sent_count: 15,
          delivered_count: 15,
          read_count: 12,
          click_count: 8,
          error_count: 0,
          target_segments: ['birthday-this-month'],
          target_filters: {},
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const campaign = await service.createCampaign(formData);
      
      if (schedulingOptions.send_immediately) {
        await service.sendCampaign(campaign.id, schedulingOptions);
      }
      
      await loadData();
      setShowCreateModal(false);
      onCampaignUpdate?.();
      
      // Reset form
      setFormData({
        campaign_name: '',
        description: '',
        template_id: '',
        subject: '',
        content: '',
        target_segments: [],
        target_filters: {},
        send_channels: ['line'],
        scheduled_at: '',
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleViewAnalytics = async (campaign: Campaign) => {
    try {
      const analyticsData = await service.getCampaignAnalytics(campaign.id);
      setAnalytics(analyticsData);
      setSelectedCampaign(campaign);
      setShowAnalyticsModal(true);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    setFormData({
      campaign_name: `${campaign.name} (コピー)`,
      description: campaign.description || '',
      template_id: campaign.template_id || '',
      subject: campaign.subject || '',
      content: campaign.content || '',
      target_segments: campaign.target_segments,
      target_filters: campaign.target_filters,
      send_channels: campaign.send_channels,
      scheduled_at: '',
    });
    setShowCreateModal(true);
  };

  const getFilteredCampaigns = () => {
    switch (activeTab) {
      case 'active':
        return campaigns.filter(c => c.status === 'active');
      case 'scheduled':
        return campaigns.filter(c => c.status === 'scheduled');
      case 'completed':
        return campaigns.filter(c => ['completed', 'cancelled'].includes(c.status));
      default:
        return campaigns;
    }
  };

  const renderCampaignCard = (campaign: Campaign) => {
    const statusConfig = CAMPAIGN_STATUS_CONFIG[campaign.status];
    const deliveryRate = campaign.sent_count > 0 
      ? Math.round((campaign.delivered_count / campaign.sent_count) * 100)
      : 0;
    const openRate = campaign.delivered_count > 0
      ? Math.round((campaign.read_count / campaign.delivered_count) * 100)
      : 0;

    return (
      <motion.div
        key={campaign.id}
        layout
        whileHover={{ scale: 1.01 }}
        className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                <span className="mr-1">{statusConfig.icon}</span>
                {statusConfig.label}
              </div>
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-600">{campaign.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>作成日: {format(new Date(campaign.created_at), 'yyyy/MM/dd', { locale: ja })}</span>
              {campaign.scheduled_at && (
                <span>配信予定: {format(new Date(campaign.scheduled_at), 'MM/dd HH:mm', { locale: ja })}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleViewAnalytics(campaign)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="分析を見る"
            >
              <ChartBarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDuplicateCampaign(campaign)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="複製"
            >
              <DocumentDuplicateIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">{campaign.total_recipients}</div>
            <div className="text-xs text-gray-500">対象者</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{deliveryRate}%</div>
            <div className="text-xs text-gray-500">到達率</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{openRate}%</div>
            <div className="text-xs text-gray-500">開封率</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{campaign.click_count}</div>
            <div className="text-xs text-gray-500">クリック</div>
          </div>
        </div>

        {/* Progress Bar */}
        {campaign.status === 'active' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>配信進捗</span>
              <span>{campaign.sent_count} / {campaign.total_recipients}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(campaign.sent_count / campaign.total_recipients) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Channels */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">配信チャンネル:</span>
          {campaign.send_channels.map(channel => (
            <span
              key={channel}
              className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
            >
              {channel === 'line' ? 'LINE' : channel === 'email' ? 'メール' : 'SMS'}
            </span>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
              <MegaphoneIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">キャンペーン管理</h2>
              <p className="text-sm text-gray-600">
                マーケティングキャンペーンの作成・管理・分析
              </p>
            </div>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            新規キャンペーン
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'active', label: '配信中', count: campaigns.filter(c => c.status === 'active').length },
          { id: 'scheduled', label: '予約済み', count: campaigns.filter(c => c.status === 'scheduled').length },
          { id: 'completed', label: '完了', count: campaigns.filter(c => ['completed', 'cancelled'].includes(c.status)).length },
          { id: 'all', label: 'すべて', count: campaigns.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : getFilteredCampaigns().length > 0 ? (
        <div className="grid gap-4">
          {getFilteredCampaigns().map(campaign => renderCampaignCard(campaign))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <MegaphoneIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeTab === 'active' && '配信中のキャンペーンはありません'}
              {activeTab === 'scheduled' && '予約済みのキャンペーンはありません'}
              {activeTab === 'completed' && '完了したキャンペーンはありません'}
              {activeTab === 'all' && 'キャンペーンがまだ作成されていません'}
            </p>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(true)}
              className="mt-4"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              最初のキャンペーンを作成
            </Button>
          </div>
        </Card>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">新規キャンペーン作成</h3>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      キャンペーン名 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.campaign_name}
                      onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                      placeholder="例: 春の特別キャンペーン"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      説明
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="キャンペーンの概要"
                    />
                  </div>
                </div>

                {/* Target Segments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    配信対象セグメント <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {segments.map(segment => (
                      <motion.button
                        key={segment.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const isSelected = formData.target_segments.includes(segment.id);
                          setFormData({
                            ...formData,
                            target_segments: isSelected
                              ? formData.target_segments.filter(id => id !== segment.id)
                              : [...formData.target_segments, segment.id],
                          });
                        }}
                        className={`p-4 border rounded-lg text-left transition-all ${
                          formData.target_segments.includes(segment.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{segment.name}</div>
                            <div className="text-xs text-gray-500">{segment.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary-600">
                              {segment.customer_count || 0}
                            </div>
                            <div className="text-xs text-gray-500">顧客</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  {formData.target_segments.length > 0 && (
                    <div className="mt-2 text-sm text-primary-600">
                      選択中: {formData.target_segments.length}セグメント
                    </div>
                  )}
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    テンプレート選択
                  </label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => {
                      const template = templates.find(t => t.id === e.target.value);
                      setFormData({
                        ...formData,
                        template_id: e.target.value,
                        content: template?.content || formData.content,
                        subject: template?.subject || formData.subject,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">カスタムメッセージ</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージ内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="{customer_name}様&#10;&#10;特別なお知らせです..."
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    使用可能な変数: {'{customer_name}'}, {'{salon_name}'}, {'{visit_count}'}
                  </div>
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    配信チャンネル <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-3">
                    {[
                      { id: 'line', name: 'LINE', icon: '💬' },
                      { id: 'email', name: 'メール', icon: '✉️' },
                      { id: 'sms', name: 'SMS', icon: '📱' },
                    ].map(channel => (
                      <label
                        key={channel.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex-1"
                      >
                        <input
                          type="checkbox"
                          checked={formData.send_channels.includes(channel.id as any)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                send_channels: [...formData.send_channels, channel.id as any],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                send_channels: formData.send_channels.filter(c => c !== channel.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="ml-3">
                          <span className="text-lg mr-2">{channel.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email Subject */}
                {formData.send_channels.includes('email') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メール件名 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="【重要】特別キャンペーンのお知らせ"
                    />
                  </div>
                )}

                {/* Scheduling */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    配信スケジュール
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={schedulingOptions.send_immediately === true}
                        onChange={() => setSchedulingOptions({ ...schedulingOptions, send_immediately: true })}
                        className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">今すぐ配信</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={schedulingOptions.send_immediately === false}
                        onChange={() => setSchedulingOptions({ ...schedulingOptions, send_immediately: false })}
                        className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">予約配信</span>
                    </label>
                    {!schedulingOptions.send_immediately && (
                      <div className="ml-6">
                        <Input
                          type="datetime-local"
                          value={formData.scheduled_at}
                          onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">詳細オプション</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={schedulingOptions.respect_customer_preferences}
                        onChange={(e) => setSchedulingOptions({
                          ...schedulingOptions,
                          respect_customer_preferences: e.target.checked,
                        })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        顧客の配信希望時間を考慮する
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={schedulingOptions.optimal_send_time}
                        onChange={(e) => setSchedulingOptions({
                          ...schedulingOptions,
                          optimal_send_time: e.target.checked,
                        })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        最適な配信時間を自動計算
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleCreateCampaign}
                  disabled={
                    !formData.campaign_name ||
                    !formData.content ||
                    formData.target_segments.length === 0 ||
                    formData.send_channels.length === 0
                  }
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  キャンペーンを作成
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalyticsModal && analytics && selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAnalyticsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedCampaign.name}</h3>
                  <p className="text-sm text-gray-600">キャンペーン分析</p>
                </div>
                <button
                  onClick={() => setShowAnalyticsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{analytics.total_recipients}</div>
                    <div className="text-sm text-gray-500">配信対象</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{analytics.delivery_rate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">到達率</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{analytics.open_rate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">開封率</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{analytics.click_rate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">クリック率</div>
                  </div>
                </Card>
              </div>

              {/* Channel Stats */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">チャンネル別パフォーマンス</h4>
                <div className="space-y-3">
                  {analytics.channel_stats.map(stat => (
                    <div key={stat.channel} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {stat.channel === 'line' ? 'LINE' : stat.channel === 'email' ? 'メール' : 'SMS'}
                        </span>
                        <span className="text-sm text-gray-500">{stat.sent}件送信</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold text-green-600">
                            {stat.sent > 0 ? Math.round((stat.delivered / stat.sent) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500">到達率</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-blue-600">
                            {stat.delivered > 0 ? Math.round((stat.opened / stat.delivered) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500">開封率</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-purple-600">
                            {stat.delivered > 0 ? Math.round((stat.clicked / stat.delivered) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500">クリック率</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-red-600">{stat.failed}</div>
                          <div className="text-xs text-gray-500">失敗</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Summary */}
              {analytics.error_count > 0 && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700">
                      {analytics.error_count}件の配信エラー
                    </span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    エラー率: {analytics.error_rate.toFixed(1)}%
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}