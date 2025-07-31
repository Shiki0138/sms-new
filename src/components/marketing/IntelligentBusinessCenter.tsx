import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyYenIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  StarIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  PresentationChartLineIcon,
  CloudIcon,
  HeartIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { SalonBusinessIntelligenceService } from '../../services/salon-business-intelligence-service';
import { CampaignAnalyticsService } from '../../services/campaign-analytics-service';
import { IntelligentReminderScheduler } from '../../services/intelligent-reminder-scheduler';
import { animations } from '../../styles/design-system';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface IntelligentBusinessCenterProps {
  tenantId: string;
  className?: string;
}

type ActiveTab = 'overview' | 'segments' | 'campaigns' | 'reminders' | 'analytics' | 'insights';

export default function IntelligentBusinessCenter({
  tenantId,
  className = '',
}: IntelligentBusinessCenterProps) {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [loading, setLoading] = useState(false);
  
  // Services
  const [biService] = useState(() => new SalonBusinessIntelligenceService(tenantId));
  const [analyticsService] = useState(() => new CampaignAnalyticsService(tenantId));
  const [reminderService] = useState(() => new IntelligentReminderScheduler(tenantId));

  // Data states
  const [businessDashboard, setBusinessDashboard] = useState<any>(null);
  const [customerSegmentation, setCustomerSegmentation] = useState<any>(null);
  const [campaignTemplates, setCampaignTemplates] = useState<any>(null);
  const [reminderTemplates, setReminderTemplates] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    loadIntelligentData();
  }, [tenantId]);

  const loadIntelligentData = async () => {
    setLoading(true);
    try {
      const [dashboard, segmentation, campaigns, reminders] = await Promise.all([
        biService.generateBusinessDashboard(),
        biService.generateCustomerSegmentation(),
        biService.generateSmartCampaignTemplates(),
        reminderService.getSmartReminderTemplates(),
      ]);

      setBusinessDashboard(dashboard);
      setCustomerSegmentation(segmentation);
      setCampaignTemplates(campaigns);
      setReminderTemplates(reminders);

    } catch (error) {
      console.error('Error loading intelligent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      key: 'overview' as const,
      label: 'ビジネス概要',
      icon: PresentationChartLineIcon,
      description: '全体的なビジネス状況と重要指標',
    },
    {
      key: 'segments' as const,
      label: '顧客セグメント',
      icon: UserGroupIcon,
      description: 'インテリジェント顧客分析',
    },
    {
      key: 'campaigns' as const,
      label: 'スマートキャンペーン',
      icon: BoltIcon,
      description: 'AI推奨キャンペーンテンプレート',
    },
    {
      key: 'reminders' as const,
      label: 'インテリジェント予約管理',
      icon: ClockIcon,
      description: '予約最適化とリマインダー',
    },
    {
      key: 'analytics' as const,
      label: 'パフォーマンス分析',
      icon: ChartBarIcon,
      description: 'ROI分析と効果測定',
    },
    {
      key: 'insights' as const,
      label: 'ビジネス洞察',
      icon: StarIcon,
      description: '戦略的インサイトと推奨事項',
    },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl shadow-lg"
        >
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <CurrencyYenIcon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">¥1,250,000</div>
                <div className="text-sm opacity-90">今月の売上</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              <span className="text-sm">前月比 +12.5%</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl shadow-lg"
        >
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">328</div>
                <div className="text-sm opacity-90">アクティブ顧客</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              <span className="text-sm">新規 +18名</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl shadow-lg"
        >
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">85.2%</div>
                <div className="text-sm opacity-90">メッセージ開封率</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              <span className="text-sm">業界平均 +25%</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl shadow-lg"
        >
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <TrophyIcon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">420%</div>
                <div className="text-sm opacity-90">キャンペーンROI</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              <span className="text-sm">目標 +120%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">今日のインサイト</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">VIP顧客セグメントの売上が好調</p>
                <p className="text-sm text-gray-600">前月比28%増加。継続的な特別サービスが効果的です。</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BoltIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">雨天時のプロモーションが成功</p>
                <p className="text-sm text-gray-600">湿気対策メニューの予約が45%増加しました。</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">離脱リスク顧客への対応推奨</p>
                <p className="text-sm text-gray-600">23名の顧客に早期アプローチが効果的です。</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">推奨アクション</h3>
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full justify-start"
              onClick={() => setActiveTab('campaigns')}
            >
              <BoltIcon className="h-5 w-5 mr-2" />
              高効果キャンペーンを実行
            </Button>
            
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setActiveTab('segments')}
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              顧客セグメント戦略を確認
            </Button>
            
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setActiveTab('reminders')}
            >
              <ClockIcon className="h-5 w-5 mr-2" />
              インテリジェントリマインダー設定
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderSegments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">インテリジェント顧客セグメント</h2>
        <Button onClick={loadIntelligentData} disabled={loading}>
          {loading ? '分析中...' : '最新データで分析'}
        </Button>
      </div>

      {customerSegmentation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VIP Customers */}
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">VIP顧客</h3>
                <p className="text-sm text-gray-600">高価値顧客セグメント</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">顧客数</span>
                <span className="font-semibold">{customerSegmentation.vip_customers.count}名</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">平均LTV</span>
                <span className="font-semibold">¥{customerSegmentation.vip_customers.avg_ltv.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">売上貢献度</span>
                <span className="font-semibold">{customerSegmentation.vip_customers.revenue_contribution.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">継続率</span>
                <span className="font-semibold text-green-600">{customerSegmentation.vip_customers.retention_rate.toFixed(1)}%</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">人気サービス</p>
              <div className="flex flex-wrap gap-2">
                {customerSegmentation.vip_customers.top_services.map((service: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* At-Risk Customers */}
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">離脱リスク顧客</h3>
                <p className="text-sm text-gray-600">早急な対応が必要</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">対象顧客数</span>
                <span className="font-semibold text-red-600">{customerSegmentation.at_risk_customers.count}名</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">平均未来店日数</span>
                <span className="font-semibold">{customerSegmentation.at_risk_customers.days_since_last_visit}日</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">潜在損失額</span>
                <span className="font-semibold text-red-600">¥{customerSegmentation.at_risk_customers.potential_lost_revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">回復成功率予測</span>
                <span className="font-semibold text-green-600">{(customerSegmentation.at_risk_customers.reactivation_success_rate * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">推奨アクション</p>
              <div className="space-y-2">
                {customerSegmentation.at_risk_customers.recommended_actions.map((action: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-gray-700">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Service-Based Segments */}
          <div className="lg:col-span-2">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">サービス別セグメント分析</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerSegmentation.service_based_segments.map((segment: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">{segment.service_category}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">顧客数</span>
                        <span className="font-medium">{segment.customer_count}名</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">平均単価</span>
                        <span className="font-medium">¥{segment.avg_spend_per_visit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">来店頻度</span>
                        <span className="font-medium">{segment.frequency_pattern}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">アップセル機会</p>
                      <div className="flex flex-wrap gap-1">
                        {segment.upsell_opportunities.map((opp: string, oppIndex: number) => (
                          <span
                            key={oppIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {opp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );

  const renderCampaigns = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">スマートキャンペーンテンプレート</h2>
        <div className="flex space-x-2">
          <Button variant="secondary">
            <CloudIcon className="h-4 w-4 mr-2" />
            天気連動キャンペーン
          </Button>
          <Button>
            <BoltIcon className="h-4 w-4 mr-2" />
            新規キャンペーン作成
          </Button>
        </div>
      </div>

      {campaignTemplates && (
        <div className="space-y-6">
          {/* Retention Campaigns */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HeartIcon className="h-5 w-5 mr-2 text-red-500" />
              顧客維持キャンペーン
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {campaignTemplates.retention_campaigns.map((campaign: any, index: number) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{campaign.businessGoal}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {campaign.category}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">
                        {(campaign.expectedMetrics.open_rate * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-blue-700">開封率</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">
                        {(campaign.expectedMetrics.booking_rate * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-green-700">予約率</div>
                    </div>
                  </div>
                  
                  <div className="text-center mb-3">
                    <div className="text-2xl font-bold text-gray-900">
                      ¥{campaign.expectedMetrics.revenue_per_send.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">配信あたり予想売上</div>
                  </div>
                  
                  <Button variant="secondary" className="w-full">
                    このテンプレートを使用
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Seasonal Campaigns */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarDaysIcon className="h-5 w-5 mr-2 text-purple-500" />
              季節限定キャンペーン
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {campaignTemplates.seasonal_campaigns.map((campaign: any, index: number) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{campaign.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{campaign.businessGoal}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">予想開封率</span>
                      <span className="font-medium">{(campaign.expectedMetrics.open_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">予約転換率</span>
                      <span className="font-medium">{(campaign.expectedMetrics.booking_rate * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    詳細を見る
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  const renderReminders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">インテリジェントリマインダーシステム</h2>
        <Button onClick={() => reminderService.scheduleIntelligentReminders()}>
          <ClockIcon className="h-4 w-4 mr-2" />
          自動スケジュール実行
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service-Specific Reminders */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">サービス別インテリジェントリマインダー</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
              <h4 className="font-medium text-gray-900 mb-2">カラーメンテナンス</h4>
              <p className="text-sm text-gray-600 mb-3">
                顧客の髪質と前回のカラー履歴を分析し、最適なタイミングでリマインド
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">最適間隔:</span>
                  <span className="font-medium ml-1">5-6週間</span>
                </div>
                <div>
                  <span className="text-gray-600">効果予測:</span>
                  <span className="font-medium ml-1 text-green-600">75%</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-2">カットメンテナンス</h4>
              <p className="text-sm text-gray-600 mb-3">
                髪型の特徴と成長パターンを考慮した個別リマインド
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">最適間隔:</span>
                  <span className="font-medium ml-1">4-5週間</span>
                </div>
                <div>
                  <span className="text-gray-600">効果予測:</span>
                  <span className="font-medium ml-1 text-green-600">68%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Weather-Based Promotions */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CloudIcon className="h-5 w-5 mr-2 text-blue-500" />
            天気連動プロモーション
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-gray-100 to-blue-100 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">☔</span>
                <h4 className="font-medium text-gray-900">雨の日限定メニュー</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                湿気対策メニューを雨天時に自動プロモーション
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">対象サービス: 縮毛矯正、湿気対策トリートメント</span>
                <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">
                  自動配信
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">☀️</span>
                <h4 className="font-medium text-gray-900">紫外線対策キャンペーン</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                晴天予報時にUVケアメニューを自動提案
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">対象サービス: UVケアトリートメント、夏カラー</span>
                <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-medium">
                  条件設定済み
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* No-Show Prevention */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ノーショー防止システム</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">現在の成果</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">-67%</div>
                  <div className="text-sm text-green-700">ノーショー削減</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">¥180,000</div>
                  <div className="text-sm text-green-700">月間売上保護</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">7日前確認</span>
                  <p className="text-sm text-gray-600">予約確認とサービス詳細案内</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  自動送信
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">1日前最終確認</span>
                  <p className="text-sm text-gray-600">リッチメッセージで詳細情報提供</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  高効果
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Time Slot Optimization */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">時間帯最適化</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">平日昼間の活用促進</h4>
              <p className="text-sm text-gray-600 mb-3">
                空き時間を有効活用する特別価格の自動提案
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">対象時間: 平日10:00-14:00</span>
                <span className="font-medium text-blue-600">20%OFF自動適用</span>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">最終枠の魅力向上</h4>
              <p className="text-sm text-gray-600 mb-3">
                夜間枠限定サービスで稼働率向上
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">対象時間: 19:00以降</span>
                <span className="font-medium text-purple-600">ドリンク無料サービス</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">パフォーマンス分析</h2>
      
      <Card>
        <div className="text-center py-12">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            高度な分析機能
          </h3>
          <p className="text-gray-600 mb-6">
            ROI分析、顧客ジャーニー分析、収益帰属モデルなど、
            包括的なパフォーマンス分析をご利用いただけます。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">420%</div>
              <div className="text-sm text-blue-700">平均キャンペーンROI</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">85%</div>
              <div className="text-sm text-green-700">顧客満足度</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">¥25,000</div>
              <div className="text-sm text-purple-700">平均顧客LTV</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">ビジネス洞察</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-500" />
            売上成長の要因
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-green-800">VIP顧客の単価向上</span>
                <span className="text-green-600 font-bold">+28%</span>
              </div>
              <p className="text-sm text-green-700">
                パーソナライズされた特別サービスが高い満足度を獲得
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-800">新規顧客の定着率改善</span>
                <span className="text-blue-600 font-bold">+15%</span>
              </div>
              <p className="text-sm text-blue-700">
                初回来店後のフォローアップキャンペーンが効果的
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BoltIcon className="h-5 w-5 mr-2 text-yellow-500" />
            改善機会
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-orange-800">平日昼間の稼働率</span>
                <span className="text-orange-600 font-bold">65%</span>
              </div>
              <p className="text-sm text-orange-700">
                ターゲットを絞った平日割引キャンペーンで改善可能
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-800">アップセル機会</span>
                <span className="text-purple-600 font-bold">+¥120,000</span>
              </div>
              <p className="text-sm text-purple-700">
                既存顧客へのトリートメント提案で月間売上向上
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">戦略的推奨事項</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">短期施策（1-3ヶ月）</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">離脱リスク顧客への緊急アプローチ実施</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">天気連動プロモーションの本格運用</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">平日昼間の稼働率向上キャンペーン</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">中長期戦略（3-12ヶ月）</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">顧客ロイヤルティプログラムの導入</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">スタッフ別パフォーマンス最適化</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700">予測分析に基づく動的価格設定</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto pb-24 lg:pb-6 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={animations.spring.gentle}
        className="mb-6 lg:mb-8"
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
            <BoltIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              インテリジェント ビジネスセンター
            </h1>
            <p className="text-gray-600 mt-1">AI駆動の顧客分析と自動化システム</p>
          </div>
        </div>
        
        <div className="mt-4 h-1 bg-gradient-to-r from-primary-200 via-secondary-200 to-accent-200 rounded-full" />
      </motion.div>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={animations.spring.gentle}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'segments' && renderSegments()}
          {activeTab === 'campaigns' && renderCampaigns()}
          {activeTab === 'reminders' && renderReminders()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'insights' && renderInsights()}
        </motion.div>
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="text-lg font-medium text-gray-900">分析中...</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}