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
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  CalendarIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Template {
  id: string;
  name: string;
  category: 'campaign' | 'holiday' | 'emergency' | 'promotion';
  subject: string;
  content: string;
  variables: string[];
  channels: Array<'line' | 'instagram' | 'sms' | 'email'>;
}

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    ageRange?: [number, number];
    gender?: 'male' | 'female' | 'other';
    visitFrequency?: 'high' | 'medium' | 'low';
    lastVisit?: 'recent' | 'month' | 'quarter' | 'year';
    totalSpent?: [number, number];
    favoriteServices?: string[];
  };
  estimatedCount: number;
  lastUpdated: string;
}

interface BroadcastComposerProps {
  tenantId: string;
  onSave?: (data: any) => void;
  onSend?: (data: any) => void;
  className?: string;
}

export default function BroadcastComposer({
  tenantId,
  onSave,
  onSend,
  className = '',
}: BroadcastComposerProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    campaignName: '',
    type: 'campaign' as 'campaign' | 'holiday' | 'emergency' | 'promotion',
    subject: '',
    content: '',
    channels: ['line'] as Array<'line' | 'instagram' | 'sms' | 'email'>,
    targetSegments: [] as string[],
    scheduledAt: '',
    timezone: 'Asia/Tokyo',
    sendNow: false,
  });

  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: '春のキャンペーン',
      category: 'campaign',
      subject: '🌸 春の特別キャンペーンのお知らせ',
      content: '{{customer_name}}様\n\nいつもご利用いただきありがとうございます✨\n\n春の特別キャンペーンを開始いたします！\n期間限定で通常価格から20%OFF\n\nご予約お待ちしております🌸',
      variables: ['customer_name'],
      channels: ['line', 'instagram', 'email'],
    },
    {
      id: '2',
      name: '休業通知',
      category: 'holiday',
      subject: '年末年始休業のお知らせ',
      content: '{{customer_name}}様\n\n年末年始の営業についてお知らせいたします。\n\n休業期間：12月30日〜1月3日\n営業再開：1月4日(金) 10:00〜\n\nご不便をおかけしますが、よろしくお願いいたします。',
      variables: ['customer_name'],
      channels: ['line', 'sms', 'email'],
    }
  ]);

  const [segments, setSegments] = useState<CustomerSegment[]>([
    {
      id: '1',
      name: '新規顧客',
      description: '初回来店から3ヶ月以内のお客様',
      criteria: { lastVisit: 'recent', visitFrequency: 'low' },
      estimatedCount: 145,
      lastUpdated: '2025-08-01',
    },
    {
      id: '2', 
      name: 'VIP顧客',
      description: '月2回以上来店の常連様',
      criteria: { visitFrequency: 'high', totalSpent: [50000, 999999] },
      estimatedCount: 89,
      lastUpdated: '2025-08-01',
    },
    {
      id: '3',
      name: '20-30代女性',
      description: '若い女性のお客様',
      criteria: { ageRange: [20, 30], gender: 'female' },
      estimatedCount: 267,
      lastUpdated: '2025-08-01',
    },
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewMode, setPreviewMode] = useState<'line' | 'instagram' | 'sms' | 'email'>('line');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const totalTargetCount = segments
    .filter(segment => formData.targetSegments.includes(segment.id))
    .reduce((sum, segment) => sum + segment.estimatedCount, 0);

  const steps = [
    { id: 1, name: 'タイプ選択', description: '配信タイプとテンプレート' },
    { id: 2, name: 'メッセージ作成', description: '内容とチャンネル設定' },
    { id: 3, name: '対象選択', description: '配信対象セグメント' },
    { id: 4, name: 'スケジュール', description: '送信日時設定' },
    { id: 5, name: '確認・送信', description: 'プレビューと最終確認' },
  ];

  const campaignTypes = [
    { 
      value: 'campaign', 
      label: 'キャンペーン', 
      icon: '🎉', 
      color: 'border-purple-200 hover:border-purple-300 text-purple-700',
      description: '特別なプロモーションやキャンペーン'
    },
    { 
      value: 'holiday', 
      label: '休業通知', 
      icon: '🗓️', 
      color: 'border-blue-200 hover:border-blue-300 text-blue-700',
      description: '営業時間変更や休業のお知らせ'
    },
    { 
      value: 'emergency', 
      label: '緊急通知', 
      icon: '🚨', 
      color: 'border-red-200 hover:border-red-300 text-red-700',
      description: '緊急なお知らせや重要な連絡'
    },
    { 
      value: 'promotion', 
      label: 'お得情報', 
      icon: '💰', 
      color: 'border-green-200 hover:border-green-300 text-green-700',
      description: '割引情報やお得なサービス'
    },
  ];

  const channelOptions = [
    { 
      value: 'line', 
      label: 'LINE', 
      icon: ChatBubbleLeftRightIcon, 
      color: 'text-green-500',
      description: 'リッチメッセージとスタンプ対応'
    },
    { 
      value: 'instagram', 
      label: 'Instagram', 
      icon: DevicePhoneMobileIcon, 
      color: 'text-pink-500',
      description: 'DM配信（画像・動画対応）'
    },
    { 
      value: 'sms', 
      label: 'SMS', 
      icon: DevicePhoneMobileIcon, 
      color: 'text-blue-500',
      description: 'テキストメッセージ（160文字まで）'
    },
    { 
      value: 'email', 
      label: 'メール', 
      icon: EnvelopeIcon, 
      color: 'text-gray-500',
      description: 'リッチテキスト・HTML対応'
    },
  ];

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      type: template.category,
      subject: template.subject,
      content: template.content,
      channels: template.channels,
    }));
  };

  const handleSegmentToggle = (segmentId: string) => {
    setFormData(prev => ({
      ...prev,
      targetSegments: prev.targetSegments.includes(segmentId)
        ? prev.targetSegments.filter(id => id !== segmentId)
        : [...prev.targetSegments, segmentId]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.type) newErrors.type = '配信タイプを選択してください';
        break;
      case 2:
        if (!formData.campaignName.trim()) newErrors.campaignName = 'キャンペーン名は必須です';
        if (!formData.content.trim()) newErrors.content = 'メッセージ内容は必須です';
        if (formData.channels.includes('email') && !formData.subject.trim()) {
          newErrors.subject = 'メール配信の場合、件名は必須です';
        }
        break;
      case 3:
        if (formData.targetSegments.length === 0) {
          newErrors.targetSegments = '配信対象を選択してください';
        }
        break;
      case 4:
        if (!formData.sendNow && !formData.scheduledAt) {
          newErrors.scheduledAt = '送信日時を設定するか「今すぐ送信」を選択してください';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSend = async () => {
    if (!validateStep(5)) return;

    setLoading(true);
    try {
      const messageData = {
        ...formData,
        targetCount: totalTargetCount,
        estimatedDeliveryTime: formData.sendNow ? 'immediate' : formData.scheduledAt,
      };

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      onSend?.(messageData);
      
      // Reset form
      setFormData({
        campaignName: '',
        type: 'campaign',
        subject: '',
        content: '',
        channels: ['line'],
        targetSegments: [],
        scheduledAt: '',
        timezone: 'Asia/Tokyo',
        sendNow: false,
      });
      setCurrentStep(1);
      setSelectedTemplate(null);
      
    } catch (error) {
      setErrors({ general: '送信に失敗しました。もう一度お試しください。' });
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    const processedContent = formData.content.replace(/\{\{customer_name\}\}/g, '田中様');
    
    switch (previewMode) {
      case 'line':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="font-medium text-green-700">サロン公式</span>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{processedContent}</p>
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900">{formData.subject}</div>
              <div className="text-xs text-gray-500">from: salon@example.com</div>
            </div>
            <div className="p-4">
              <p className="text-sm whitespace-pre-wrap">{processedContent}</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{processedContent}</p>
          </div>
        );
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* ステップ表示 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-primary-600' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-primary-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ステップ1: タイプ選択 */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">配信タイプを選択</h3>
                
                {/* タイプ選択 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {campaignTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.type === type.value
                          ? 'border-primary-500 bg-primary-50'
                          : type.color
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{type.label}</div>
                          <div className="text-sm text-gray-600">{type.description}</div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* テンプレート選択 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">テンプレートから選択（任意）</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates
                      .filter(template => !formData.type || template.category === formData.type)
                      .map((template) => (
                        <motion.button
                          key={template.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handleTemplateSelect(template)}
                          className={`p-4 border rounded-lg text-left transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {template.content.slice(0, 60)}...
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {template.channels.map(channel => {
                              const channelInfo = channelOptions.find(c => c.value === channel);
                              if (!channelInfo) return null;
                              return (
                                <channelInfo.icon
                                  key={channel}
                                  className={`h-4 w-4 ${channelInfo.color}`}
                                />
                              );
                            })}
                          </div>
                        </motion.button>
                      ))}
                  </div>
                </div>

                {errors.type && (
                  <p className="mt-2 text-sm text-red-600">{errors.type}</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ステップ2: メッセージ作成 */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">メッセージを作成</h3>
                
                <div className="space-y-6">
                  {/* キャンペーン名 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      キャンペーン名 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.campaignName}
                      onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                      error={errors.campaignName}
                      placeholder="春の特別キャンペーン"
                    />
                  </div>

                  {/* チャンネル選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      配信チャンネル（複数選択可）
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {channelOptions.map((channel) => (
                        <motion.label
                          key={channel.value}
                          whileHover={{ scale: 1.01 }}
                          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            formData.channels.includes(channel.value as any)
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.channels.includes(channel.value as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  channels: [...prev.channels, channel.value as any]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  channels: prev.channels.filter(c => c !== channel.value)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <channel.icon className={`h-5 w-5 ${channel.color}`} />
                          <div>
                            <div className="font-medium text-gray-900">{channel.label}</div>
                            <div className="text-xs text-gray-500">{channel.description}</div>
                          </div>
                        </motion.label>
                      ))}
                    </div>
                  </div>

                  {/* メール件名 */}
                  {formData.channels.includes('email') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        メール件名 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        error={errors.subject}
                        placeholder="【重要】特別キャンペーンのお知らせ"
                      />
                    </motion.div>
                  )}

                  {/* メッセージ内容 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メッセージ内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
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
                      利用可能な変数: {{'{'}customer_name{'}'}} {{'{'}phone{'}'}} {{'{'}last_visit{'}'}} {{'{'}visit_count{'}'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ステップ3: 対象選択 */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">配信対象を選択</h3>
                  {totalTargetCount > 0 && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600">{totalTargetCount}</div>
                      <div className="text-sm text-gray-500">配信対象数</div>
                    </div>
                  )}
                </div>

                {errors.targetSegments && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.targetSegments}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {segments.map((segment) => (
                    <motion.div
                      key={segment.id}
                      whileHover={{ scale: 1.01 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        formData.targetSegments.includes(segment.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSegmentToggle(segment.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={formData.targetSegments.includes(segment.id)}
                              readOnly
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">{segment.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{segment.description}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-gray-500">推定対象数</span>
                            <span className="font-medium text-primary-600">{segment.estimatedCount}名</span>
                          </div>
                        </div>
                        <UserGroupIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ステップ4: スケジュール設定 */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">送信スケジュール</h3>
                
                <div className="space-y-6">
                  {/* 即座送信 or スケジュール */}
                  <div className="flex items-center space-x-4">
                    <motion.label
                      whileHover={{ scale: 1.01 }}
                      className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.sendNow
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={formData.sendNow}
                        onChange={() => setFormData(prev => ({ ...prev, sendNow: true, scheduledAt: '' }))}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <PaperAirplaneIcon className="h-5 w-5 text-primary-600" />
                        <div>
                          <div className="font-medium text-gray-900">今すぐ送信</div>
                          <div className="text-sm text-gray-600">作成完了後、即座に配信開始</div>
                        </div>
                      </div>
                    </motion.label>

                    <motion.label
                      whileHover={{ scale: 1.01 }}
                      className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${
                        !formData.sendNow
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={!formData.sendNow}
                        onChange={() => setFormData(prev => ({ ...prev, sendNow: false }))}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-gray-900">スケジュール送信</div>
                          <div className="text-sm text-gray-600">指定日時に自動配信</div>
                        </div>
                      </div>
                    </motion.label>
                  </div>

                  {/* スケジュール日時設定 */}
                  {!formData.sendNow && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            配信日時 <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="datetime-local"
                            value={formData.scheduledAt}
                            onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                            error={errors.scheduledAt}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            タイムゾーン
                          </label>
                          <select
                            value={formData.timezone}
                            onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="Asia/Tokyo">日本標準時 (JST)</option>
                            <option value="UTC">協定世界時 (UTC)</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ステップ5: 確認・送信 */}
        {currentStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">最終確認</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 設定サマリー */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">配信設定</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">キャンペーン名</span>
                          <span className="font-medium">{formData.campaignName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">配信タイプ</span>
                          <span className="font-medium">
                            {campaignTypes.find(t => t.value === formData.type)?.label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">対象数</span>
                          <span className="font-medium text-primary-600">{totalTargetCount}名</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">送信予定</span>
                          <span className="font-medium">
                            {formData.sendNow ? '今すぐ' : new Date(formData.scheduledAt).toLocaleString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">配信チャンネル</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.channels.map(channel => {
                          const channelInfo = channelOptions.find(c => c.value === channel);
                          if (!channelInfo) return null;
                          return (
                            <div
                              key={channel}
                              className="flex items-center space-x-1 px-2 py-1 bg-white border rounded-full text-sm"
                            >
                              <channelInfo.icon className={`h-3 w-3 ${channelInfo.color}`} />
                              <span>{channelInfo.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* プレビュー */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <h4 className="font-medium text-gray-900">プレビュー</h4>
                      <select
                        value={previewMode}
                        onChange={(e) => setPreviewMode(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {formData.channels.map(channel => {
                          const channelInfo = channelOptions.find(c => c.value === channel);
                          return (
                            <option key={channel} value={channel}>
                              {channelInfo?.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    {renderPreview()}
                  </div>
                </div>

                {errors.general && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.general}</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          戻る
        </Button>

        <div className="flex space-x-3">
          {currentStep < 5 ? (
            <Button onClick={handleNext}>
              次へ
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => onSave?.(formData)}
              >
                下書き保存
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading}
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
                      {formData.sendNow ? '今すぐ送信' : 'スケジュール'}
                      ({totalTargetCount}名)
                    </span>
                  </div>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}