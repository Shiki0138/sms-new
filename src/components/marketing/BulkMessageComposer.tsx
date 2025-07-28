import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperAirplaneIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { BulkMessagingService, CustomerSegment } from '../../services/bulk-messaging-service';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

interface BulkMessageComposerProps {
  tenantId: string;
  onMessageSent?: (messageId: string) => void;
  className?: string;
}

export default function BulkMessageComposer({
  tenantId,
  onMessageSent,
  className = '',
}: BulkMessageComposerProps) {
  const [bulkService] = useState(() => new BulkMessagingService(tenantId));
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const [messageData, setMessageData] = useState({
    campaign_name: '',
    message_type: 'campaign' as 'campaign' | 'announcement' | 'reminder',
    subject: '',
    content: '',
    send_channels: ['line', 'instagram', 'email'] as Array<'line' | 'instagram' | 'email'>,
    scheduled_at: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // セグメント一覧を取得
    const defaultSegments = bulkService.getDefaultSegments();
    setSegments(defaultSegments);
  }, [bulkService]);

  useEffect(() => {
    // 選択されたセグメントの対象顧客数を計算
    if (selectedSegments.length > 0) {
      calculateRecipientCount();
    } else {
      setRecipientCount(0);
    }
  }, [selectedSegments]);

  const calculateRecipientCount = async () => {
    try {
      let totalCount = 0;
      const processedCustomers = new Set();

      for (const segmentId of selectedSegments) {
        const customers = await bulkService.getCustomersBySegment(segmentId);
        customers.forEach(customer => {
          if (!processedCustomers.has(customer.id)) {
            processedCustomers.add(customer.id);
            totalCount++;
          }
        });
      }

      setRecipientCount(totalCount);
    } catch (error) {
      console.error('Error calculating recipient count:', error);
      setRecipientCount(0);
    }
  };

  const handleSegmentToggle = (segmentId: string) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId)
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const handleTemplateSelect = (template: any) => {
    setMessageData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content,
      campaign_name: template.name,
    }));
    setActiveTemplate(template.name);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!messageData.campaign_name.trim()) {
      newErrors.campaign_name = 'キャンペーン名は必須です';
    }

    if (!messageData.content.trim()) {
      newErrors.content = 'メッセージ内容は必須です';
    }

    if (selectedSegments.length === 0) {
      newErrors.segments = '配信対象を選択してください';
    }

    if (messageData.send_channels.includes('email') && !messageData.subject.trim()) {
      newErrors.subject = 'メール配信を含む場合、件名は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 一斉送信メッセージを作成
      const message = await bulkService.createBulkMessage({
        ...messageData,
        target_segments: selectedSegments,
      });

      // 即座に送信または後でスケジュール
      if (messageData.scheduled_at) {
        // スケジュール送信の場合は後で処理
        console.log('Scheduled for:', messageData.scheduled_at);
      } else {
        // 即座に送信
        await bulkService.sendBulkMessage(message.id);
      }

      onMessageSent?.(message.id);
      
      // フォームをリセット
      setMessageData({
        campaign_name: '',
        message_type: 'campaign',
        subject: '',
        content: '',
        send_channels: ['line', 'instagram', 'email'],
        scheduled_at: '',
      });
      setSelectedSegments([]);
      setActiveTemplate(null);

    } catch (error) {
      console.error('Error sending bulk message:', error);
      setErrors({ general: 'メッセージの送信に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const emergencyTemplates = bulkService.getEmergencyTemplates();

  const messageTypeOptions = [
    { value: 'campaign', label: 'キャンペーン', icon: '🎉', color: 'text-green-600' },
    { value: 'announcement', label: 'お知らせ', icon: '📢', color: 'text-blue-600' },
    { value: 'reminder', label: 'リマインダー', icon: '⏰', color: 'text-orange-600' },
  ];

  const channelOptions = [
    { value: 'line', label: 'LINE', icon: '💬', color: 'text-green-500' },
    { value: 'instagram', label: 'Instagram', icon: '📷', color: 'text-pink-500' },
    { value: 'email', label: 'メール', icon: '✉️', color: 'text-blue-500' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">一斉メッセージ配信</h2>
              <p className="text-sm text-gray-600">
                セグメント別に顧客へメッセージを配信します
              </p>
            </div>
          </div>

          {recipientCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="text-2xl font-bold text-primary-600">{recipientCount}</div>
              <div className="text-xs text-gray-500">配信対象</div>
            </motion.div>
          )}
        </div>

        {/* エラー表示 */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
          >
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700">{errors.general}</span>
          </motion.div>
        )}

        {/* テンプレート選択 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">定型テンプレート</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {emergencyTemplates.map((template, index) => (
              <motion.button
                key={template.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTemplateSelect(template)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  activeTemplate === template.name
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {template.content.slice(0, 50)}...
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 基本情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キャンペーン名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={messageData.campaign_name}
              onChange={(e) => setMessageData(prev => ({ ...prev, campaign_name: e.target.value }))}
              error={errors.campaign_name}
              placeholder="春のキャンペーン"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メッセージタイプ
            </label>
            <select
              value={messageData.message_type}
              onChange={(e) => setMessageData(prev => ({ ...prev, message_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {messageTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 配信チャンネル */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            配信チャンネル（優先順位順）
          </label>
          <div className="flex flex-wrap gap-2">
            {channelOptions.map((channel, index) => (
              <motion.label
                key={channel.value}
                whileHover={{ scale: 1.02 }}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg cursor-pointer transition-all ${
                  messageData.send_channels.includes(channel.value as any)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={messageData.send_channels.includes(channel.value as any)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMessageData(prev => ({
                        ...prev,
                        send_channels: [...prev.send_channels, channel.value as any]
                      }));
                    } else {
                      setMessageData(prev => ({
                        ...prev,
                        send_channels: prev.send_channels.filter(c => c !== channel.value)
                      }));
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-lg">{channel.icon}</span>
                <span className={`text-sm font-medium ${channel.color}`}>
                  {channel.label}
                </span>
                {index + 1 < messageData.send_channels.length && (
                  <span className="text-xs text-gray-500">優先度{index + 1}</span>
                )}
              </motion.label>
            ))}
          </div>
        </div>

        {/* メール件名 */}
        {messageData.send_channels.includes('email') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メール件名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={messageData.subject}
              onChange={(e) => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
              error={errors.subject}
              placeholder="【重要】特別キャンペーンのお知らせ"
            />
          </motion.div>
        )}

        {/* メッセージ内容 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メッセージ内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={messageData.content}
            onChange={(e) => setMessageData(prev => ({ ...prev, content: e.target.value }))}
            rows={8}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.content ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="{{customer_name}}様

いつもご利用いただきありがとうございます✨

特別キャンペーンのお知らせです..."
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            使用可能な変数: {{'{'}customer_name{'}'}}, {{'{'}phone{'}'}}, {{'{'}last_visit{'}'}}, {{'{'}visit_count{'}'}}}
          </div>
        </div>

        {/* 配信予約 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            配信予約（空白の場合は即座に送信）
          </label>
          <Input
            type="datetime-local"
            value={messageData.scheduled_at}
            onChange={(e) => setMessageData(prev => ({ ...prev, scheduled_at: e.target.value }))}
          />
        </div>
      </Card>

      {/* 配信対象選択 */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">配信対象セグメント</h3>
        
        {errors.segments && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.segments}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((segment) => (
            <motion.div
              key={segment.id}
              whileHover={{ scale: 1.02 }}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedSegments.includes(segment.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSegmentToggle(segment.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedSegments.includes(segment.id)}
                      readOnly
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <h4 className="font-medium text-gray-900">{segment.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{segment.description}</p>
                </div>
                <UserGroupIcon className="h-5 w-5 text-gray-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* 送信ボタン */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={() => {
            setMessageData({
              campaign_name: '',
              message_type: 'campaign',
              subject: '',
              content: '',
              send_channels: ['line', 'instagram', 'email'],
              scheduled_at: '',
            });
            setSelectedSegments([]);
            setActiveTemplate(null);
            setErrors({});
          }}
        >
          リセット
        </Button>

        <Button
          onClick={handleSend}
          disabled={loading || recipientCount === 0}
          className="min-w-[120px]"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>送信中...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <PaperAirplaneIcon className="h-4 w-4" />
              <span>
                {messageData.scheduled_at ? 'スケジュール' : '今すぐ送信'}
                {recipientCount > 0 && ` (${recipientCount}名)`}
              </span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}