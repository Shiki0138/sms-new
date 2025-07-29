import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useReservations } from '../../hooks/useReservations';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import NewReservationModal from '../../components/reservations/NewReservationModal';
import { useBusinessHours } from '../../hooks/useBusinessHours';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

const ReservationsPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();

  // 認証とテナント情報
  const { tenant: authTenant } = useAuth();
  const { data: tenant } = useTenant();
  const effectiveTenantId = tenant?.id || authTenant?.id || '';

  // 営業時間と休日設定を取得
  const { businessHours, holidaySettings, isHoliday } =
    useBusinessHours(effectiveTenantId);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 月曜始まり
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: reservations } = useReservations(
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  );

  // 時間帯（9:00～20:00）
  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 9);

  // 週の日付を生成
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 予約を日付と時間でグループ化
  interface ReservationMap {
    [key: string]: typeof reservations extends Array<infer T> ? T : never;
  }

  const reservationsByDateTime = React.useMemo(() => {
    const map: ReservationMap = {};
    if (reservations) {
      reservations.forEach((reservation) => {
        const date = reservation.start_time.split('T')[0];
        const hour = parseInt(
          reservation.start_time.split('T')[1].split(':')[0]
        );
        const key = `${date}-${hour}`;
        map[key] = reservation;
      });
    }
    return map;
  }, [reservations]);

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setShowNewReservation(true);
  };

  // 休日かどうかをチェック（非同期）
  const [holidayStatus, setHolidayStatus] = useState<Record<string, boolean>>(
    {}
  );

  React.useEffect(() => {
    const checkHolidays = async () => {
      const status: Record<string, boolean> = {};
      for (const day of weekDays) {
        const dateKey = format(day, 'yyyy-MM-dd');
        status[dateKey] = await isHoliday(day);
      }
      setHolidayStatus(status);
    };

    if (effectiveTenantId && isHoliday) {
      checkHolidays();
    }
  }, [weekDays, isHoliday, effectiveTenantId]);

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              今月の予約数: {reservations?.length || 0} / 50件
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={() => setShowNewReservation(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新規予約
            </Button>
          </div>
        </div>
      </div>

      {/* カレンダーナビゲーション */}
      <Card className="mb-6" padding="sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              今日
            </Button>
          </div>
          <div className="text-lg font-medium">
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} -{' '}
            {format(weekEnd, 'M月d日', { locale: ja })}
          </div>
        </div>
      </Card>

      {/* 休日設定の表示（デバッグ用） */}
      <Card className="mb-4 p-4">
        <div className="text-sm text-gray-600">
          <p>テナントID: {effectiveTenantId}</p>
          <p>休日設定数: {holidaySettings.length}</p>
          <p>営業時間設定: {businessHours.length}日分</p>
        </div>
      </Card>

      {/* 週間カレンダー */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-r px-2 py-3 text-xs font-medium text-gray-500 w-16">
                  時間
                </th>
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isToday = dateKey === format(new Date(), 'yyyy-MM-dd');
                  const isHolidayDate = holidayStatus[dateKey] || false;
                  const dayOfWeek = day.getDay();
                  const businessHour = businessHours.find(
                    (bh) => bh.dayOfWeek === dayOfWeek
                  );
                  const isOpen = businessHour?.isOpen || false;

                  return (
                    <th
                      key={day.toISOString()}
                      className={`border-b border-r px-2 py-3 text-sm font-medium ${
                        isToday
                          ? 'bg-blue-50 text-blue-700'
                          : isHolidayDate || !isOpen
                            ? 'bg-gray-100 text-gray-500'
                            : 'text-gray-900'
                      }`}
                    >
                      <div>{format(day, 'M/d', { locale: ja })}</div>
                      <div className="text-xs">
                        {format(day, 'E', { locale: ja })}
                      </div>
                      {(isHolidayDate || !isOpen) && (
                        <div className="text-xs text-red-500 mt-1">休</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((hour) => (
                <tr key={hour}>
                  <td className="border-b border-r px-2 py-1 text-xs text-gray-500 font-medium">
                    {hour}:00
                  </td>
                  {weekDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const reservation =
                      reservationsByDateTime[`${dateKey}-${hour}`];
                    const isToday =
                      dateKey === format(new Date(), 'yyyy-MM-dd');
                    const isHolidayDate = holidayStatus[dateKey] || false;
                    const dayOfWeek = day.getDay();
                    const businessHour = businessHours.find(
                      (bh) => bh.dayOfWeek === dayOfWeek
                    );
                    const isOpen = businessHour?.isOpen || false;

                    return (
                      <td
                        key={`${dateKey}-${hour}`}
                        className={`border-b border-r p-1 h-20 ${
                          isToday
                            ? 'bg-blue-50/30'
                            : isHolidayDate || !isOpen
                              ? 'bg-gray-50'
                              : ''
                        }`}
                      >
                        {reservation ? (
                          <div className="bg-blue-100 text-blue-900 p-2 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors">
                            <div className="font-medium">
                              {reservation.customer?.name}
                            </div>
                            <div className="text-xs">
                              {reservation.menu_content}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`h-full ${
                              isHolidayDate || !isOpen
                                ? 'cursor-not-allowed'
                                : 'cursor-pointer hover:bg-gray-50 transition-colors'
                            }`}
                            onClick={() => {
                              if (!isHolidayDate && isOpen) {
                                handleTimeSlotClick(day, hour);
                              }
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 新規予約モーダル */}
      <NewReservationModal
        isOpen={showNewReservation}
        onClose={() => setShowNewReservation(false)}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
      />
    </div>
  );
};

export default ReservationsPage;
