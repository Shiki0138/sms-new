import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  PlusIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { animations } from '../styles/design-system';
import CalendarGrid, { CalendarReservation } from '../components/reservations/CalendarGrid';
import CalendarViewSelector, { CalendarViewType } from '../components/reservations/CalendarViewSelector';
import { useBusinessHours } from '../hooks/useBusinessHours';
import { useStaff } from '../hooks/useStaff';

// 仮のテナントID（実際は認証システムから取得）
const TENANT_ID = '01HZTEST001';

// モックデータ
const mockReservations: CalendarReservation[] = [
  {
    id: '1',
    customerId: 'cust1',
    customerName: '田中花子',
    staffId: 'staff1',
    staffName: '山田美咲',
    staffColor: '#ef4444',
    startTime: new Date(2024, 11, 15, 10, 0),
    endTime: new Date(2024, 11, 15, 11, 0),
    serviceName: 'カット',
    status: 'confirmed',
    price: 4000,
  },
  {
    id: '2',
    customerId: 'cust2',
    customerName: '佐藤太郎',
    staffId: 'staff2',
    staffName: '佐々木次郎',
    staffColor: '#3b82f6',
    startTime: new Date(2024, 11, 15, 14, 0),
    endTime: new Date(2024, 11, 15, 16, 0),
    serviceName: 'カラー',
    status: 'pending',
    price: 8000,
  },
  {
    id: '3',
    customerId: 'cust3',
    customerName: '鈴木一郎',
    staffId: 'staff1',
    staffName: '山田美咲',
    staffColor: '#ef4444',
    startTime: new Date(2024, 11, 16, 9, 0),
    endTime: new Date(2024, 11, 16, 11, 30),
    serviceName: 'パーマ',
    status: 'confirmed',
    price: 10000,
  },
];

export default function ReservationsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [showSettings, setShowSettings] = useState(false);

  // カスタムフックでデータ管理
  const {
    businessHours,
    holidaySettings,
    getHolidaysInRange,
    loading: businessHoursLoading,
  } = useBusinessHours(TENANT_ID);

  const {
    staff,
    loading: staffLoading,
  } = useStaff(TENANT_ID);

  // 営業時間をカレンダー用の形式に変換
  const businessHoursForCalendar = React.useMemo(() => {
    const result: { [dayOfWeek: number]: any } = {};
    businessHours.forEach(hour => {
      result[hour.dayOfWeek] = {
        isOpen: hour.isOpen,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        breakStartTime: hour.breakStartTime,
        breakEndTime: hour.breakEndTime,
      };
    });
    return result;
  }, [businessHours]);

  // 表示期間の休日を取得
  const [holidays, setHolidays] = useState<Date[]>([]);

  React.useEffect(() => {
    const fetchHolidays = async () => {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(addMonths(currentDate, 1));
      const holidayDates = await getHolidaysInRange(start, end);
      setHolidays(holidayDates);
    };

    fetchHolidays();
  }, [currentDate, getHolidaysInRange]);

  const handleReservationClick = (reservation: CalendarReservation) => {
    console.log('予約クリック:', reservation);
    // 予約詳細モーダルを開く処理
  };

  const handleTimeSlotClick = (date: Date, time?: Date) => {
    console.log('時間スロットクリック:', date, time);
    // 新規予約作成モーダルを開く処理
  };

  const handleCreateReservation = (startTime: Date) => {
    console.log('新規予約作成:', startTime);
    // 新規予約作成処理
  };

  const getHeaderTitle = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'yyyy年M月d日(E)', { locale: ja });
      case 'week':
        return `${format(currentDate, 'yyyy年M月', { locale: ja })} 週表示`;
      case 'month':
        return format(currentDate, 'yyyy年M月', { locale: ja });
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarDaysIcon className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">予約管理</h1>
                <p className="text-gray-600">{getHeaderTitle()}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* 表示切り替え */}
              <CalendarViewSelector
                currentView={viewType}
                onViewChange={setViewType}
              />

              {/* 設定ボタン */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="営業時間・休日設定"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </motion.button>

              {/* 新規予約ボタン */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCreateReservation(new Date())}
                className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>新規予約</span>
              </motion.button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* 設定パネル */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={animations.spring.gentle}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Cog6ToothIcon className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="font-medium text-yellow-800">営業時間・休日設定</h3>
                    <p className="text-sm text-yellow-700">
                      営業時間と休日はカレンダーに自動反映されます
                    </p>
                  </div>
                </div>
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="/settings"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  設定画面を開く
                </motion.a>
              </div>
            </motion.div>
          )}

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今日の予約</p>
                  <p className="text-2xl font-bold text-gray-900">3件</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今月の予約</p>
                  <p className="text-2xl font-bold text-gray-900">32件</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CalendarDaysIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">売上予定</p>
                  <p className="text-2xl font-bold text-gray-900">¥256,000</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <CalendarDaysIcon className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">稼働率</p>
                  <p className="text-2xl font-bold text-gray-900">75%</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* カレンダー */}
          <CalendarGrid
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            viewType={viewType}
            reservations={mockReservations}
            businessHours={businessHoursForCalendar}
            holidays={holidays}
            onReservationClick={handleReservationClick}
            onTimeSlotClick={handleTimeSlotClick}
            onCreateReservation={handleCreateReservation}
          />
        </div>

        {/* フッター情報 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 営業時間サマリー */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800 mb-3">営業時間</h3>
            <div className="space-y-2 text-sm">
              {businessHours.map((hour) => {
                const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                return (
                  <div key={hour.dayOfWeek} className="flex justify-between">
                    <span className={`font-medium ${
                      hour.dayOfWeek === 0 ? 'text-red-600' : 
                      hour.dayOfWeek === 6 ? 'text-blue-600' : 
                      'text-gray-700'
                    }`}>
                      {dayNames[hour.dayOfWeek]}
                    </span>
                    <span className="text-gray-600">
                      {hour.isOpen ? `${hour.openTime} - ${hour.closeTime}` : '定休日'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* スタッフ一覧 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800 mb-3">登録スタッフ</h3>
            <div className="space-y-2">
              {staff.filter(s => s.isActive).map((staffMember) => (
                <div key={staffMember.id} className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: staffMember.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{staffMember.name}</span>
                  {staffMember.position && (
                    <span className="text-xs text-gray-500">({staffMember.position})</span>
                  )}
                </div>
              ))}
              {staff.filter(s => s.isActive).length === 0 && (
                <p className="text-sm text-gray-500">スタッフが登録されていません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}