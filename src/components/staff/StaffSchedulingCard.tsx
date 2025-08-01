import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';
import { StaffSchedulingService, StaffSchedule, CreateScheduleData } from '../../services/staff-scheduling-service';
import { Staff } from '../../services/staff-service';
import { toast } from 'react-hot-toast';

interface StaffSchedulingCardProps {
  tenantId: string;
  staff: Staff[];
  className?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: '日曜日', short: '日' },
  { value: 1, label: '月曜日', short: '月' },
  { value: 2, label: '火曜日', short: '火' },
  { value: 3, label: '水曜日', short: '水' },
  { value: 4, label: '木曜日', short: '木' },
  { value: 5, label: '金曜日', short: '金' },
  { value: 6, label: '土曜日', short: '土' },
];

export default function StaffSchedulingCard({
  tenantId,
  staff,
  className = '',
}: StaffSchedulingCardProps) {
  const [schedules, setSchedules] = useState<Record<string, StaffSchedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<CreateScheduleData>({
    staffId: '',
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '18:00',
    breakStartTime: '',
    breakEndTime: '',
    isActive: true,
  });

  const schedulingService = new StaffSchedulingService(tenantId);

  useEffect(() => {
    loadSchedules();
  }, [staff]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const allSchedules: Record<string, StaffSchedule[]> = {};
      
      for (const staffMember of staff) {
        const staffSchedules = await schedulingService.getStaffSchedules(staffMember.id);
        allSchedules[staffMember.id] = staffSchedules;
      }
      
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('スケジュールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (staffId: string, dayOfWeek: number) => {
    setSelectedStaff(staffId);
    setEditingDay(dayOfWeek);
    
    const existingSchedule = schedules[staffId]?.find(s => s.dayOfWeek === dayOfWeek);
    
    if (existingSchedule) {
      setScheduleForm({
        staffId: staffId,
        dayOfWeek: dayOfWeek,
        startTime: existingSchedule.startTime,
        endTime: existingSchedule.endTime,
        breakStartTime: existingSchedule.breakStartTime || '',
        breakEndTime: existingSchedule.breakEndTime || '',
        isActive: existingSchedule.isActive,
      });
    } else {
      setScheduleForm({
        staffId: staffId,
        dayOfWeek: dayOfWeek,
        startTime: '09:00',
        endTime: '18:00',
        breakStartTime: '',
        breakEndTime: '',
        isActive: true,
      });
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.staffId) return;

    try {
      const result = await schedulingService.upsertStaffSchedule(scheduleForm);
      
      if (result.success) {
        toast.success('スケジュールを保存しました');
        await loadSchedules();
        setEditingDay(null);
        setSelectedStaff(null);
      } else {
        toast.error(result.error || 'スケジュールの保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('スケジュールの保存に失敗しました');
    }
  };

  const handleToggleDay = async (staffId: string, dayOfWeek: number, currentActive: boolean) => {
    try {
      const result = await schedulingService.upsertStaffSchedule({
        staffId: staffId,
        dayOfWeek: dayOfWeek,
        startTime: '09:00',
        endTime: '18:00',
        isActive: !currentActive,
      });
      
      if (result.success) {
        await loadSchedules();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const getScheduleForDay = (staffId: string, dayOfWeek: number): StaffSchedule | undefined => {
    return schedules[staffId]?.find(s => s.dayOfWeek === dayOfWeek);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">スタッフ勤務スケジュール</h3>
            <p className="text-sm text-gray-600">
              各スタッフの週間勤務時間を設定します
            </p>
          </div>
        </div>
      </div>

      {/* スケジュール一覧 */}
      <div className="p-6">
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">スタッフが登録されていません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {staff.filter(s => s.isActive).map((staffMember) => (
              <div key={staffMember.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* スタッフヘッダー */}
                <div className="bg-gray-50 px-4 py-3 flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: staffMember.color }}
                  >
                    {staffMember.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{staffMember.name}</h4>
                    {staffMember.position && (
                      <p className="text-xs text-gray-600">{staffMember.position}</p>
                    )}
                  </div>
                </div>

                {/* 週間スケジュール */}
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const schedule = getScheduleForDay(staffMember.id, day.value);
                      const isActive = schedule?.isActive ?? false;
                      const isEditing = selectedStaff === staffMember.id && editingDay === day.value;

                      return (
                        <div key={day.value} className="text-center">
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            {day.short}
                          </div>
                          
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditSchedule(staffMember.id, day.value)}
                            className={`relative cursor-pointer p-3 rounded-lg border-2 transition-all ${
                              isActive
                                ? 'border-primary-300 bg-primary-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            {isActive && schedule ? (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-primary-700">
                                  {schedule.startTime.slice(0, 5)}
                                </div>
                                <div className="text-xs text-primary-600">
                                  ｜
                                </div>
                                <div className="text-xs font-medium text-primary-700">
                                  {schedule.endTime.slice(0, 5)}
                                </div>
                                {schedule.breakStartTime && schedule.breakEndTime && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    休憩
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 py-4">
                                休み
                              </div>
                            )}
                            
                            <div className="absolute top-1 right-1">
                              <PencilIcon className="h-3 w-3 text-gray-400" />
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編集モーダル */}
      <AnimatePresence>
        {editingDay !== null && selectedStaff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setEditingDay(null);
              setSelectedStaff(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={animations.spring.gentle}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {staff.find(s => s.id === selectedStaff)?.name} - {DAYS_OF_WEEK.find(d => d.value === editingDay)?.label}
                </h3>

                <div className="space-y-4">
                  {/* 勤務状態 */}
                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleForm.isActive}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">この曜日は勤務する</span>
                    </label>
                  </div>

                  {scheduleForm.isActive && (
                    <>
                      {/* 勤務時間 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            開始時間
                          </label>
                          <input
                            type="time"
                            value={scheduleForm.startTime}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            終了時間
                          </label>
                          <input
                            type="time"
                            value={scheduleForm.endTime}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* 休憩時間 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          休憩時間（任意）
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <input
                              type="time"
                              value={scheduleForm.breakStartTime}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, breakStartTime: e.target.value })}
                              placeholder="開始"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <input
                              type="time"
                              value={scheduleForm.breakEndTime}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, breakEndTime: e.target.value })}
                              placeholder="終了"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setEditingDay(null);
                      setSelectedStaff(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveSchedule}
                    className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    保存
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}