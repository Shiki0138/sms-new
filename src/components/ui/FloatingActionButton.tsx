import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  bgColor?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  mainIcon?: React.ReactNode;
  mainLabel?: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function FloatingActionButton({
  actions,
  mainIcon = <PlusIcon className="h-6 w-6" />,
  mainLabel = 'アクション',
  className = '',
  position = 'bottom-right',
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  // ポジションクラス
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 md:bottom-6',
    'bottom-left': 'bottom-20 left-4 md:bottom-6',
    'top-right': 'top-20 right-4 md:top-6',
    'top-left': 'top-20 left-4 md:top-6',
  };

  // アクションボタンの配置方向
  const actionDirection = {
    'bottom-right': 'bottom',
    'bottom-left': 'bottom',
    'top-right': 'top',
    'top-left': 'top',
  };

  const isBottomPosition = position.includes('bottom');

  return (
    <div
      ref={containerRef}
      className={`fixed z-40 ${positionClasses[position]} ${className}`}
    >
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* 背景オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-30 -z-10"
              onClick={() => setIsExpanded(false)}
            />

            {/* アクションボタン群 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute ${position.includes('right') ? 'right-0' : 'left-0'} ${
                isBottomPosition ? 'bottom-full mb-4' : 'top-full mt-4'
              }`}
            >
              <div className={`flex flex-col ${isBottomPosition ? '' : 'flex-col-reverse'} space-y-3`}>
                {actions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, x: position.includes('right') ? 20 : -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: position.includes('right') ? 20 : -20 }}
                    transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                    className="flex items-center"
                  >
                    {/* ラベル */}
                    <motion.span
                      initial={{ opacity: 0, x: position.includes('right') ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                      className={`
                        ${position.includes('right') ? 'mr-3 order-first' : 'ml-3 order-last'}
                        bg-gray-800 text-white text-sm font-medium
                        px-3 py-1.5 rounded-lg shadow-lg
                        whitespace-nowrap
                      `}
                    >
                      {action.label}
                    </motion.span>

                    {/* アクションボタン */}
                    <button
                      onClick={() => {
                        action.onClick();
                        setIsExpanded(false);
                      }}
                      className={`
                        relative w-12 h-12 rounded-full shadow-lg
                        flex items-center justify-center
                        transition-all duration-200 hover:scale-110
                        active:scale-95 touch-manipulation
                        ${action.bgColor || 'bg-white'}
                        ${action.color || 'text-gray-700'}
                        hover:shadow-xl
                      `}
                    >
                      {action.icon}
                      
                      {/* リップルエフェクト */}
                      <span className="absolute inset-0 rounded-full overflow-hidden">
                        <motion.span
                          className="absolute inset-0 bg-current opacity-20"
                          initial={{ scale: 0 }}
                          whileTap={{ scale: 2 }}
                          transition={{ duration: 0.5 }}
                        />
                      </span>
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* メインFABボタン */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          relative w-14 h-14 md:w-16 md:h-16
          bg-gradient-to-br from-primary-500 to-primary-600
          text-white rounded-full shadow-lg
          flex items-center justify-center
          hover:shadow-xl active:shadow-md
          transition-all duration-200
          touch-manipulation select-none
          ${isExpanded ? 'shadow-2xl' : ''}
        `}
        aria-label={mainLabel}
      >
        {/* アイコンの回転アニメーション */}
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {mainIcon}
        </motion.div>

        {/* パルスアニメーション（未展開時） */}
        {!isExpanded && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary-400"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}

        {/* リップルエフェクト */}
        <span className="absolute inset-0 rounded-full overflow-hidden">
          <motion.span
            className="absolute inset-0 bg-white opacity-25"
            initial={{ scale: 0 }}
            whileTap={{ scale: 2 }}
            transition={{ duration: 0.5 }}
          />
        </span>
      </motion.button>
    </div>
  );
}

// プリセットFABコンポーネント
export const QuickActionFAB: React.FC<{
  onNewReservation: () => void;
  onNewCustomer: () => void;
  onNewMessage: () => void;
  position?: FloatingActionButtonProps['position'];
}> = ({ onNewReservation, onNewCustomer, onNewMessage, position }) => {
  const actions: FABAction[] = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      ),
      label: '新規予約',
      onClick: onNewReservation,
      bgColor: 'bg-blue-500',
      color: 'text-white',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" 
          />
        </svg>
      ),
      label: '顧客登録',
      onClick: onNewCustomer,
      bgColor: 'bg-green-500',
      color: 'text-white',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
      ),
      label: 'メッセージ',
      onClick: onNewMessage,
      bgColor: 'bg-purple-500',
      color: 'text-white',
    },
  ];

  return <FloatingActionButton actions={actions} position={position} />;
};