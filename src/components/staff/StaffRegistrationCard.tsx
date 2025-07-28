import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlusIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';

export interface Staff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface StaffRegistrationCardProps {
  staff: Staff[];
  onAddStaff?: (staff: Omit<Staff, 'id' | 'createdAt'>) => void;
  onUpdateStaff?: (id: string, staff: Partial<Staff>) => void;
  onDeleteStaff?: (id: string) => void;
  maxStaff?: number; // Light plan制限
  className?: string;
}

const defaultColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151',
];

export default function StaffRegistrationCard({
  staff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  maxStaff = 3, // Light plan: 3名まで
  className = '',
}: StaffRegistrationCardProps) {
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    color: defaultColors[0],
    isActive: true,
  });

  const handleAddStaff = () => {
    if (!newStaffData.name.trim()) return;
    
    onAddStaff?.(newStaffData);
    
    // リセット
    setNewStaffData({
      name: '',
      email: '',
      phone: '',
      position: '',
      color: defaultColors[0],
      isActive: true,
    });
    setIsAddingStaff(false);
  };

  const handleUpdateStaff = (staffId: string, updates: Partial<Staff>) => {
    onUpdateStaff?.(staffId, updates);
    setEditingStaff(null);
  };

  const handleDeleteStaff = (staffId: string) => {
    if (window.confirm('このスタッフを削除しますか？')) {
      onDeleteStaff?.(staffId);
    }
  };

  const isAtMaxCapacity = staff.length >= maxStaff;

  const ColorPicker = ({ 
    value, 
    onChange, 
    disabled = false 
  }: { 
    value: string; 
    onChange: (color: string) => void; 
    disabled?: boolean;
  }) => (
    <div className="flex flex-wrap gap-2">
      {defaultColors.map((color) => (
        <motion.button
          key={color}
          whileHover={!disabled ? { scale: 1.1 } : {}}
          whileTap={!disabled ? { scale: 0.9 } : {}}
          onClick={() => !disabled && onChange(color)}
          disabled={disabled}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            value === color 
              ? 'border-gray-800 ring-2 ring-gray-300' 
              : 'border-gray-300 hover:border-gray-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ backgroundColor: color }}
        >
          {value === color && (
            <CheckIcon className="h-4 w-4 text-white mx-auto" />
          )}
        </motion.button>
      ))}
    </div>
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <UserIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">スタッフ管理</h3>
              <p className="text-sm text-gray-600">
                登録スタッフ: {staff.filter(s => s.isActive).length}/{maxStaff}名
              </p>
            </div>
          </div>

          {!isAtMaxCapacity && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAddingStaff(true)}
              className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              <UserPlusIcon className="h-4 w-4" />
              <span>スタッフ追加</span>
            </motion.button>
          )}
        </div>

        {isAtMaxCapacity && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                ライトプランでは最大{maxStaff}名までスタッフを登録できます
              </span>
            </div>
          </div>
        )}
      </div>

      {/* スタッフ追加フォーム */}
      <AnimatePresence>
        {isAddingStaff && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={animations.spring.gentle}
            className="overflow-hidden border-b border-gray-200"
          >
            <div className="p-6 bg-gray-50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名前 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStaffData.name}
                    onChange={(e) => setNewStaffData({ ...newStaffData, name: e.target.value })}
                    placeholder="スタッフ名を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    役職
                  </label>
                  <input
                    type="text"
                    value={newStaffData.position}
                    onChange={(e) => setNewStaffData({ ...newStaffData, position: e.target.value })}
                    placeholder="役職・役割を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={newStaffData.email}
                    onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                    placeholder="メールアドレスを入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={newStaffData.phone}
                    onChange={(e) => setNewStaffData({ ...newStaffData, phone: e.target.value })}
                    placeholder="電話番号を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カレンダー表示色
                </label>
                <ColorPicker 
                  value={newStaffData.color} 
                  onChange={(color) => setNewStaffData({ ...newStaffData, color })} 
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsAddingStaff(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  キャンセル
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddStaff}
                  disabled={!newStaffData.name.trim()}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                >
                  追加
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* スタッフ一覧 */}
      <div className="p-6">
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">まだスタッフが登録されていません</p>
            <p className="text-sm text-gray-400">「スタッフ追加」ボタンから登録してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {staff.map((staffMember, index) => {
              const isEditing = editingStaff === staffMember.id;

              return (
                <motion.div
                  key={staffMember.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: staffMember.color }}
                        >
                          {staffMember.name.charAt(0)}
                        </div>

                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={staffMember.name}
                                  onChange={(e) => handleUpdateStaff(staffMember.id, { name: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <input
                                  type="text"
                                  value={staffMember.position || ''}
                                  onChange={(e) => handleUpdateStaff(staffMember.id, { position: e.target.value })}
                                  placeholder="役職"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <input
                                  type="email"
                                  value={staffMember.email || ''}
                                  onChange={(e) => handleUpdateStaff(staffMember.id, { email: e.target.value })}
                                  placeholder="メールアドレス"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <input
                                  type="tel"
                                  value={staffMember.phone || ''}
                                  onChange={(e) => handleUpdateStaff(staffMember.id, { phone: e.target.value })}
                                  placeholder="電話番号"
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  カレンダー表示色
                                </label>
                                <ColorPicker 
                                  value={staffMember.color} 
                                  onChange={(color) => handleUpdateStaff(staffMember.id, { color })} 
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-gray-800">{staffMember.name}</h4>
                                {!staffMember.isActive && (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                    無効
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1 mt-1">
                                {staffMember.position && (
                                  <p>👤 {staffMember.position}</p>
                                )}
                                {staffMember.email && (
                                  <p>📧 {staffMember.email}</p>
                                )}
                                {staffMember.phone && (
                                  <p>📞 {staffMember.phone}</p>
                                )}
                                <div className="flex items-center space-x-2">
                                  <span>🎨 カレンダー色:</span>
                                  <div 
                                    className="w-4 h-4 rounded-full border border-gray-300"
                                    style={{ backgroundColor: staffMember.color }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setEditingStaff(null)}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setEditingStaff(null)}
                              className="p-2 text-green-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </motion.button>
                          </>
                        ) : (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleUpdateStaff(staffMember.id, { isActive: !staffMember.isActive })}
                              className={`p-2 rounded-lg transition-colors ${
                                staffMember.isActive
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                              title={staffMember.isActive ? '無効にする' : '有効にする'}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setEditingStaff(staffMember.id)}
                              className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteStaff(staffMember.id)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}