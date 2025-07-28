import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';

interface PlanLimitWarningProps {
  warnings: Array<{
    type: 'warning' | 'error';
    message: string;
    category: 'customers' | 'reservations' | 'staff';
  }>;
  onUpgrade?: () => void;
  onDismiss?: (index: number) => void;
  className?: string;
}

export default function PlanLimitWarning({
  warnings,
  onUpgrade,
  onDismiss,
  className = '',
}: PlanLimitWarningProps) {
  if (warnings.length === 0) return null;

  const getWarningColor = (type: 'warning' | 'error') => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'text-gray-600',
          button: 'bg-gray-600 hover:bg-gray-700',
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    // すべて同じアイコンを使用
    return ExclamationTriangleIcon;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence>
        {warnings.map((warning, index) => {
          const colors = getWarningColor(warning.type);
          const IconComponent = getCategoryIcon(warning.category);

          return (
            <motion.div
              key={`${warning.category}-${index}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={animations.spring.gentle}
              className={`${colors.bg} ${colors.border} border rounded-xl p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-1 ${colors.icon}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-medium ${colors.text}`}>
                        {warning.type === 'error' ? 'プラン制限に達しました' : 'プラン制限に近づいています'}
                      </h3>
                      {warning.type === 'error' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          制限達成
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${colors.text.replace('800', '700')}`}>
                      {warning.message}
                    </p>

                    {/* アップグレード推奨 */}
                    <div className="mt-3 flex items-center space-x-3">
                      {onUpgrade && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onUpgrade}
                          className={`flex items-center space-x-2 ${colors.button} text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors`}
                        >
                          <CreditCardIcon className="h-4 w-4" />
                          <span>プランをアップグレード</span>
                        </motion.button>
                      )}
                      
                      <span className="text-xs text-gray-600">
                        スタンダードプランなら制限が大幅に拡大されます
                      </span>
                    </div>
                  </div>
                </div>

                {onDismiss && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDismiss(index)}
                    className={`p-1 ${colors.icon} hover:bg-black hover:bg-opacity-10 rounded transition-colors`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* プラン比較表 */}
      {warnings.some(w => w.type === 'error') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...animations.spring.gentle }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4"
        >
          <h4 className="font-medium text-blue-800 mb-3">プラン比較</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3">
              <div className="font-medium text-gray-800 mb-2">ライトプラン（現在）</div>
              <div className="space-y-1 text-gray-600">
                <div>• 顧客管理: 100名まで</div>
                <div>• 月間予約: 50件まで</div>
                <div>• スタッフ: 3名まで</div>
                <div className="font-medium text-blue-600">¥4,980/月</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-3 border-2 border-primary-200">
              <div className="font-medium text-primary-800 mb-2">
                スタンダードプラン
                <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                  おすすめ
                </span>
              </div>
              <div className="space-y-1 text-primary-700">
                <div>• 顧客管理: 500名まで</div>
                <div>• 月間予約: 200件まで</div>
                <div>• スタッフ: 10名まで</div>
                <div className="font-medium text-primary-600">¥9,980/月</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3">
              <div className="font-medium text-gray-800 mb-2">プレミアムプラン</div>
              <div className="space-y-1 text-gray-600">
                <div>• 顧客管理: 無制限</div>
                <div>• 月間予約: 無制限</div>
                <div>• スタッフ: 無制限</div>
                <div className="font-medium text-gray-800">¥19,980/月</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}