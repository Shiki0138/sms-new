import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Calendar, Users, MessageCircle } from 'lucide-react';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'pulse' | 'dots';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  type = 'spinner', 
  message = '読み込み中...',
  fullScreen = false 
}) => {
  const containerClass = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center p-8';

  if (type === 'spinner') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <Scissors className="h-12 w-12 text-purple-600" />
          </motion.div>
          <p className="mt-4 text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={containerClass}>
        <div className="flex items-center space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: index * 0.2,
              }}
              className="h-3 w-3 bg-purple-600 rounded-full"
            />
          ))}
        </div>
        {message && <p className="ml-4 text-gray-600">{message}</p>}
      </div>
    );
  }

  return null;
};

export const SkeletonLoader: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center space-x-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

interface PageLoadingProps {
  page: 'dashboard' | 'reservations' | 'customers' | 'messages';
}

export const PageLoading: React.FC<PageLoadingProps> = ({ page }) => {
  const icons = {
    dashboard: Scissors,
    reservations: Calendar,
    customers: Users,
    messages: MessageCircle,
  };

  const Icon = icons[page];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center bg-gray-50"
    >
      <div className="text-center">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-block mb-4"
        >
          <div className="p-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl">
            <Icon className="h-16 w-16 text-purple-600" />
          </div>
        </motion.div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          ページを読み込んでいます
        </h2>
        <p className="text-gray-600">少々お待ちください...</p>
      </div>
    </motion.div>
  );
};