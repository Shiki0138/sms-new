import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Crown, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { animations } from '../../styles/design-system';

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  description: string;
  paidAt: string;
  invoiceUrl?: string;
}

export default function BillingPage() {
  const { tenant } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, [tenant]);

  const loadBillingData = async () => {
    if (!tenant?.id) return;

    try {
      // プラン一覧を取得
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (plansData) {
        setPlans(plansData.map(plan => ({
          id: plan.id,
          name: plan.name,
          displayName: plan.display_name,
          description: plan.description,
          priceMonthly: plan.price_monthly,
          priceYearly: plan.price_yearly,
          features: plan.features,
          limits: plan.limits,
        })));
      }

      // 現在のサブスクリプションを取得
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .single();

      if (subscriptionData) {
        setCurrentSubscription({
          id: subscriptionData.id,
          planId: subscriptionData.plan_id,
          status: subscriptionData.status,
          currentPeriodStart: subscriptionData.current_period_start,
          currentPeriodEnd: subscriptionData.current_period_end,
          cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
        });
        setSelectedPlan(subscriptionData.plan_id);
      }

      // 支払い履歴を取得
      const { data: paymentsData } = await supabase
        .from('payment_history')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsData) {
        setPaymentHistory(paymentsData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.payment_method,
          description: payment.description,
          paidAt: payment.paid_at,
          invoiceUrl: payment.invoice_url,
        })));
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('課金情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planId: string) => {
    setSelectedPlan(planId);
    
    // 実際のプラン変更処理は決済システム（Stripe等）と連携が必要
    toast.info('プラン変更機能は現在準備中です');
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    if (window.confirm('本当にサブスクリプションをキャンセルしますか？\n現在の期間終了まではサービスをご利用いただけます。')) {
      // 実際のキャンセル処理
      toast.info('サブスクリプションのキャンセル機能は現在準備中です');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'light':
        return <Star className="h-8 w-8" />;
      case 'standard':
        return <Crown className="h-8 w-8" />;
      case 'premium':
        return <Zap className="h-8 w-8" />;
      default:
        return <Star className="h-8 w-8" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'light':
        return 'from-gray-100 to-gray-200';
      case 'standard':
        return 'from-blue-100 to-indigo-200';
      case 'premium':
        return 'from-purple-100 to-pink-200';
      default:
        return 'from-gray-100 to-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">料金・お支払い</h1>
        <p className="mt-1 text-sm text-gray-600">
          プランの管理とお支払い履歴の確認
        </p>
      </div>

      {/* 現在のプラン */}
      {currentSubscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={animations.spring.gentle}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">現在のプラン</h2>
            {currentSubscription.cancelAtPeriodEnd && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                期間終了時にキャンセル予定
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {plans.find(p => p.id === currentSubscription.planId)?.displayName}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                次回更新日: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('ja-JP')}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => window.open('/settings?tab=plan', '_blank')}
                className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                プラン詳細
              </button>
              {currentSubscription.status === 'active' && !currentSubscription.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 料金プラン切り替え */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">料金プラン</h2>
          
          {/* 月額/年額切り替え */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              月額
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              年額
              <span className="ml-1 text-xs text-green-600">（20%お得）</span>
            </button>
          </div>
        </div>

        {/* プラン一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentSubscription?.planId === plan.id;
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, ...animations.spring.gentle }}
                className={`relative bg-white rounded-xl shadow-sm border-2 transition-all ${
                  isCurrentPlan
                    ? 'border-primary-500 ring-2 ring-primary-100'
                    : selectedPlan === plan.id
                    ? 'border-primary-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="px-3 py-1 bg-primary-500 text-white text-xs font-medium rounded-full">
                      現在のプラン
                    </span>
                  </div>
                )}
                
                {plan.name === 'standard' && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      人気
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* プランアイコンと名前 */}
                  <div className="flex items-center justify-center mb-4">
                    <div className={`p-4 bg-gradient-to-br ${getPlanColor(plan.name)} rounded-full text-gray-700`}>
                      {getPlanIcon(plan.name)}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    {plan.displayName}
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    {plan.description}
                  </p>

                  {/* 価格 */}
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900">
                      {formatPrice(price)}
                    </div>
                    <div className="text-sm text-gray-600">
                      / {billingCycle === 'monthly' ? '月' : '年'}
                    </div>
                  </div>

                  {/* 機能一覧 */}
                  <div className="space-y-3 mb-6">
                    {Object.entries(plan.features).map(([key, value]) => {
                      if (!value) return null;
                      
                      const featureName = {
                        customer_management: '顧客管理',
                        reservation_management: '予約管理',
                        basic_dashboard: '基本ダッシュボード',
                        advanced_dashboard: '高度なダッシュボード',
                        email_notifications: 'メール通知',
                        line_integration: 'LINE連携',
                        instagram_integration: 'Instagram連携',
                        google_calendar_integration: 'Googleカレンダー連携',
                        detailed_analytics: '詳細分析',
                        ai_features: 'AI機能',
                        custom_reports: 'カスタムレポート',
                        api_access: 'API連携',
                      }[key] || key;
                      
                      return (
                        <div key={key} className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{featureName}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 制限 */}
                  <div className="border-t pt-4 space-y-2">
                    {Object.entries(plan.limits).map(([key, value]) => {
                      const limitName = {
                        max_customers: '顧客登録数',
                        max_monthly_reservations: '月間予約数',
                        max_monthly_messages: '月間メッセージ数',
                        max_staff: 'スタッフ数',
                      }[key] || key;
                      
                      return (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{limitName}</span>
                          <span className="font-medium text-gray-900">
                            {value === null ? '無制限' : `${value}まで`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* アクションボタン */}
                  <div className="mt-6">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                      >
                        現在のプラン
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlanChange(plan.id)}
                        className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                      >
                        {currentSubscription && plan.priceMonthly > plans.find(p => p.id === currentSubscription.planId)?.priceMonthly!
                          ? 'アップグレード'
                          : 'このプランに変更'
                        }
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* お支払い履歴 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...animations.spring.gentle }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">お支払い履歴</h2>
        </div>
        
        {paymentHistory.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptPercentIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">お支払い履歴はありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    説明
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求書
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.paidAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatPrice(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.status === 'succeeded'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status === 'succeeded' ? '支払済み' : 
                         payment.status === 'failed' ? '失敗' : 
                         payment.status === 'refunded' ? '返金済み' : '保留中'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.invoiceUrl && (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>表示</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* お支払い方法 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ...animations.spring.gentle }}
        className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">お支払い方法</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCardIcon className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  •••• •••• •••• 4242
                </p>
                <p className="text-xs text-gray-600">有効期限: 12/25</p>
              </div>
            </div>
            
            <button className="text-sm text-primary-600 hover:text-primary-700">
              変更
            </button>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">決済システム統合について</p>
              <p className="mt-1">
                実際の決済処理にはStripe等の決済サービスとの連携が必要です。
                デモ環境では決済機能は動作しません。
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}