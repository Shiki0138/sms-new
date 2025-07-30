import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

// モック予約データ
const mockReservations = [
  {
    id: '1',
    customer_name: '山田花子',
    menu_content: 'カット & カラー',
    start_time: new Date(2024, 6, 30, 10, 0).toISOString(),
    end_time: new Date(2024, 6, 30, 12, 0).toISOString(),
    price: 8500,
    status: 'confirmed',
  },
  {
    id: '2',
    customer_name: '佐藤太郎',
    menu_content: 'メンズカット',
    start_time: new Date(2024, 6, 30, 14, 0).toISOString(),
    end_time: new Date(2024, 6, 30, 15, 0).toISOString(),
    price: 4500,
    status: 'confirmed',
  },
  {
    id: '3',
    customer_name: '鈴木美咲',
    menu_content: 'パーマ & トリートメント',
    start_time: new Date(2024, 6, 31, 9, 0).toISOString(),
    end_time: new Date(2024, 6, 31, 11, 30).toISOString(),
    price: 12000,
    status: 'confirmed',
  },
  {
    id: '4',
    customer_name: '田中一郎',
    menu_content: 'カット',
    start_time: new Date(2024, 6, 31, 16, 0).toISOString(),
    end_time: new Date(2024, 6, 31, 17, 0).toISOString(),
    price: 3500,
    status: 'confirmed',
  },
];

const ReservationsPageDemo: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 月曜始まり
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // 時間帯（9:00～20:00）
  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 9);

  // 週の日付を生成
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 予約を日付と時間でグループ化
  const getReservationsForDateTime = (date: Date, hour: number) => {
    return mockReservations.filter(reservation => {
      const reservationDate = new Date(reservation.start_time);
      return isSameDay(reservationDate, date) && reservationDate.getHours() === hour;
    });
  };

  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">予約管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              週間カレンダー表示
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button
              variant="outline"
              onClick={goToToday}
            >
              今日
            </Button>
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

      {/* 週間ナビゲーション */}
      <Card className="mb-6" padding="sm">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(weekStart, 'M月d日', { locale: ja })} - {format(weekEnd, 'M月d日', { locale: ja })}
          </h2>
          <Button variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* カレンダーグリッド */}
      <Card>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* ヘッダー行 */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-3 text-sm font-medium text-gray-500">時間</div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="p-3 text-center border-l border-gray-200">
                  <div className="text-sm font-medium text-gray-900">
                    {format(day, 'EEE', { locale: ja })}
                  </div>
                  <div className="text-lg font-bold text-gray-700 mt-1">
                    {format(day, 'd')}
                  </div>
                  {isSameDay(day, new Date()) && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mx-auto mt-1"></div>
                  )}
                </div>
              ))}
            </div>

            {/* 時間行 */}
            {timeSlots.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[80px]">
                <div className="p-3 text-sm text-gray-500 border-r border-gray-200">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const reservations = getReservationsForDateTime(day, hour);
                  return (
                    <div key={`${day.toISOString()}-${hour}`} className="p-1 border-l border-gray-100">
                      {reservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="bg-gradient-to-r from-purple-400 to-blue-400 text-white text-xs p-2 rounded-md mb-1 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => alert(`予約詳細: ${reservation.customer_name} - ${reservation.menu_content}`)}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3" />
                            <span className="font-medium truncate">{reservation.customer_name}</span>
                          </div>
                          <div className="truncate">{reservation.menu_content}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-90">
                              {format(new Date(reservation.start_time), 'HH:mm')} - 
                              {format(new Date(reservation.end_time), 'HH:mm')}
                            </span>
                            <span className="text-xs font-medium">¥{reservation.price.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                      {reservations.length === 0 && (
                        <div 
                          className="h-full min-h-[60px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => alert(`${format(day, 'M月d日')} ${hour}:00の予約作成（デモ版）`)}
                        >
                          <Plus className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
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
              .filter(reservation => isSameDay(new Date(reservation.start_time), new Date()))
              .map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{reservation.customer_name}</div>
                      <div className="text-sm text-gray-600">{reservation.menu_content}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {format(new Date(reservation.start_time), 'HH:mm')} - 
                      {format(new Date(reservation.end_time), 'HH:mm')}
                    </div>
                    <div className="text-sm font-medium text-purple-600">
                      ¥{reservation.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            {mockReservations.filter(reservation => isSameDay(new Date(reservation.start_time), new Date())).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                今日の予約はありません
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 統計情報 */}
      <Card className="mt-6">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">今週の統計</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{mockReservations.length}</div>
              <div className="text-sm text-gray-600">総予約数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ¥{mockReservations.reduce((sum, r) => sum + r.price, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">売上予定</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(mockReservations.reduce((sum, r) => sum + r.price, 0) / mockReservations.length)}
              </div>
              <div className="text-sm text-gray-600">平均単価</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">85%</div>
              <div className="text-sm text-gray-600">稼働率</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReservationsPageDemo;