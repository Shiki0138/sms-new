import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  BellIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { BulkMessagingService } from '../../services/bulk-messaging-service';
import { 
  ReminderRule, 
  MessageTemplate, 
  TriggerType,
  DEFAULT_TEMPLATE_VARIABLES,
} from '../../types/bulk-messaging';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface ReminderSettingsPanelProps {
  tenantId: string;
  onSettingsUpdate?: () => void;
}

const TRIGGER_TYPES = [
  { 
    id: 'before_appointment' as TriggerType, 
    name: '予約前リマインダー', 
    icon: CalendarIcon,
    description: '予約日時の前に送信',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    timingOptions: [
      { label: '1週間前', value: 10080 },
      { label: '3日前', value: 4320 },
      { label: '1日前', value: 1440 },
      { label: '当日朝（8時間前）', value: 480 },
      { label: '2時間前', value: 120 },
      { label: '1時間前', value: 60 },
    ],
  },
  { 
    id: 'after_appointment' as TriggerType, 
    name: '来店後フォローアップ', 
    icon: CheckCircleIcon,
    description: '来店後に送信',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    timingOptions: [
      { label: '当日（2時間後）', value: 120 },
      { label: '翌日', value: 1440 },
      { label: '1週間後', value: 10080 },
      { label: '1ヶ月後', value: 43200 },
    ],
  },
  { 
    id: 'no_visit' as TriggerType, 
    name: '再来店促進', 
    icon: ExclamationTriangleIcon,
    description: '一定期間来店がない場合',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    timingOptions: [
      { label: '1ヶ月後', value: 43200 },
      { label: '2ヶ月後', value: 86400 },
      { label: '3ヶ月後', value: 129600 },
      { label: '6ヶ月後', value: 259200 },
    ],
  },
  { 
    id: 'birthday' as TriggerType, 
    name: '誕生日メッセージ', 
    icon: '🎂',
    description: '誕生日の前後に送信',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    timingOptions: [
      { label: '当日', value: 0 },
      { label: '1週間前', value: -10080 },
      { label: '3日前', value: -4320 },
      { label: '1日前', value: -1440 },
    ],
  },
];

const CHANNEL_OPTIONS = [
  { id: 'line', name: 'LINE', icon: ChatBubbleLeftRightIcon },
  { id: 'email', name: 'メール', icon: EnvelopeIcon },
  { id: 'sms', name: 'SMS', icon: DevicePhoneMobileIcon },
];

export default function ReminderSettingsPanel({
  tenantId,
  onSettingsUpdate,
}: ReminderSettingsPanelProps) {
  const [service] = useState(() => new BulkMessagingService(tenantId));
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [selectedTriggerType, setSelectedTriggerType] = useState<TriggerType>('before_appointment');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'before_appointment' as TriggerType,
    trigger_timing: 10080,
    template_id: '',
    send_channels: ['line'] as ('line' | 'email' | 'sms')[],
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesData, templatesData] = await Promise.all([
        service.getReminderRules(),
        service.getMessageTemplates('reminder'),
      ]);
      setRules(rulesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      trigger_type: 'before_appointment',
      trigger_timing: 10080,
      template_id: '',
      send_channels: ['line'],
      is_active: true,
    });
    setShowAddModal(true);
  };

  const handleEditRule = (rule: ReminderRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      trigger_type: rule.trigger_type,
      trigger_timing: rule.trigger_timing,
      template_id: rule.template_id || '',
      send_channels: rule.send_channels,
      is_active: rule.is_active,
    });
    setShowAddModal(true);
  };

  const handleSaveRule = async () => {
    setSaving(true);
    try {
      if (editingRule) {
        await service.updateReminderRule(editingRule.id, {
          ...formData,
          conditions: {},
        });
      } else {
        await service.createReminderRule({
          ...formData,
          conditions: {},
        });
      }
      await loadData();
      setShowAddModal(false);
      onSettingsUpdate?.();
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (rule: ReminderRule) => {
    try {
      await service.updateReminderRule(rule.id, {
        is_active: !rule.is_active,
      });
      await loadData();
      onSettingsUpdate?.();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このリマインダールールを削除してもよろしいですか？')) return;

    try {
      await service.updateReminderRule(ruleId, {
        is_active: false,
      });
      await loadData();
      onSettingsUpdate?.();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const getTriggerTypeInfo = (type: TriggerType) => {
    return TRIGGER_TYPES.find(t => t.id === type);
  };

  const formatTiming = (minutes: number, triggerType: TriggerType) => {
    const typeInfo = getTriggerTypeInfo(triggerType);
    const option = typeInfo?.timingOptions.find(o => o.value === minutes);
    if (option) return option.label;

    const hours = Math.floor(Math.abs(minutes) / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks}週間${minutes < 0 ? '前' : '後'}`;
    if (days > 0) return `${days}日${minutes < 0 ? '前' : '後'}`;
    if (hours > 0) return `${hours}時間${minutes < 0 ? '前' : '後'}`;
    return `${Math.abs(minutes)}分${minutes < 0 ? '前' : '後'}`;
  };

  const renderRuleCard = (rule: ReminderRule) => {
    const typeInfo = getTriggerTypeInfo(rule.trigger_type);
    const template = templates.find(t => t.id === rule.template_id);

    return (
      <motion.div
        key={rule.id}
        layout
        whileHover={{ scale: 1.01 }}
        className={`p-6 border rounded-xl transition-all ${
          rule.is_active 
            ? 'border-gray-200 bg-white shadow-sm' 
            : 'border-gray-100 bg-gray-50 opacity-60'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className={`p-3 rounded-lg ${typeInfo?.bgColor || 'bg-gray-100'}`}>
              {typeof typeInfo?.icon === 'string' ? (
                <span className="text-2xl">{typeInfo.icon}</span>
              ) : (
                typeInfo?.icon && <typeInfo.icon className={`h-6 w-6 ${typeInfo.color}`} />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{rule.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{typeInfo?.description}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-500">
                  タイミング: <span className="font-medium text-gray-700">
                    {formatTiming(rule.trigger_timing, rule.trigger_type)}
                  </span>
                </span>
                {template && (
                  <button
                    onClick={() => {
                      setPreviewTemplate(template);
                      setShowTemplatePreview(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    テンプレートを見る
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleToggleRule(rule)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                rule.is_active ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  rule.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </motion.button>

            <button
              onClick={() => handleEditRule(rule)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <PencilIcon className="h-4 w-4" />
            </button>

            <button
              onClick={() => handleDeleteRule(rule.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Channels */}
        <div className="flex items-center space-x-2 mt-4">
          <span className="text-sm text-gray-500">配信チャンネル:</span>
          <div className="flex items-center space-x-2">
            {rule.send_channels.map(channel => {
              const channelInfo = CHANNEL_OPTIONS.find(c => c.id === channel);
              return (
                <div
                  key={channel}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-md"
                >
                  {channelInfo && <channelInfo.icon className="h-3 w-3 text-gray-600" />}
                  <span className="text-xs text-gray-700">{channelInfo?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
              <BellIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">自動リマインダー設定</h2>
              <p className="text-sm text-gray-600">
                予約や来店に基づいて自動的にメッセージを送信
              </p>
            </div>
          </div>

          <Button onClick={handleAddRule}>
            <PlusIcon className="h-4 w-4 mr-2" />
            リマインダーを追加
          </Button>
        </div>
      </Card>

      {/* Reminder Rules by Type */}
      {TRIGGER_TYPES.map(type => {
        const typeRules = rules.filter(r => r.trigger_type === type.id);
        if (typeRules.length === 0) return null;

        return (
          <div key={type.id}>
            <div className="flex items-center space-x-2 mb-4">
              <div className={`p-2 rounded-lg ${type.bgColor}`}>
                {typeof type.icon === 'string' ? (
                  <span className="text-lg">{type.icon}</span>
                ) : (
                  <type.icon className={`h-5 w-5 ${type.color}`} />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900">{type.name}</h3>
              <span className="text-sm text-gray-500">({typeRules.length}件)</span>
            </div>
            <div className="space-y-4">
              {typeRules.map(rule => renderRuleCard(rule))}
            </div>
          </div>
        );
      })}

      {rules.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">リマインダーが設定されていません</p>
            <p className="text-sm text-gray-400 mt-2">
              自動リマインダーを設定して、顧客エンゲージメントを向上させましょう
            </p>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {editingRule ? 'リマインダーを編集' : '新しいリマインダー'}
              </h3>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    リマインダー名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: 1週間前リマインダー"
                  />
                </div>

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    トリガータイプ <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TRIGGER_TYPES.map(type => (
                      <motion.button
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            trigger_type: type.id,
                            trigger_timing: type.timingOptions[0].value,
                          });
                          setSelectedTriggerType(type.id);
                        }}
                        className={`p-4 border rounded-lg text-left transition-all ${
                          formData.trigger_type === type.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${type.bgColor}`}>
                            {typeof type.icon === 'string' ? (
                              <span className="text-lg">{type.icon}</span>
                            ) : (
                              <type.icon className={`h-5 w-5 ${type.color}`} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{type.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    送信タイミング <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {getTriggerTypeInfo(formData.trigger_type)?.timingOptions.map(option => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({ ...formData, trigger_timing: option.value })}
                        className={`p-3 border rounded-lg text-sm ${
                          formData.trigger_timing === option.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージテンプレート
                  </label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">デフォルトテンプレート</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {formData.template_id && (
                    <button
                      onClick={() => {
                        const template = templates.find(t => t.id === formData.template_id);
                        if (template) {
                          setPreviewTemplate(template);
                          setShowTemplatePreview(true);
                        }
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                    >
                      テンプレートをプレビュー
                    </button>
                  )}
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    配信チャンネル <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {CHANNEL_OPTIONS.map(channel => (
                      <label
                        key={channel.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
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
                        <div className="ml-3 flex items-center space-x-2">
                          <channel.icon className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveRule}
                  disabled={saving || !formData.name || formData.send_channels.length === 0}
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>保存中...</span>
                    </div>
                  ) : (
                    editingRule ? '更新' : '作成'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {showTemplatePreview && previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTemplatePreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-lg w-full"
            >
              <div className="flex items-start space-x-3 mb-4">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{previewTemplate.name}</h3>
                  <p className="text-sm text-gray-500">テンプレートプレビュー</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {previewTemplate.content}
                </pre>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">使用可能な変数:</h4>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TEMPLATE_VARIABLES.map(variable => (
                    <span
                      key={variable.name}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs"
                    >
                      {`{${variable.name}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowTemplatePreview(false)}
                >
                  閉じる
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}