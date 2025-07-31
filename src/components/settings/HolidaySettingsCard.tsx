import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { animations } from '../../styles/design-system';

export interface HolidaySetting {
  id: string;
  holidayType: 'weekly' | 'monthly' | 'specific_date';
  dayOfWeek?: number; // 0=日曜, 1=月曜...
  weekOfMonth?: number; // 第n週 (1-5)
  specificDate?: string; // YYYY-MM-DD
  endDate?: string; // 期間指定の終了日
  description: string;
  isActive: boolean;
}

export interface BusinessHour {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

interface HolidaySettingsCardProps {
  holidays: HolidaySetting[];
  businessHours: BusinessHour[];
  onAddHoliday?: (holiday: Omit<HolidaySetting, 'id'>) => void;
  onUpdateHoliday?: (id: string, holiday: Partial<HolidaySetting>) => void;
  onDeleteHoliday?: (id: string) => void;
  onUpdateBusinessHours?: (dayOfWeek: number, hours: Partial<BusinessHour>) => void;
  className?: string;
}

const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
const weekNames = ['第1', '第2', '第3', '第4', '第5'];

export default function HolidaySettingsCard({
  holidays,
  businessHours,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onUpdateBusinessHours,
  className = '',
}: HolidaySettingsCardProps) {
  const [activeTab, setActiveTab] = useState<'business_hours' | 'holidays'>('business_hours');
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<string | null>(null);
  const [newHoliday, setNewHoliday] = useState<{
    holidayType: 'weekly' | 'monthly' | 'specific_date';
    dayOfWeek: number;
    weekOfMonth: number;
    specificDate: string;
    endDate: string;
    description: string;
    isActive: boolean;
  }>({
    holidayType: 'weekly',
    dayOfWeek: 0,
    weekOfMonth: 1,
    specificDate: '',
    endDate: '',
    description: '',
    isActive: true,
  });

  const formatHolidayDescription = (holiday: HolidaySetting): string => {
    switch (holiday.holidayType) {
      case 'weekly':
        return `毎週${dayNames[holiday.dayOfWeek!]}曜日`;
      case 'monthly':
        return `毎月${weekNames[holiday.weekOfMonth! - 1]}${dayNames[holiday.dayOfWeek!]}曜日`;
      case 'specific_date':
        if (holiday.endDate) {
          return `${format(new Date(holiday.specificDate!), 'yyyy年M月d日', { locale: ja })} - ${format(new Date(holiday.endDate), 'yyyy年M月d日', { locale: ja })}`;
        }
        return format(new Date(holiday.specificDate!), 'yyyy年M月d日', { locale: ja });
      default:
        return '';
    }
  };

  const handleAddHoliday = () => {
    const holidayData: Omit<HolidaySetting, 'id'> = {
      holidayType: newHoliday.holidayType,
      description: newHoliday.description,
      isActive: true,
    };

    if (newHoliday.holidayType === 'weekly') {
      holidayData.dayOfWeek = newHoliday.dayOfWeek;
    } else if (newHoliday.holidayType === 'monthly') {
      holidayData.dayOfWeek = newHoliday.dayOfWeek;
      holidayData.weekOfMonth = newHoliday.weekOfMonth;
    } else if (newHoliday.holidayType === 'specific_date') {
      holidayData.specificDate = newHoliday.specificDate;
      if (newHoliday.endDate) {
        holidayData.endDate = newHoliday.endDate;
      }
    }

    onAddHoliday?.(holidayData);
    
    // リセット
    setNewHoliday({
      holidayType: 'weekly',
      dayOfWeek: 0,
      weekOfMonth: 1,
      specificDate: '',
      endDate: '',
      description: '',
      isActive: true,
    });
    setIsAddingHoliday(false);
  };

  const handleUpdateBusinessHour = (dayOfWeek: number, field: string, value: any) => {
    onUpdateBusinessHours?.(dayOfWeek, { [field]: value });
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">営業時間・休日設定</h3>
              <p className="text-sm text-gray-600">
                営業時間と定休日・特別休業日を設定
              </p>
            </div>
          </div>
        </div>

        {/* タブ */}
        <div className="mt-4 flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'business_hours', label: '営業時間' },
            { key: 'holidays', label: '休日設定' },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'business_hours' && (
            <motion.div
              key="business_hours"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={animations.spring.gentle}
              className="space-y-4"
            >
              {businessHours.map((hour, index) => (
                <div key={hour.dayOfWeek} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`font-medium ${
                        hour.dayOfWeek === 0 ? 'text-red-600' : 
                        hour.dayOfWeek === 6 ? 'text-blue-600' : 
                        'text-gray-800'
                      }`}>
                        {dayNames[hour.dayOfWeek]}曜日
                      </span>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={hour.isOpen}
                          onChange={(e) => handleUpdateBusinessHour(hour.dayOfWeek, 'isOpen', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">営業日</span>
                      </label>
                    </div>
                  </div>

                  {hour.isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid grid-cols-2 md:grid-cols-4 gap-3"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          開店時間
                        </label>
                        <input
                          type="time"
                          value={hour.openTime}
                          onChange={(e) => handleUpdateBusinessHour(hour.dayOfWeek, 'openTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          閉店時間
                        </label>
                        <input
                          type="time"
                          value={hour.closeTime}
                          onChange={(e) => handleUpdateBusinessHour(hour.dayOfWeek, 'closeTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          休憩開始
                        </label>
                        <input
                          type="time"
                          value={hour.breakStartTime || ''}
                          onChange={(e) => handleUpdateBusinessHour(hour.dayOfWeek, 'breakStartTime', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          休憩終了
                        </label>
                        <input
                          type="time"
                          value={hour.breakEndTime || ''}
                          onChange={(e) => handleUpdateBusinessHour(hour.dayOfWeek, 'breakEndTime', e.target.value || undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'holidays' && (
            <motion.div
              key="holidays"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={animations.spring.gentle}
              className="space-y-4"
            >
              {/* 休日追加ボタン */}
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddingHoliday(true)}
                  className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>休日追加</span>
                </motion.button>
              </div>

              {/* 休日追加フォーム */}
              <AnimatePresence>
                {isAddingHoliday && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={animations.spring.gentle}
                    className="overflow-hidden border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          休日タイプ
                        </label>
                        <select
                          value={newHoliday.holidayType}
                          onChange={(e) => setNewHoliday({ ...newHoliday, holidayType: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="weekly">毎週の定休日</option>
                          <option value="monthly">毎月第n曜日</option>
                          <option value="specific_date">特定日付</option>
                        </select>
                      </div>

                      {newHoliday.holidayType === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            曜日
                          </label>
                          <select
                            value={newHoliday.dayOfWeek}
                            onChange={(e) => setNewHoliday({ ...newHoliday, dayOfWeek: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {dayNames.map((day, index) => (
                              <option key={index} value={index}>{day}曜日</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {newHoliday.holidayType === 'monthly' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              第n週
                            </label>
                            <select
                              value={newHoliday.weekOfMonth}
                              onChange={(e) => setNewHoliday({ ...newHoliday, weekOfMonth: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              {weekNames.map((week, index) => (
                                <option key={index} value={index + 1}>{week}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              曜日
                            </label>
                            <select
                              value={newHoliday.dayOfWeek}
                              onChange={(e) => setNewHoliday({ ...newHoliday, dayOfWeek: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              {dayNames.map((day, index) => (
                                <option key={index} value={index}>{day}曜日</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {newHoliday.holidayType === 'specific_date' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              開始日
                            </label>
                            <input
                              type="date"
                              value={newHoliday.specificDate}
                              onChange={(e) => setNewHoliday({ ...newHoliday, specificDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              終了日（期間指定の場合）
                            </label>
                            <input
                              type="date"
                              value={newHoliday.endDate}
                              onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          説明
                        </label>
                        <input
                          type="text"
                          value={newHoliday.description}
                          onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                          placeholder="休日の説明を入力"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsAddingHoliday(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                          キャンセル
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAddHoliday}
                          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                        >
                          追加
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* カレンダー連携状況 */}
              {holidays.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">カレンダー連携状況</h4>
                      <p className="text-xs text-blue-600">
                        {holidays.filter(h => h.isActive).length}件の休日設定が予約管理カレンダーに反映されています
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 休日一覧 */}
              {holidays.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">休日設定がありません</p>
                  <p className="text-sm text-gray-400">「休日追加」ボタンから設定してください</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {holidays.map((holiday, index) => (
                    <motion.div
                      key={holiday.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className={`font-medium ${holiday.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                              {formatHolidayDescription(holiday)}
                            </span>
                            {!holiday.isActive && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                無効
                              </span>
                            )}
                          </div>
                          {holiday.description && (
                            <p className="text-sm text-gray-600 mt-1">{holiday.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onUpdateHoliday?.(holiday.id, { isActive: !holiday.isActive })}
                            className={`p-2 rounded-lg transition-colors ${
                              holiday.isActive
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={holiday.isActive ? '無効にする' : '有効にする'}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onDeleteHoliday?.(holiday.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}