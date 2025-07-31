import React, { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useBusinessHoursContext } from '../../contexts/BusinessHoursContext';
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  addMinutes,
} from 'date-fns';
import { ja } from 'date-fns/locale';

export type ViewType = 'day' | 'week' | 'month';

// モック予約データ（より詳細）
const mockReservations = [
  {
    id: '1',
    customerName: '山田花子',
    serviceName: 'カット & カラー',
    startTime: new Date(2024, 6, 30, 10, 0),
    endTime: new Date(2024, 6, 30, 12, 0),
    price: 8500,
    status: 'confirmed' as const,
    staffName: '田中美容師',
    staffColor: '#8B5CF6',
  },
  {
    id: '2',
    customerName: '佐藤太郎',
    serviceName: 'メンズカット',
    startTime: new Date(2024, 6, 30, 14, 0),
    endTime: new Date(2024, 6, 30, 15, 0),
    price: 4500,
    status: 'confirmed' as const,
    staffName: '鈴木美容師',
    staffColor: '#10B981',
  },
  {
    id: '3',
    customerName: '鈴木美咲',
    serviceName: 'パーマ & トリートメント',
    startTime: new Date(2024, 6, 31, 9, 0),
    endTime: new Date(2024, 6, 31, 11, 30),
    price: 12000,
    status: 'pending' as const,
    staffName: '田中美容師',
    staffColor: '#8B5CF6',
  },
  {
    id: '4',
    customerName: '田中一郎',
    serviceName: 'カット',
    startTime: new Date(2024, 6, 31, 16, 0),
    endTime: new Date(2024, 6, 31, 17, 0),
    price: 3500,
    status: 'confirmed' as const,
    staffName: '鈴木美容師',
    staffColor: '#10B981',
  },
  {
    id: '5',
    customerName: '高橋みどり',
    serviceName: 'ヘッドスパ',
    startTime: new Date(2024, 7, 1, 13, 30),
    endTime: new Date(2024, 7, 1, 14, 30),
    price: 6000,
    status: 'confirmed' as const,
    staffName: '田中美容師',
    staffColor: '#8B5CF6',
  },
];

// モック営業時間
const mockBusinessHours = {
  0: { isOpen: false, openTime: '09:00', closeTime: '18:00' }, // 日曜日
  1: { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // 月曜日
  2: { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // 火曜日
  3: { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // 水曜日
  4: { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // 木曜日
  5: { isOpen: true, openTime: '09:00', closeTime: '19:00' }, // 金曜日
  6: { isOpen: true, openTime: '09:00', closeTime: '18:00' }, // 土曜日
};

// モック休日（例：2024年8月11日-15日は夏季休業）
const mockHolidays = [
  new Date(2024, 7, 11),
  new Date(2024, 7, 12),
  new Date(2024, 7, 13),
  new Date(2024, 7, 14),
  new Date(2024, 7, 15),
];

const ReservationsPageAdvanced: React.FC = () => {
  // 現在の日付で初期化（本番用に戻す）
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  
  // ビジネス時間・休日コンテキストを使用
  const { 
    getHolidayDates, 
    getBusinessHoursForDay,
    loading: businessHoursLoading,
    holidaySettings,
    error: businessHoursError
  } = useBusinessHoursContext();

  // ビュータイプ選択
  const viewTypes = [
    { type: 'day' as const, label: '日', icon: Calendar },
    { type: 'week' as const, label: '週', icon: Calendar },
    { type: 'month' as const, label: '月', icon: Calendar },
  ];

  // ナビゲーション
  const navigatePrevious = () => {
    switch (viewType) {
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewType) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // 表示する日付の配列
  const displayDates = useMemo(() => {
    switch (viewType) {
      case 'day': {
        return [currentDate];
      }
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      }
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const weeksCount = Math.ceil((monthEnd.getTime() - calendarStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        return Array.from({ length: weeksCount * 7 }, (_, i) => addDays(calendarStart, i));
      }
      default:
        return [currentDate];
    }
  }, [currentDate, viewType]);

  // 30分間隔の時間スロット（8:00-20:00）
  const timeSlots = useMemo(() => {
    if (viewType === 'month') return [];
    
    const slots: Date[] = [];
    const startHour = 8;
    const endHour = 20;
    const interval = 30;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    
    return slots;
  }, [viewType]);

  // 設定から取得した休日データ
  const configuredHolidays = useMemo(() => {
    // デバッグ情報を出力
    console.log('ReservationsPage - Debug info:', {
      loading: businessHoursLoading,
      error: businessHoursError,
      holidaySettings: holidaySettings,
      settingsCount: holidaySettings?.length || 0
    });

    if (businessHoursLoading) {
      console.log('ReservationsPage - Using mock holidays (loading)');
      return mockHolidays; // ローディング中はモックデータ
    }
    
    if (businessHoursError) {
      console.error('ReservationsPage - Error loading business hours:', businessHoursError);
      return mockHolidays;
    }
    
    const holidays = getHolidayDates();
    console.log(`ReservationsPage - Got ${holidays.length} holidays from settings`);
    
    // デバッグ: 最初と最後の休日のみログ出力
    if (holidays.length > 0) {
      console.log('Holiday range:', {
        first: format(holidays[0], 'yyyy-MM-dd'),
        last: format(holidays[holidays.length - 1], 'yyyy-MM-dd'),
        mondays: holidays.filter(h => h.getDay() === 1).length,
        tuesdays: holidays.filter(h => h.getDay() === 2).length
      });
      
      // 現在表示中の月の月曜日・火曜日の休日を確認
      const currentMonthHolidays = holidays.filter(h => 
        h.getMonth() === currentDate.getMonth() && 
        h.getFullYear() === currentDate.getFullYear() && 
        (h.getDay() === 1 || h.getDay() === 2)
      );
      console.log('Current month Mon/Tue holidays:', currentMonthHolidays.map(h => format(h, 'yyyy-MM-dd (E)')));
    }
    
    return holidays.length > 0 ? holidays : mockHolidays; // 休日が設定されていない場合はモックデータを使用
  }, [getHolidayDates, businessHoursLoading, businessHoursError, holidaySettings, currentDate]);

  // 休日チェック
  const isHoliday = (date: Date) => {
    const isHolidayDate = configuredHolidays.some(holiday => {
      // 日付の比較を正確に行うため、時刻部分を除去して比較
      const holidayDateOnly = new Date(holiday.getFullYear(), holiday.getMonth(), holiday.getDate());
      const checkDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return holidayDateOnly.getTime() === checkDateOnly.getTime();
    });
    
    // デバッグ用：月曜日・火曜日のみログ出力
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      const dateString = format(date, 'yyyy-MM-dd');
      console.log(`Holiday check for ${dateString} (${dayOfWeek === 1 ? 'Monday' : 'Tuesday'}): ${isHolidayDate ? '✅ Holiday' : '❌ Not holiday'}`);
    }
    
    return isHolidayDate;
  };

  // 営業時間チェック
  const isBusinessTime = (date: Date, time?: Date) => {
    const dayOfWeek = date.getDay();
    
    // まず休日チェック - 休日なら営業時間外
    if (isHoliday(date)) {
      return false;
    }
    
    // 設定から営業時間を取得、なければモックデータを使用
    const businessHour = businessHoursLoading 
      ? mockBusinessHours[dayOfWeek]
      : getBusinessHoursForDay(dayOfWeek) || mockBusinessHours[dayOfWeek];
    
    if (!businessHour?.isOpen) {
      return false;
    }
    
    if (!time) return true;
    
    const timeStr = format(time, 'HH:mm');
    const isWithinHours = timeStr >= businessHour.openTime && timeStr <= businessHour.closeTime;
    
    return isWithinHours;
  };

  // 指定日時の予約を取得
  const getReservationsForDateTime = (date: Date, time?: Date) => {
    return mockReservations.filter(reservation => {
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
  const renderReservationBlock = (reservation: typeof mockReservations[0], isCompact = false) => {
    const statusColors = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <div
        key={reservation.id}
        className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${statusColors[reservation.status]} ${
          isCompact ? 'text-xs' : 'text-sm'
        }`}
        style={{ borderLeftColor: reservation.staffColor, borderLeftWidth: '4px' }}
        onClick={() => alert(`予約詳細: ${reservation.customerName} - ${reservation.serviceName}`)}
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
      </div>
    );
  };

  // ヘッダータイトル
  const getHeaderTitle = () => {
    switch (viewType) {
      case 'day': {
        return format(currentDate, 'yyyy年M月d日(E)', { locale: ja });
      }
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        return `${format(weekStart, 'M月d日', { locale: ja })} - ${format(weekEnd, 'M月d日', { locale: ja })}`;
      }
      case 'month': {
        return format(currentDate, 'yyyy年M月', { locale: ja });
      }
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
          {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${
                index === 6 ? 'text-red-600' : 'text-gray-700'
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
                <div
                  key={date.toISOString()}
                  className={`min-h-24 p-2 border rounded-lg cursor-pointer transition-all ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${
                    isTodayDate ? 'ring-2 ring-purple-500' : 'hover:bg-purple-50'
                  } ${
                    isHolidayDate || !isBusinessDay ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => alert(`${format(date, 'M月d日')}の予約管理`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isTodayDate
                          ? 'text-purple-600'
                          : isCurrentMonth
                          ? dayIndex === 6
                            ? 'text-red-600'
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
                    {dayReservations.slice(0, 2).map(reservation => 
                      renderReservationBlock(reservation, true)
                    )}
                    {dayReservations.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayReservations.length - 2}件
                      </div>
                    )}
                  </div>
                </div>
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
            const isTodayDate = isToday(date);
            const isHolidayDate = isHoliday(date);
            const isBusinessDay = isBusinessTime(date);

            return (
              <div key={date.toISOString()} className="flex-1 min-w-0">
                {/* 日付ヘッダー */}
                <div
                  className={`h-12 flex items-center justify-center border-b border-gray-200 font-medium relative ${
                    isTodayDate
                      ? 'bg-purple-100 text-purple-700'
                      : isHolidayDate || !isBusinessDay
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs">{format(date, 'E', { locale: ja })}</div>
                    <div className="text-sm">{format(date, 'd')}</div>
                  </div>
                  {/* 休日表示をヘッダーに追加 */}
                  {(isHolidayDate || !isBusinessDay) && (
                    <div className="absolute right-2">
                      <span className="text-xs text-gray-500 bg-gray-200 px-1 rounded">
                        休
                      </span>
                    </div>
                  )}
                </div>

                {/* 時間スロット */}
                <div className="relative">
                  {timeSlots.map(time => {
                    const slotDateTime = new Date(date);
                    slotDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
                    
                    const slotReservations = getReservationsForDateTime(date, time);
                    const isBusinessSlot = isBusinessTime(date, time);
                    const isHolidaySlot = isHoliday(date);

                    return (
                      <div
                        key={time.toISOString()}
                        className={`h-16 border-b border-r border-gray-100 relative ${
                          isBusinessSlot
                            ? 'cursor-pointer hover:bg-purple-50 bg-white'
                            : isHolidaySlot
                            ? 'bg-gray-100 cursor-not-allowed' // 休日は濃いグレー
                            : 'bg-gray-50 cursor-not-allowed' // 営業時間外は薄いグレー
                        }`}
                        onClick={() => {
                          if (isBusinessSlot) {
                            alert(`${format(date, 'M月d日')} ${format(time, 'HH:mm')}の予約作成（デモ版）`);
                          }
                        }}
                      >
                        {/* 予約ブロック */}
                        <div className="absolute inset-1 space-y-1 overflow-hidden">
                          {slotReservations.map(reservation =>
                            renderReservationBlock(reservation, false)
                          )}
                        </div>

                        {/* 新規予約ボタン（空きスロット時） */}
                        {slotReservations.length === 0 && isBusinessSlot && (
                          <div className="absolute inset-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
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
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              {viewType === 'day' && '1日詳細表示'}
              {viewType === 'week' && '1週間表示'}
              {viewType === 'month' && '1ヶ月表示'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            {/* ビュー切り替え */}
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              {viewTypes.map((view) => (
                <button
                  key={view.type}
                  onClick={() => setViewType(view.type)}
                  className={`px-3 py-2 rounded-md font-medium text-sm transition-all ${
                    viewType === view.type
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            
            <Button 
              onClick={() => alert('新規予約作成機能（デモ版）')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              新規予約
            </Button>
          </div>
        </div>
      </div>

      {/* カレンダー */}
      <Card>
        <div className="overflow-hidden">
          {/* カレンダーヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <button
                  onClick={navigatePrevious}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <button
                  onClick={navigateToday}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  今日
                </button>
                
                <button
                  onClick={navigateNext}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <h2 className="text-lg font-bold text-gray-800">{getHeaderTitle()}</h2>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
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
              {!businessHoursLoading && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>設定から読み込み済み（{configuredHolidays.length}件の休日）</span>
                </div>
              )}
            </div>
          </div>

          {/* カレンダー本体 */}
          <div className="p-4">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {viewType === 'month' ? renderMonthView() : renderTimeBasedView()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 今日の予約サマリー */}
      <Card className="mt-6">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            今日の予約
          </h3>
          <div className="space-y-3">
            {mockReservations
              .filter(reservation => isSameDay(reservation.startTime, new Date()))
              .map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                         style={{ backgroundColor: reservation.staffColor }}>
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{reservation.customerName}</div>
                      <div className="text-sm text-gray-600">{reservation.serviceName}</div>
                      <div className="text-xs text-gray-500">{reservation.staffName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {format(reservation.startTime, 'HH:mm')} - 
                      {format(reservation.endTime, 'HH:mm')}
                    </div>
                    <div className="text-sm font-medium text-purple-600">
                      ¥{reservation.price.toLocaleString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reservation.status === 'confirmed' ? '確定' :
                       reservation.status === 'pending' ? '仮予約' : 'キャンセル'}
                    </div>
                  </div>
                </div>
              ))}
            {mockReservations.filter(reservation => isSameDay(reservation.startTime, new Date())).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                今日の予約はありません
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{mockReservations.length}</div>
            <div className="text-sm text-gray-600">総予約数</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              ¥{mockReservations.reduce((sum, r) => sum + r.price, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">売上予定</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(mockReservations.reduce((sum, r) => sum + r.price, 0) / mockReservations.length)}
            </div>
            <div className="text-sm text-gray-600">平均単価</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">87%</div>
            <div className="text-sm text-gray-600">稼働率</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReservationsPageAdvanced;