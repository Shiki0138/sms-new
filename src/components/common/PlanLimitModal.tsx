import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ChartBarIcon,
  SparklesIcon,
  CheckIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'customers' | 'reservations' | 'staff' | 'ai_replies' | 'messages';
  currentUsage: number;
  limit: number;
  upgradeUrl?: string;
}

const limitTypeInfo = {
  customers: {
    title: '顧客登録数が上限に達しました',
    icon: '👥',
    description: '現在のライトプランでは最大100名まで顧客登録が可能です。',
    benefits: [
      '無制限の顧客登録',
      '詳細な顧客分析機能',
      '顧客タグ・グループ機能',
      '誕生日自動メッセージ',
    ],
  },
  reservations: {
    title: '月間予約数が上限に達しました',
    icon: '📅',
    description: '今月の予約数が50件に達しました。',
    benefits: [
      '月間予約数無制限',
      'オンライン予約受付',
      '複数スタッフ対応',
      '予約分析レポート',
    ],
  },
  staff: {
    title: 'スタッフアカウントが上限に達しました',
    icon: '💇‍♀️',
    description: 'ライトプランでは1名までスタッフ登録が可能です。',
    benefits: [
      '無制限のスタッフ登録',
      'スタッフ別売上管理',
      'シフト管理機能',
      'スタッフ権限管理',
    ],
  },
  ai_replies: {
    title: 'AI返信回数が上限に達しました',
    icon: '🤖',
    description: '今月のAI返信回数が200回に達しました。',
    benefits: [
      '無制限のAI返信',
      '高度なAIカスタマイズ',
      '学習機能の強化',
      '多言語対応',
    ],
  },
  messages: {
    title: 'メッセージ送信数が上限に達しました',
    icon: '💬',
    description: '今月のメッセージ送信数が200通に達しました。',
    benefits: [
      '無制限のメッセージ送信',
      '画像・動画送信対応',
      'テンプレート無制限',
      '一斉送信機能強化',
    ],
  },
};

export default function PlanLimitModal({
  isOpen,
  onClose,
  limitType,
  currentUsage,
  limit,
  upgradeUrl = '/settings/plan',
}: PlanLimitModalProps) {
  const info = limitTypeInfo[limitType];
  const usagePercentage = Math.min((currentUsage / limit) * 100, 100);

  const handleUpgrade = () => {
    if (upgradeUrl.startsWith('http')) {
      window.open(upgradeUrl, '_blank');
    } else {
      window.location.href = upgradeUrl;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={animations.spring.gentle}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>

                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{info.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold">{info.title}</h2>
                    <p className="text-sm text-white/90 mt-1">{info.description}</p>
                  </div>
                </div>

                {/* Usage Progress */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/90">使用状況</span>
                    <span className="text-sm font-medium">
                      {currentUsage} / {limit}
                    </span>
                  </div>
                  <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePercentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="absolute top-0 left-0 h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <SparklesIcon className="h-5 w-5 text-primary-500 mr-2" />
                    プロプランにアップグレードすると
                  </h3>
                  <ul className="space-y-3">
                    {info.benefits.map((benefit, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start"
                      >
                        <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Pricing */}
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-4 rounded-xl mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">プロプラン</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ¥9,980
                        <span className="text-sm text-gray-600 font-normal">/月</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 line-through">通常 ¥19,800</p>
                      <p className="text-sm font-semibold text-primary-600">50% OFF</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    後で検討
                  </Button>
                  <Button
                    onClick={handleUpgrade}
                    className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
                  >
                    <ArrowUpIcon className="h-4 w-4 mr-2" />
                    今すぐアップグレード
                  </Button>
                </div>

                {/* Additional Info */}
                <p className="text-xs text-gray-500 text-center mt-4">
                  ※ いつでもダウングレード可能です
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}