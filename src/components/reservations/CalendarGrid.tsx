import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths, isSameDay, isSameMonth, isToday, startOfDay, addMinutes, isBefore, isAfter } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarViewType } from './CalendarViewSelector';
import { animations } from '../../styles/design-system';

export interface CalendarReservation {
  id: string;
  customerId: string;
  customerName: string;
  staffId?: string;
  staffName?: string;
  staffColor?: string;
  startTime: Date;
  endTime: Date;
  serviceName: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  price?: number;
}

export interface TimeSlot {
  time: Date;
  reservations: CalendarReservation[];
  isBusinessHour: boolean;
  isHoliday: boolean;
}

interface CalendarGridProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  reservations: CalendarReservation[];
  businessHours: {
    [dayOfWeek: number]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
      breakStartTime?: string;
      breakEndTime?: string;
    };
  };
  holidays: Date[];
  onReservationClick?: (reservation: CalendarReservation) => void;
  onTimeSlotClick?: (date: Date, time?: Date) => void;
  onCreateReservation?: (startTime: Date) => void;
  className?: string;
}

export default function CalendarGrid({
  currentDate,
  onDateChange,
  viewType,
  reservations,
  businessHours,
  holidays,
  onReservationClick,
  onTimeSlotClick,
  onCreateReservation,
  className = '',
}: CalendarGridProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);

  // ナビゲーション関数
  const navigatePrevious = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(currentDate, -1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, -1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewType) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
    }
  };

  const navigateToday = () => {
    onDateChange(new Date());
  };

  // 表示する日付の配列を生成
  const displayDates = useMemo(() => {
    switch (viewType) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ja });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { locale: ja });
        const calendarEnd = startOfWeek(monthEnd, { locale: ja });
        const weeksCount = Math.ceil((calendarEnd.getTime() - calendarStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        
        return Array.from({ length: weeksCount * 7 }, (_, i) => addDays(calendarStart, i));
      default:
        return [currentDate];
    }
  }, [currentDate, viewType]);

  // 時間スロットを生成（日表示・週表示用）
  const timeSlots = useMemo(() => {
    if (viewType === 'month') return [];
    
    const slots: Date[] = [];
    const startHour = 8; // 8:00から
    const endHour = 20; // 20:00まで
    const interval = 30; // 30分間隔
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    
    return slots;
  }, [viewType]);

  // 営業時間チェック
  const isBusinessTime = (date: Date, time?: Date) => {
    const dayOfWeek = date.getDay();
    const businessHour = businessHours[dayOfWeek];
    
    if (!businessHour?.isOpen) return false;
    if (!time) return true;
    
    const timeStr = format(time, 'HH:mm');
    const isInBusinessHours = timeStr >= businessHour.openTime && timeStr <= businessHour.closeTime;
    
    // 休憩時間チェック
    if (businessHour.breakStartTime && businessHour.breakEndTime) {
      const isInBreakTime = timeStr >= businessHour.breakStartTime && timeStr <= businessHour.breakEndTime;
      return isInBusinessHours && !isInBreakTime;
    }
    
    return isInBusinessHours;
  };

  // 休日チェック
  const isHoliday = (date: Date) => {
    return holidays.some(holiday => isSameDay(holiday, date));
  };

  // 指定日時の予約を取得
  const getReservationsForDateTime = (date: Date, time?: Date): CalendarReservation[] => {
    return reservations.filter(reservation => {
      if (!isSameDay(reservation.startTime, date)) return false;
      
      if (time) {
        const slotStart = new Date(date);
        slotStart.setHours(time.getHours(), time.getMinutes(), 0, 0);
        const slotEnd = addMinutes(slotStart, 30);
        
        return (
          (reservation.startTime >= slotStart && reservation.startTime < slotEnd) ||
          (reservation.endTime > slotStart && reservation.endTime <= slotEnd) ||
          (reservation.startTime <= slotStart && reservation.endTime >= slotEnd)
        );
      }
      
      return true;
    });
  };

  // 予約ブロックの描画
  const renderReservationBlock = (reservation: CalendarReservation, isCompact = false) => {
    const statusColors = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };

    const staffColor = reservation.staffColor || '#6366f1';

    return (
      <motion.div
        key={reservation.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => onReservationClick?.(reservation)}
        className={`p-2 rounded-lg border cursor-pointer transition-all ${statusColors[reservation.status]} ${
          isCompact ? 'text-xs' : 'text-sm'
        }`}
        style={{ borderLeftColor: staffColor, borderLeftWidth: '4px' }}
      >
        <div className="font-medium truncate">{reservation.customerName}</div>
        {!isCompact && (
          <>
            <div className="text-xs opacity-75 truncate">{reservation.serviceName}</div>
            <div className="text-xs opacity-75">
              {format(reservation.startTime, 'HH:mm')}-{format(reservation.endTime, 'HH:mm')}
            </div>
            {reservation.staffName && (
              <div className="text-xs opacity-75 truncate">👤 {reservation.staffName}</div>
            )}
          </>
        )}
      </motion.div>
    );
  };

  // ヘッダータイトル
  const getHeaderTitle = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'yyyy年M月d日(E)', { locale: ja });
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ja });
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'M月d日', { locale: ja })} - ${format(weekEnd, 'M月d日', { locale: ja })}`;
      case 'month':
        return format(currentDate, 'yyyy年M月', { locale: ja });
      default:
        return '';
    }
  };

  // 月表示のレンダリング
  const renderMonthView = () => {
    const weeks: Date[][] = [];
    for (let i = 0; i < displayDates.length; i += 7) {
      weeks.push(displayDates.slice(i, i + 7));
    }

    return (
      <div className="space-y-1">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${
                index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダー本体 */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => {
              const dayReservations = getReservationsForDateTime(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isTodayDate = isToday(date);
              const isHolidayDate = isHoliday(date);
              const isBusinessDay = isBusinessTime(date);

              return (
                <motion.div
                  key={date.toISOString()}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onTimeSlotClick?.(date)}
                  className={`min-h-32 p-2 border rounded-lg cursor-pointer transition-all ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${
                    isTodayDate ? 'ring-2 ring-primary-500' : 'hover:bg-primary-50'
                  } ${
                    isHolidayDate || !isBusinessDay ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isTodayDate
                          ? 'text-primary-600'
                          : isCurrentMonth
                          ? dayIndex === 0
                            ? 'text-red-600'
                            : dayIndex === 6
                            ? 'text-blue-600'
                            : 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {format(date, 'd')}
                    </span>
                    
                    {(isHolidayDate || !isBusinessDay) && (
                      <span className="text-xs text-gray-500 bg-gray-200 px-1 rounded">
                        休
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayReservations.slice(0, 3).map(reservation => 
                      renderReservationBlock(reservation, true)
                    )}
                    {dayReservations.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayReservations.length - 3}件
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // 日表示・週表示のレンダリング
  const renderTimeBasedView = () => {
    return (
      <div className="flex">
        {/* 時間軸 */}
        <div className="w-20 flex-shrink-0">
          <div className="h-12"></div> {/* ヘッダー分のスペース */}
          {timeSlots.map(time => (
            <div
              key={time.toISOString()}
              className="h-16 flex items-start justify-end pr-2 text-xs text-gray-500 border-b border-gray-100"
            >
              {format(time, 'HH:mm')}
            </div>
          ))}
        </div>

        {/* 日付列 */}
        <div className="flex-1 flex">
          {displayDates.map(date => {
            const isCurrentMonth = viewType === 'month' ? isSameMonth(date, currentDate) : true;
            const isTodayDate = isToday(date);
            const isHolidayDate = isHoliday(date);
            const isBusinessDay = isBusinessTime(date);

            return (
              <div key={date.toISOString()} className="flex-1 min-w-0">
                {/* 日付ヘッダー */}
                <div
                  className={`h-12 flex items-center justify-center border-b border-gray-200 font-medium ${
                    isTodayDate
                      ? 'bg-primary-100 text-primary-700'
                      : isHolidayDate || !isBusinessDay
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs">{format(date, 'E', { locale: ja })}</div>
                    <div className="text-sm">{format(date, 'd')}</div>
                  </div>
                </div>

                {/* 時間スロット */}
                <div className="relative">
                  {timeSlots.map(time => {
                    const slotDateTime = new Date(date);
                    slotDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    
                    const slotReservations = getReservationsForDateTime(date, time);
                    const isBusinessSlot = isBusinessTime(date, time);
                    const isHolidaySlot = isHolidayDate;

                    return (
                      <motion.div
                        key={time.toISOString()}
                        whileHover={isBusinessSlot && !isHolidaySlot ? { backgroundColor: '#f0f4ff' } : {}}
                        onClick={() => {
                          if (isBusinessSlot && !isHolidaySlot) {
                            onTimeSlotClick?.(date, time);
                            setSelectedTimeSlot(slotDateTime);
                          }
                        }}
                        className={`h-16 border-b border-r border-gray-100 relative ${
                          isBusinessSlot && !isHolidaySlot
                            ? 'cursor-pointer hover:bg-primary-50'
                            : 'bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        {/* 予約ブロック */}
                        <div className="absolute inset-1 space-y-1 overflow-hidden">
                          {slotReservations.map(reservation =>
                            renderReservationBlock(reservation, false)
                          )}
                        </div>

                        {/* 新規予約ボタン（空きスロット時） */}
                        {slotReservations.length === 0 && isBusinessSlot && !isHolidaySlot && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateReservation?.(slotDateTime);
                            }}
                            className="absolute inset-1 flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={navigatePrevious}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={navigateToday}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              今日
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={navigateNext}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </motion.button>
          </div>

          <h2 className="text-lg font-bold text-gray-800">{getHeaderTitle()}</h2>
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>確定</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>仮予約</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
            <span>休業日</span>
          </div>
        </div>
      </div>

      {/* カレンダー本体 */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewType}-${currentDate.toISOString()}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={animations.spring.gentle}
          >
            {viewType === 'month' ? renderMonthView() : renderTimeBasedView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}