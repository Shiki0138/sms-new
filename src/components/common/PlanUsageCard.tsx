import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  CalendarIcon,
  EnvelopeIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { PlanUsage, PlanLimitsService } from '../../services/plan-limits';
import { animations } from '../../styles/design-system';

interface PlanUsageCardProps {
  tenantId: string;
  className?: string;
  showDetails?: boolean;
}

export default function PlanUsageCard({ 
  tenantId, 
  className = '',
  showDetails = true 
}: PlanUsageCardProps) {
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [warnings, setWarnings] = useState<Array<{
    type: string;
    level: 'info' | 'warning' | 'danger';
    message: string;
    percentage: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [tenantId]);

  const loadUsageData = async () => {
    try {
      const service = new PlanLimitsService(tenantId);
      const [usageData, warningsData] = await Promise.all([
        service.getCurrentUsage(),
        service.getWarnings(),
      ]);
      
      setUsage(usageData);
      setWarnings(warningsData);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600 bg-red-100';
    if (percentage >= 80) return 'text-orange-600 bg-orange-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const usageItems = usage ? [
    {
      icon: UsersIcon,
      label: '顧客登録',
      current: usage.customers.current,
      limit: usage.customers.limit,
      percentage: usage.customers.percentage,
      unit: '名',
    },
    {
      icon: CalendarIcon,
      label: '月間予約',
      current: usage.monthlyReservations.current,
      limit: usage.monthlyReservations.limit,
      percentage: usage.monthlyReservations.percentage,
      unit: '件',
    },
    {
      icon: EnvelopeIcon,
      label: '日間メール',
      current: usage.dailyEmails.current,
      limit: usage.dailyEmails.limit,
      percentage: usage.dailyEmails.percentage,
      unit: '通',
    },
    {
      icon: ChartBarIcon,
      label: '月間API',
      current: usage.apiCalls.current,
      limit: usage.apiCalls.limit,
      percentage: usage.apiCalls.percentage,
      unit: '回',
    },
  ] : [];

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={animations.spring.gentle}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CloudIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">ライトプラン使用状況</h3>
              <p className="text-xs text-gray-600">¥4,980/月</p>
            </div>
          </div>
          
          {warnings.length > 0 && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-1 text-orange-600"
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="text-xs font-medium">{warnings.length}件の警告</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* 使用状況一覧 */}
      <div className="p-6">
        {showDetails ? (
          <div className="space-y-4">
            {usageItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, ...animations.spring.gentle }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {item.current} / {item.limit} {item.unit}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getUsageColor(item.percentage)}`}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: "easeOut" }}
                    className={`h-2 rounded-full ${getProgressBarColor(item.percentage)}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* 簡略表示 */
          <div className="grid grid-cols-2 gap-4">
            {usageItems.slice(0, 4).map((item, index) => (
              <div key={item.label} className="text-center">
                <div className={`text-lg font-bold ${getUsageColor(item.percentage).split(' ')[0]}`}>
                  {item.percentage}%
                </div>
                <div className="text-xs text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 警告メッセージ */}
        {warnings.length > 0 && showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={animations.spring.gentle}
            className="mt-6 space-y-2"
          >
            <div className="flex items-center space-x-2 text-orange-600 mb-3">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span className="text-sm font-medium">使用量の警告</span>
            </div>
            
            {warnings.map((warning, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, ...animations.spring.gentle }}
                className={`p-3 rounded-lg border-l-4 ${
                  warning.level === 'danger' 
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-orange-50 border-orange-400 text-orange-700'
                }`}
              >
                <p className="text-xs">{warning.message}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* プラン情報 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-600">
              <InformationCircleIcon className="h-4 w-4" />
              <span className="text-xs">ライトプラン</span>
            </div>
            <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              プラン詳細
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}