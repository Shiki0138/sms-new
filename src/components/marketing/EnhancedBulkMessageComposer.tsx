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
  ChartBarIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  LightBulbIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { 
  EnhancedBulkMessagingService, 
  SmartCustomerSegment,
  SmartCampaignTemplate,
  EnhancedBulkMessage 
} from '../../services/enhanced-bulk-messaging-service';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface EnhancedBulkMessageComposerProps {
  tenantId: string;
  onMessageSent?: (messageId: string) => void;
  className?: string;
}

export default function EnhancedBulkMessageComposer({
  tenantId,
  onMessageSent,
  className = '',
}: EnhancedBulkMessageComposerProps) {
  const [bulkService] = useState(() => new EnhancedBulkMessagingService(tenantId));
  const [activeStep, setActiveStep] = useState<'goal' | 'segment' | 'content' | 'optimize' | 'review'>('goal');
  
  // State management
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SmartCampaignTemplate | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [optimalTimeEnabled, setOptimalTimeEnabled] = useState(true);
  
  const [messageData, setMessageData] = useState<Partial<EnhancedBulkMessage>>({
    campaign_name: '',
    campaign_goal: 'increase_bookings',
    message_type: 'campaign',
    subject: '',
    content: '',
    send_channels: ['line', 'instagram', 'email'],
    scheduled_at: '',
  });

  const [predictions, setPredictions] = useState<any>(null);
  const [segmentRecommendations, setSegmentRecommendations] = useState<string[]>([]);

  // Business goals
  const businessGoals = [
    {
      id: 'increase_bookings',
      name: '予約数を増やす',
      icon: CalendarIcon,
      description: '空き時間を埋めて売上を最大化',
      metrics: '目標: 予約率30%向上',
      color: 'bg-blue-500',
    },
    {
      id: 'reduce_no_shows',
      name: '無断キャンセルを減らす',
      icon: ExclamationTriangleIcon,
      description: 'リマインダーで機会損失を防ぐ',
      metrics: '目標: No-show 80%削減',
      color: 'bg-red-500',
    },
    {
      id: 'customer_retention',
      name: '顧客の定着率を上げる',
      icon: UserGroupIcon,
      description: '休眠顧客の掘り起こしとVIP維持',
      metrics: '目標: 再来店率45%向上',
      color: 'bg-purple-500',
    },
    {
      id: 'increase_revenue',
      name: '客単価を上げる',
      icon: ArrowTrendingUpIcon,
      description: 'アップセル・クロスセルの促進',
      metrics: '目標: 平均単価25%向上',
      color: 'bg-green-500',
    },
    {
      id: 'referrals',
      name: '紹介を増やす',
      icon: SparklesIcon,
      description: '既存顧客からの新規獲得',
      metrics: '目標: 紹介率30%達成',
      color: 'bg-yellow-500',
    },
  ];

  // Load smart segments
  useEffect(() => {
    if (selectedGoal) {
      loadRecommendedSegments();
    }
  }, [selectedGoal]);

  // Calculate recipients when segments change
  useEffect(() => {
    if (selectedSegments.length > 0) {
      calculateRecipients();
    }
  }, [selectedSegments]);

  const loadRecommendedSegments = async () => {
    const segments = bulkService.getSmartSegments();
    const goalSegmentMap: Record<string, string[]> = {
      increase_bookings: ['off_peak_movers', 'win_back_recent', 'service_maintenance'],
      reduce_no_shows: ['high_value_at_risk', 'new_customers'],
      customer_retention: ['high_value_at_risk', 'win_back_recent', 'brand_advocates'],
      increase_revenue: ['upsell_ready', 'vip_customers', 'regular_customers'],
      referrals: ['brand_advocates', 'vip_customers'],
    };

    setSegmentRecommendations(goalSegmentMap[selectedGoal] || []);
  };

  const calculateRecipients = async () => {
    try {
      const prediction = await bulkService.predictCampaignPerformance(
        selectedSegments,
        messageData.message_type || 'campaign'
      );
      setPredictions(prediction);
      setRecipientCount(prediction.estimated_recipients);
    } catch (error) {
      console.error('Error calculating recipients:', error);
    }
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
    setMessageData(prev => ({ ...prev, campaign_goal: goalId as any }));
    setActiveStep('segment');
  };

  const handleTemplateSelect = (template: SmartCampaignTemplate) => {
    setSelectedTemplate(template);
    setMessageData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content,
      campaign_name: template.name,
    }));
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Apply optimizations
      if (optimalTimeEnabled && !messageData.scheduled_at) {
        const optimal = await bulkService.getOptimalSendTime(
          selectedSegments[0],
          messageData.message_type || 'campaign'
        );
        messageData.scheduled_at = optimal.optimal_time.toISOString();
      }

      // Create A/B test variants if enabled
      if (abTestEnabled) {
        messageData.ab_test_enabled = true;
        messageData.ab_variants = bulkService.createABTestVariants(
          messageData,
          ['subject', 'content']
        );
      }

      // Create and send message
      const message = await bulkService.createBulkMessage({
        ...messageData,
        target_segments: selectedSegments,
      } as any);

      if (!messageData.scheduled_at) {
        await bulkService.sendBulkMessage(message.id);
      }

      onMessageSent?.(message.id);
      
      // Show success analytics
      setShowAnalytics(true);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    return !!(
      messageData.campaign_name &&
      messageData.content &&
      selectedSegments.length > 0
    );
  };

  // Step navigation
  const steps = [
    { id: 'goal', label: '目標設定', icon: TrophyIcon },
    { id: 'segment', label: '対象選定', icon: UserGroupIcon },
    { id: 'content', label: 'メッセージ', icon: ChatBubbleLeftRightIcon },
    { id: 'optimize', label: '最適化', icon: AdjustmentsHorizontalIcon },
    { id: 'review', label: '確認', icon: CheckCircleIcon },
  ];

  const renderStepContent = () => {
    switch (activeStep) {
      case 'goal':
        return <GoalSelectionStep goals={businessGoals} onSelect={handleGoalSelect} />;
      
      case 'segment':
        return (
          <SegmentSelectionStep
            segments={bulkService.getSmartSegments()}
            selectedSegments={selectedSegments}
            recommendations={segmentRecommendations}
            onToggle={(id) => setSelectedSegments(prev => 
              prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
            )}
            predictions={predictions}
          />
        );
      
      case 'content':
        return (
          <ContentCreationStep
            templates={bulkService.getCampaignTemplates()}
            selectedTemplate={selectedTemplate}
            messageData={messageData}
            onTemplateSelect={handleTemplateSelect}
            onMessageChange={setMessageData}
          />
        );
      
      case 'optimize':
        return (
          <OptimizationStep
            abTestEnabled={abTestEnabled}
            optimalTimeEnabled={optimalTimeEnabled}
            onAbTestToggle={setAbTestEnabled}
            onOptimalTimeToggle={setOptimalTimeEnabled}
            messageData={messageData}
            onScheduleChange={(scheduled_at) => setMessageData(prev => ({ ...prev, scheduled_at }))}
            predictions={predictions}
          />
        );
      
      case 'review':
        return (
          <ReviewStep
            messageData={messageData}
            selectedSegments={selectedSegments}
            predictions={predictions}
            loading={loading}
            onSend={handleSend}
          />
        );
    }
  };

  if (showAnalytics) {
    return (
      <CampaignSuccessAnalytics
        predictions={predictions}
        onClose={() => {
          setShowAnalytics(false);
          // Reset form
          setActiveStep('goal');
          setSelectedGoal('');
          setSelectedSegments([]);
          setMessageData({
            campaign_name: '',
            campaign_goal: 'increase_bookings',
            message_type: 'campaign',
            subject: '',
            content: '',
            send_channels: ['line', 'instagram', 'email'],
            scheduled_at: '',
          });
        }}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Steps */}
      <Card>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isCompleted = steps.findIndex(s => s.id === activeStep) > index;

            return (
              <React.Fragment key={step.id}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveStep(step.id as any)}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : isCompleted
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    isActive ? 'bg-primary-200' : isCompleted ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium mt-1">{step.label}</span>
                </motion.button>

                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-primary-300' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={animations.spring.gentle}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {activeStep !== 'goal' && (
        <Card>
          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={() => {
                const currentIndex = steps.findIndex(s => s.id === activeStep);
                if (currentIndex > 0) {
                  setActiveStep(steps[currentIndex - 1].id as any);
                }
              }}
            >
              戻る
            </Button>

            {activeStep !== 'review' && (
              <Button
                onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === activeStep);
                  if (currentIndex < steps.length - 1) {
                    setActiveStep(steps[currentIndex + 1].id as any);
                  }
                }}
                disabled={
                  (activeStep === 'segment' && selectedSegments.length === 0) ||
                  (activeStep === 'content' && !messageData.content)
                }
              >
                次へ
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// Goal Selection Step Component
function GoalSelectionStep({ goals, onSelect }: any) {
  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          達成したいビジネス目標を選択してください
        </h2>
        <p className="text-gray-600">
          目標に応じて最適な顧客セグメントとメッセージをご提案します
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal: any) => {
          const Icon = goal.icon;
          return (
            <motion.button
              key={goal.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(goal.id)}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${goal.color} bg-opacity-10`}>
                  <Icon className={`h-8 w-8 ${goal.color} text-opacity-80`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{goal.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                  <p className="text-xs text-primary-600 font-medium mt-2">{goal.metrics}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}

// Segment Selection Step Component
function SegmentSelectionStep({ segments, selectedSegments, recommendations, onToggle, predictions }: any) {
  const recommendedSegments = segments.filter((s: SmartCustomerSegment) => 
    recommendations.includes(s.id)
  );
  const otherSegments = segments.filter((s: SmartCustomerSegment) => 
    !recommendations.includes(s.id)
  );

  return (
    <div className="space-y-6">
      {/* Predictions Card */}
      {predictions && (
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-900">予測パフォーマンス</h3>
              <p className="text-sm text-gray-600">選択したセグメントの予測効果</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {predictions.estimated_recipients}
                </div>
                <div className="text-xs text-gray-600">配信対象</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {predictions.predicted_bookings}
                </div>
                <div className="text-xs text-gray-600">予約見込み</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  ¥{predictions.predicted_revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">売上見込み</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommended Segments */}
      {recommendedSegments.length > 0 && (
        <Card>
          <div className="mb-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center">
              <LightBulbIcon className="h-5 w-5 text-yellow-500 mr-2" />
              おすすめセグメント
            </h3>
            <p className="text-sm text-gray-600">選択した目標に最適な顧客層</p>
          </div>
          
          <div className="space-y-3">
            {recommendedSegments.map((segment: SmartCustomerSegment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                isSelected={selectedSegments.includes(segment.id)}
                isRecommended={true}
                onToggle={() => onToggle(segment.id)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Other Segments */}
      <Card>
        <h3 className="font-bold text-lg text-gray-900 mb-4">その他のセグメント</h3>
        <div className="space-y-3">
          {otherSegments.map((segment: SmartCustomerSegment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              isSelected={selectedSegments.includes(segment.id)}
              isRecommended={false}
              onToggle={() => onToggle(segment.id)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// Segment Card Component
function SegmentCard({ segment, isSelected, isRecommended, onToggle }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isSelected}
              readOnly
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <h4 className="font-medium text-gray-900">{segment.name}</h4>
            {isRecommended && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                おすすめ
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 ml-6">{segment.description}</p>
          <div className="flex items-center space-x-4 mt-2 ml-6">
            <span className="text-xs text-primary-600 font-medium">{segment.businessGoal}</span>
            <span className="text-xs text-green-600">ROI: {segment.expectedROI}</span>
          </div>
        </div>
        <UserGroupIcon className="h-5 w-5 text-gray-400" />
      </div>
    </motion.div>
  );
}

// Content Creation Step Component
function ContentCreationStep({ templates, selectedTemplate, messageData, onTemplateSelect, onMessageChange }: any) {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Card>
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'templates'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            テンプレートから選択
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'custom'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            カスタム作成
          </button>
        </div>

        {activeTab === 'templates' ? (
          <div className="space-y-4">
            {templates.map((template: SmartCampaignTemplate) => (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.01 }}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onTemplateSelect(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.businessGoal}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">期待される効果</span>
                    <div className="text-sm font-medium text-primary-600">
                      予約率 {(template.expectedMetrics.booking_rate * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded p-3 mt-3">
                  <p className="text-xs text-gray-700 font-medium mb-1">件名: {template.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-3">{template.content}</p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2">
                    {template.personalization_tokens.slice(0, 3).map(token => (
                      <span key={token} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {token}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={selectedTemplate?.id === template.id ? 'primary' : 'secondary'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect(template);
                    }}
                  >
                    {selectedTemplate?.id === template.id ? '選択中' : '使用する'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                キャンペーン名
              </label>
              <Input
                value={messageData.campaign_name}
                onChange={(e) => onMessageChange({ ...messageData, campaign_name: e.target.value })}
                placeholder="春の新メニューキャンペーン"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メール件名（メール配信時のみ）
              </label>
              <Input
                value={messageData.subject}
                onChange={(e) => onMessageChange({ ...messageData, subject: e.target.value })}
                placeholder="【期間限定】特別なご案内"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メッセージ内容
              </label>
              <textarea
                value={messageData.content}
                onChange={(e) => onMessageChange({ ...messageData, content: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="{{customer_name}}様&#10;&#10;いつもご利用ありがとうございます。"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">使用可能な変数:</span>
                {['customer_name', 'last_visit', 'visit_count', 'favorite_service'].map(token => (
                  <button
                    key={token}
                    onClick={() => {
                      const newContent = messageData.content + ` {{${token}}}`;
                      onMessageChange({ ...messageData, content: newContent });
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded transition-colors"
                  >
                    {`{{${token}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Preview */}
      <Card className="bg-gray-50">
        <h3 className="font-medium text-gray-900 mb-3">プレビュー</h3>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">LINE メッセージ</div>
          <div className="whitespace-pre-wrap text-sm">
            {messageData.content?.replace(/{{customer_name}}/g, '山田太郎')
              .replace(/{{last_visit}}/g, '2週間前')
              .replace(/{{visit_count}}/g, '5')
              .replace(/{{favorite_service}}/g, 'カット＋カラー') || 
              'メッセージを入力してください'}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Optimization Step Component
function OptimizationStep({ 
  abTestEnabled, 
  optimalTimeEnabled, 
  onAbTestToggle, 
  onOptimalTimeToggle,
  messageData,
  onScheduleChange,
  predictions
}: any) {
  return (
    <div className="space-y-6">
      {/* Smart Optimizations */}
      <Card>
        <h3 className="font-bold text-lg text-gray-900 mb-4">
          <SparklesIcon className="h-5 w-5 text-yellow-500 inline mr-2" />
          スマート最適化
        </h3>

        <div className="space-y-4">
          {/* Optimal Send Time */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">最適送信時間の自動設定</h4>
                <p className="text-sm text-gray-600 mt-1">
                  顧客の行動パターンから最も開封されやすい時間を自動で選択
                </p>
                <p className="text-xs text-primary-600 mt-2">
                  推奨時間: 火曜日 11:00 または 木曜日 19:00
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onOptimalTimeToggle(!optimalTimeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  optimalTimeEnabled ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <motion.span
                  animate={{ x: optimalTimeEnabled ? 20 : 2 }}
                  transition={animations.spring.smooth}
                  className="inline-block h-4 w-4 transform rounded-full bg-white"
                />
              </motion.button>
            </div>
          </div>

          {/* A/B Testing */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  <BeakerIcon className="h-4 w-4 text-blue-500 inline mr-1" />
                  A/Bテスト実施
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  件名とコンテンツの異なるバージョンをテストして効果を比較
                </p>
                <p className="text-xs text-green-600 mt-2">
                  平均15%の開封率向上が期待できます
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAbTestToggle(!abTestEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  abTestEnabled ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <motion.span
                  animate={{ x: abTestEnabled ? 20 : 2 }}
                  transition={animations.spring.smooth}
                  className="inline-block h-4 w-4 transform rounded-full bg-white"
                />
              </motion.button>
            </div>
          </div>
        </div>
      </Card>

      {/* Manual Schedule */}
      {!optimalTimeEnabled && (
        <Card>
          <h3 className="font-medium text-gray-900 mb-4">配信スケジュール</h3>
          <Input
            type="datetime-local"
            value={messageData.scheduled_at}
            onChange={(e) => onScheduleChange(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <p className="text-xs text-gray-500 mt-2">
            空白の場合は即座に送信されます
          </p>
        </Card>
      )}

      {/* Performance Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <LightBulbIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">パフォーマンス向上のヒント</h4>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• 火曜日〜木曜日の午前11時台が最も開封率が高い傾向</li>
              <li>• 件名に具体的な数字や期限を入れると効果的</li>
              <li>• 顧客の名前を使ったパーソナライズで開封率20%向上</li>
              <li>• CTAボタンは1つに絞ることで行動率が向上</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Review Step Component
function ReviewStep({ messageData, selectedSegments, predictions, loading, onSend }: any) {
  const segments = new EnhancedBulkMessagingService('').getSmartSegments();
  const selectedSegmentDetails = segments.filter(s => selectedSegments.includes(s.id));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <h3 className="font-bold text-lg text-gray-900 mb-4">配信内容の確認</h3>
        
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-600">キャンペーン名</span>
            <p className="font-medium">{messageData.campaign_name}</p>
          </div>

          <div>
            <span className="text-sm text-gray-600">ビジネス目標</span>
            <p className="font-medium">{messageData.campaign_goal}</p>
          </div>

          <div>
            <span className="text-sm text-gray-600">配信対象</span>
            <div className="mt-1 space-y-1">
              {selectedSegmentDetails.map(segment => (
                <div key={segment.id} className="text-sm">
                  • {segment.name}
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm text-gray-600">配信予定</span>
            <p className="font-medium">
              {messageData.scheduled_at 
                ? format(new Date(messageData.scheduled_at), 'yyyy年M月d日 HH:mm', { locale: ja })
                : '即時配信'}
            </p>
          </div>
        </div>
      </Card>

      {/* Predicted Impact */}
      {predictions && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50">
          <h3 className="font-bold text-lg text-gray-900 mb-4">
            <ChartBarIcon className="h-5 w-5 text-green-600 inline mr-2" />
            予測される効果
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {predictions.estimated_recipients}
              </div>
              <div className="text-sm text-gray-600">配信数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {predictions.predicted_opens}
              </div>
              <div className="text-sm text-gray-600">開封見込み</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {predictions.predicted_bookings}
              </div>
              <div className="text-sm text-gray-600">予約見込み</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                ¥{predictions.predicted_revenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">売上見込み</div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
              <InformationCircleIcon className="h-4 w-4" />
              <span>予測精度: {(predictions.confidence_level * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* Message Preview */}
      <Card>
        <h3 className="font-medium text-gray-900 mb-3">メッセージプレビュー</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="whitespace-pre-wrap text-sm">
            {messageData.content}
          </div>
        </div>
      </Card>

      {/* Send Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onSend}
          disabled={loading}
          className="min-w-[200px]"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>送信中...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <PaperAirplaneIcon className="h-5 w-5" />
              <span>
                {messageData.scheduled_at ? 'スケジュール送信' : '今すぐ送信'}
              </span>
            </div>
          )}
        </Button>
      </div>

      {/* Warning */}
      <div className="text-center text-xs text-gray-500">
        送信後のキャンセルはできません。内容をよくご確認ください。
      </div>
    </div>
  );
}

// Campaign Success Analytics Component
function CampaignSuccessAnalytics({ predictions, onClose }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <Card className="max-w-2xl mx-auto">
        <div className="py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            キャンペーンを開始しました！
          </h2>
          <p className="text-gray-600 mb-8">
            配信が完了次第、詳細なレポートをお届けします
          </p>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-3xl font-bold text-primary-600">
                {predictions?.estimated_recipients || 0}
              </div>
              <div className="text-sm text-gray-600">名に配信</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-3xl font-bold text-green-600">
                {predictions?.predicted_bookings || 0}
              </div>
              <div className="text-sm text-gray-600">件の予約見込み</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-3xl font-bold text-purple-600">
                ¥{(predictions?.predicted_revenue || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">売上見込み</div>
            </motion.div>
          </div>

          <div className="space-y-3">
            <Button onClick={onClose} variant="primary">
              新しいキャンペーンを作成
            </Button>
            <Button onClick={onClose} variant="secondary">
              ダッシュボードに戻る
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}