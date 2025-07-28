import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

export type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewSelectorProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  className?: string;
}

export default function CalendarViewSelector({
  currentView,
  onViewChange,
  className = '',
}: CalendarViewSelectorProps) {
  const views = [
    {
      type: 'day' as const,
      label: '日',
      icon: TableCellsIcon,
      description: '1日詳細表示',
    },
    {
      type: 'week' as const,
      label: '週',
      icon: Squares2X2Icon,
      description: '1週間表示',
    },
    {
      type: 'month' as const,
      label: '月',
      icon: CalendarDaysIcon,
      description: '1ヶ月表示',
    },
  ];

  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      {views.map((view) => {
        const isActive = currentView === view.type;
        const Icon = view.icon;

        return (
          <motion.button
            key={view.type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onViewChange(view.type)}
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              isActive
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            }`}
            title={view.description}
          >
            {isActive && (
              <motion.div
                layoutId="activeViewIndicator"
                className="absolute inset-0 bg-white rounded-md shadow-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            <div className="relative flex items-center space-x-2">
              <Icon className="h-4 w-4" />
              <span>{view.label}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}