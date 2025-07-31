import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';

const OnboardingOverlay: React.FC = () => {
  const {
    isActive,
    currentStep,
    totalSteps,
    nextStep,
    previousStep,
    skipOnboarding,
    getCurrentStep,
  } = useOnboarding();

  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const step = getCurrentStep();
    if (step?.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      setHighlightElement(element);
    } else {
      setHighlightElement(null);
    }
  }, [getCurrentStep]);

  const step = getCurrentStep();
  if (!isActive || !step) return null;

  const getTooltipPosition = () => {
    if (!highlightElement || !step.placement) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = highlightElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const padding = 20;

    let position: any = {};

    switch (step.placement) {
      case 'top':
        position = {
          bottom: window.innerHeight - rect.top + padding,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case 'bottom':
        position = {
          top: rect.bottom + padding,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
        break;
      case 'left':
        position = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          right: window.innerWidth - rect.left + padding,
        };
        break;
      case 'right':
        position = {
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + padding,
        };
        break;
    }

    // 画面端での調整
    if (position.left !== undefined) {
      position.left = Math.max(padding, Math.min(position.left, window.innerWidth - tooltipWidth - padding));
    }
    if (position.top !== undefined) {
      position.top = Math.max(padding, Math.min(position.top, window.innerHeight - tooltipHeight - padding));
    }

    return position;
  };

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={skipOnboarding}
          />

          {/* ハイライト */}
          {highlightElement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: highlightElement.getBoundingClientRect().top - 4,
                left: highlightElement.getBoundingClientRect().left - 4,
                width: highlightElement.getBoundingClientRect().width + 8,
                height: highlightElement.getBoundingClientRect().height + 8,
                boxShadow: '0 0 0 4px rgba(168, 85, 247, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5)',
                borderRadius: '12px',
              }}
            />
          )}

          {/* ツールチップ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[10000] bg-white rounded-2xl shadow-2xl p-6 max-w-sm"
            style={getTooltipPosition()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
              </div>
              <button
                onClick={skipOnboarding}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* 説明文 */}
            <p className="text-gray-600 mb-6">{step.description}</p>

            {/* アクションボタン */}
            {step.action && (
              <button
                onClick={step.action.onClick}
                className="w-full mb-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                {step.action.label}
              </button>
            )}

            {/* プログレスバー */}
            <div className="mb-4">
              <div className="flex space-x-1">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      index <= currentStep ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {currentStep + 1} / {totalSteps}
              </p>
            </div>

            {/* ナビゲーションボタン */}
            <div className="flex items-center justify-between">
              <button
                onClick={previousStep}
                disabled={currentStep === 0}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">戻る</span>
              </button>

              <button
                onClick={skipOnboarding}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                スキップ
              </button>

              <button
                onClick={nextStep}
                className="flex items-center space-x-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <span className="text-sm font-medium">
                  {currentStep === totalSteps - 1 ? '完了' : '次へ'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;