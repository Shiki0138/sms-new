import React, { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useReservations } from '../../hooks/useReservations';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import NewReservationModal from '../../components/reservations/NewReservationModal';

const ReservationsPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
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
  const reservationsByDateTime = useMemo(() => {
    const map: Record<string, any> = {};
    if (reservations) {
      reservations.forEach(reservation => {
        const date = reservation.start_time.split('T')[0];
        const hour = parseInt(reservation.start_time.split('T')[1].split(':')[0]);
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
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} - {format(weekEnd, 'M月d日', { locale: ja })}
          </div>
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
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <th
                      key={day.toISOString()}
                      className={`border-b border-r px-2 py-3 text-sm font-medium ${
                        isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      <div>{format(day, 'M/d', { locale: ja })}</div>
                      <div className="text-xs">
                        {format(day, 'E', { locale: ja })}
                      </div>
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
                    const reservation = reservationsByDateTime[`${dateKey}-${hour}`];
                    const isToday = dateKey === format(new Date(), 'yyyy-MM-dd');

                    return (
                      <td
                        key={`${dateKey}-${hour}`}
                        className={`border-b border-r p-1 h-20 ${
                          isToday ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {reservation ? (
                          <div className="bg-blue-100 text-blue-900 p-2 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors">
                            <div className="font-medium">{reservation.customer?.name}</div>
                            <div className="text-xs">{reservation.menu_content}</div>
                          </div>
                        ) : (
                          <div 
                            className="h-full cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleTimeSlotClick(day, hour)}
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