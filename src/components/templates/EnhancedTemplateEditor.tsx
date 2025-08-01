import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  VariableIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TagIcon,
  SparklesIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { TemplateManagementService, MessageTemplate, TemplateVariable, TemplatePreview } from '../../services/template-management-service';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface EnhancedTemplateEditorProps {
  tenantId: string;
  template?: MessageTemplate | null;
  onSave?: (template: MessageTemplate) => void;
  onCancel?: () => void;
  initialCategory?: string;
}

const CATEGORY_CONFIG = {
  campaign: { 
    label: 'キャンペーン', 
    icon: '📣', 
    color: 'text-green-600', 
    bgColor: 'bg-green-50',
    description: '新メニュー、割引キャンペーン、期間限定オファー'
  },
  holiday: { 
    label: '休業通知', 
    icon: '🗓️', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    description: '年末年始、ゴールデンウィーク、定期休業日'
  },
  emergency: { 
    label: '緊急連絡', 
    icon: '🚨', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    description: '臨時休業、営業時間変更、重要なお知らせ'
  },
  special_offer: { 
    label: 'お得な情報', 
    icon: '🎁', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    description: '会員特典、誕生日特典、リピーター割引'
  },
  reminder: { 
    label: 'リマインダー', 
    icon: '⏰', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50',
    description: '予約リマインダー、フォローアップメッセージ'
  },
  custom: { 
    label: 'カスタム', 
    icon: '✏️', 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50',
    description: 'その他のカスタムメッセージ'
  }
};

const CHANNEL_CONFIG = {
  line: {
    label: 'LINE',
    icon: ChatBubbleLeftRightIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    maxLength: 2000,
    features: ['rich_text', 'emoji', 'links']
  },
  email: {
    label: 'メール',
    icon: EnvelopeIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    maxLength: 10000,
    features: ['html', 'subject', 'attachments']
  },
  sms: {
    label: 'SMS',
    icon: DevicePhoneMobileIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    maxLength: 160,
    features: ['plain_text_only']
  }
};

export default function EnhancedTemplateEditor({
  tenantId,
  template,
  onSave,
  onCancel,
  initialCategory = 'campaign'
}: EnhancedTemplateEditorProps) {
  const [service] = useState(() => new TemplateManagementService(tenantId));
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'line' | 'email' | 'sms'>('line');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<TemplatePreview[]>([]);
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || initialCategory,
    sub_category: template?.sub_category || '',
    line_content: template?.line_content || '',
    email_content: template?.email_content || '',
    email_subject: template?.email_subject || '',
    sms_content: template?.sms_content || '',
    variables: template?.variables || [],
    metadata: template?.metadata || {},
    valid_from: template?.valid_from || '',
    valid_until: template?.valid_until || '',
    is_active: template?.is_active ?? true
  });

  const contentRefs = {
    line: useRef<HTMLTextAreaElement>(null),
    email: useRef<HTMLTextAreaElement>(null),
    sms: useRef<HTMLTextAreaElement>(null)
  };

  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      const data = await service.getTemplateVariables();
      setVariables(data);
    } catch (error) {
      console.error('Error loading variables:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templateData = {
        ...formData,
        variables: extractAllVariables()
      };

      let savedTemplate: MessageTemplate;
      if (template?.id) {
        savedTemplate = await service.updateTemplate(template.id, templateData);
      } else {
        savedTemplate = await service.createTemplate(templateData);
      }

      onSave?.(savedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!previewMode) {
      try {
        // Create a temporary template for preview
        const mockTemplate: MessageTemplate = {
          id: 'preview',
          tenant_id: tenantId,
          ...formData,
          variables: extractAllVariables(),
          version: 1,
          is_ab_test: false,
          is_active: true,
          is_approved: true,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Generate preview with sample customer data
        const testData = {
          appointment_date: '4月15日(月)',
          appointment_time: '14:00',
          menu_name: 'カット＋カラー',
          staff_name: '佐藤 美咲',
          duration: '120',
          discount_rate: '20',
          voucher_amount: '1000',
          special_service: 'ヘッドスパ'
        };

        const previews = await service.previewTemplate('preview', ['sample-customer'], testData);
        setPreviewData(previews);
        setPreviewMode(true);
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    } else {
      setPreviewMode(false);
    }
  };

  const extractAllVariables = (): string[] => {
    const allContent = [
      formData.line_content,
      formData.email_content,
      formData.email_subject,
      formData.sms_content
    ].join(' ');

    const matches = allContent.match(/\{([^}]+)\}/g) || [];
    const variableNames = matches.map(match => match.slice(1, -1));
    return [...new Set(variableNames)];
  };

  const insertVariable = (variableName: string) => {
    const textarea = contentRefs[activeChannel].current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = getChannelContent(activeChannel);
    
    const newContent = 
      currentContent.substring(0, start) +
      `{${variableName}}` +
      currentContent.substring(end);
    
    setChannelContent(activeChannel, newContent);

    // Reset cursor position
    setTimeout(() => {
      textarea.selectionStart = start + variableName.length + 2;
      textarea.selectionEnd = start + variableName.length + 2;
      textarea.focus();
    }, 0);

    setShowVariableMenu(false);
  };

  const getChannelContent = (channel: 'line' | 'email' | 'sms'): string => {
    switch (channel) {
      case 'line': return formData.line_content;
      case 'email': return formData.email_content;
      case 'sms': return formData.sms_content;
      default: return '';
    }
  };

  const setChannelContent = (channel: 'line' | 'email' | 'sms', content: string) => {
    switch (channel) {
      case 'line':
        setFormData({ ...formData, line_content: content });
        break;
      case 'email':
        setFormData({ ...formData, email_content: content });
        break;
      case 'sms':
        setFormData({ ...formData, sms_content: content });
        break;
    }
  };

  const getCharacterCount = (channel: 'line' | 'email' | 'sms'): number => {
    return getChannelContent(channel).length;
  };

  const getMaxLength = (channel: 'line' | 'email' | 'sms'): number => {
    return CHANNEL_CONFIG[channel].maxLength;
  };

  const isOverLimit = (channel: 'line' | 'email' | 'sms'): boolean => {
    return getCharacterCount(channel) > getMaxLength(channel);
  };

  const renderChannelEditor = (channel: 'line' | 'email' | 'sms') => {
    const config = CHANNEL_CONFIG[channel];
    const content = getChannelContent(channel);
    const charCount = getCharacterCount(channel);
    const maxLength = getMaxLength(channel);
    const isOver = isOverLimit(channel);

    return (
      <div className="space-y-4">
        {/* Email subject (email channel only) */}
        {channel === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メール件名
            </label>
            <Input
              value={formData.email_subject}
              onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
              placeholder="例: 【重要】ご予約のリマインダー"
              className="w-full"
            />
          </div>
        )}

        {/* Content editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              メッセージ内容
            </label>
            <div className="flex items-center space-x-2">
              <span className={`text-xs ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
                {charCount}/{maxLength}
              </span>
              <button
                type="button"
                onClick={() => setShowVariableMenu(!showVariableMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="変数を挿入"
              >
                <VariableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={contentRefs[channel]}
              value={content}
              onChange={(e) => setChannelContent(channel, e.target.value)}
              rows={channel === 'sms' ? 4 : 10}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                isOver ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={`${config.label}用のメッセージを入力してください...`}
              maxLength={channel === 'sms' ? maxLength : undefined}
            />

            {/* Variable Menu */}
            <AnimatePresence>
              {showVariableMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-20 max-h-80 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">変数を挿入</h4>
                    <button
                      onClick={() => setShowVariableMenu(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-1">
                    {variables.map(variable => (
                      <button
                        key={variable.id}
                        onClick={() => insertVariable(variable.name)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-sm text-primary-600">
                              {`{${variable.name}}`}
                            </div>
                            <div className="text-xs text-gray-600">
                              {variable.display_name}
                            </div>
                          </div>
                          {variable.is_system && (
                            <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              システム
                            </div>
                          )}
                        </div>
                        {variable.example_value && (
                          <div className="text-xs text-gray-500 mt-1">
                            例: {variable.example_value}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Character limit warning */}
          {isOver && (
            <div className="flex items-center space-x-2 mt-2 text-red-600 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>文字数制限を超えています（{charCount - maxLength}文字オーバー）</span>
            </div>
          )}

          {/* Channel-specific tips */}
          <div className="mt-2 text-xs text-gray-500">
            {channel === 'line' && '💡 LINEでは絵文字とリンクが使用できます'}
            {channel === 'email' && '💡 メールではHTML形式の装飾が可能です'}
            {channel === 'sms' && '💡 SMSはシンプルなテキストのみ対応しています'}
          </div>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    const channelPreviews = previewData.filter(p => p.channel_type === activeChannel);
    
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-600">
          <EyeIcon className="h-8 w-8 mx-auto mb-2" />
          <p>プレビュー表示</p>
        </div>

        {channelPreviews.map((preview, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                {preview.customer_name} 様
              </span>
              <div className={`px-2 py-1 rounded text-xs ${CHANNEL_CONFIG[preview.channel_type].bgColor} ${CHANNEL_CONFIG[preview.channel_type].color}`}>
                {CHANNEL_CONFIG[preview.channel_type].label}
              </div>
            </div>

            {preview.subject && (
              <div className="mb-2">
                <div className="text-xs text-gray-500">件名:</div>
                <div className="text-sm font-medium text-gray-700">{preview.subject}</div>
              </div>
            )}

            <div className="bg-gray-50 rounded p-3">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {preview.content}
              </pre>
            </div>

            {Object.keys(preview.variables_used).length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">使用された変数:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(preview.variables_used).map(([name, value]) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                      title={value}
                    >
                      {`{${name}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {template ? 'テンプレートを編集' : '新規テンプレート作成'}
          </h1>
          <p className="text-gray-600 mt-1">
            マルチチャンネル対応のメッセージテンプレートを作成・編集
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <Button
            onClick={handlePreview}
            variant={previewMode ? 'secondary' : 'outline'}
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {previewMode ? '編集に戻る' : 'プレビュー'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>保存中...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4" />
                <span>{template ? '更新' : '作成'}</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Settings Panel */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">基本設定</h3>
              
              <div className="space-y-4">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    テンプレート名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: 1週間前リマインダー"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="このテンプレートの用途を説明..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    カテゴリー <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({ ...formData, category: key as any })}
                        className={`p-3 border rounded-lg text-left transition-all ${
                          formData.category === key
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{config.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{config.label}</div>
                            <div className="text-xs text-gray-500">{config.description}</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sub Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    サブカテゴリー
                  </label>
                  <Input
                    value={formData.sub_category}
                    onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                    placeholder="例: new_service, discount_campaign"
                  />
                </div>

                {/* Validity Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効期間
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始日</label>
                      <Input
                        type="datetime-local"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了日</label>
                      <Input
                        type="datetime-local"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    アクティブ
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      formData.is_active ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.is_active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Variables Summary */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">使用可能な変数</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {variables.slice(0, 8).map(variable => (
                  <div
                    key={variable.id}
                    className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                  >
                    <span className="font-mono text-primary-600">{`{${variable.name}}`}</span>
                    <span className="text-gray-500">{variable.display_name}</span>
                  </div>
                ))}
                {variables.length > 8 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    他 {variables.length - 8} 個の変数
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Content Editor */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="p-6">
            {/* Channel Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {Object.entries(CHANNEL_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveChannel(key as any)}
                    className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                      activeChannel === key
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{config.label}</span>
                    {getCharacterCount(key as any) > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isOverLimit(key as any) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getCharacterCount(key as any)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="min-h-96">
              {previewMode ? renderPreview() : renderChannelEditor(activeChannel)}
            </div>

            {/* Editor Footer with Actions */}
            {!previewMode && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <VariableIcon className="h-4 w-4" />
                    <span>{extractAllVariables().length} 個の変数</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DocumentTextIcon className="h-4 w-4" />
                    <span>
                      {Object.values(CHANNEL_CONFIG).reduce((total, _, index) => {
                        const channels: Array<'line' | 'email' | 'sms'> = ['line', 'email', 'sms'];
                        return total + (getCharacterCount(channels[index]) > 0 ? 1 : 0);
                      }, 0)} / 3 チャンネル
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScheduleModal(true)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    スケジュール
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Open settings modal */}}
                  >
                    <CogIcon className="h-4 w-4 mr-1" />
                    配信設定
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}