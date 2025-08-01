import React, { useState } from 'react';
import { X, Save, Plus, Users, Star, Clock, Percent } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { TreatmentMenu } from '../../types/treatment';
import { useStaff } from '../../hooks/useStaff';

interface MenuStaffAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  menu: TreatmentMenu;
}

interface StaffAssignment {
  staffId: string;
  staffName: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  canPerform: boolean;
  customDuration?: number;
  commissionRate?: number;
  notes?: string;
}

const MenuStaffAssignment: React.FC<MenuStaffAssignmentProps> = ({ isOpen, onClose, menu }) => {
  const { data: staffList } = useStaff();
  const [assignments, setAssignments] = useState<StaffAssignment[]>([
    {
      staffId: '1',
      staffName: '山田太郎',
      skillLevel: 'expert',
      canPerform: true,
      commissionRate: 35,
    },
    {
      staffId: '2',
      staffName: '佐藤花子',
      skillLevel: 'advanced',
      canPerform: true,
      commissionRate: 30,
    },
    {
      staffId: '3',
      staffName: '鈴木一郎',
      skillLevel: 'intermediate',
      canPerform: true,
      customDuration: menu.duration_minutes + 15,
      commissionRate: 25,
    },
  ]);

  const skillLevels = {
    beginner: { label: '初級', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    intermediate: { label: '中級', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    advanced: { label: '上級', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    expert: { label: 'エキスパート', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  };

  const updateAssignment = (staffId: string, updates: Partial<StaffAssignment>) => {
    setAssignments(assignments.map(assignment =>
      assignment.staffId === staffId ? { ...assignment, ...updates } : assignment
    ));
  };

  const addStaffAssignment = (staffId: string, staffName: string) => {
    const existing = assignments.find(a => a.staffId === staffId);
    if (existing) {
      toast.error('このスタッフは既に登録されています');
      return;
    }

    setAssignments([...assignments, {
      staffId,
      staffName,
      skillLevel: 'intermediate',
      canPerform: true,
      commissionRate: 25,
    }]);
  };

  const removeAssignment = (staffId: string) => {
    setAssignments(assignments.filter(a => a.staffId !== staffId));
  };

  const handleSave = async () => {
    try {
      // Save staff assignments logic here
      toast.success('スタッフ設定を保存しました');
      onClose();
    } catch (error) {
      toast.error('保存に失敗しました');
    }
  };

  if (!isOpen) return null;

  const unassignedStaff = staffList?.filter(
    staff => !assignments.find(a => a.staffId === staff.id)
  ) || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">スタッフ設定</h2>
            <p className="text-sm text-gray-600 mt-1">{menu.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Default Settings */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">基本設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    標準施術時間
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={menu.duration_minutes}
                      disabled
                      className="bg-gray-50"
                    />
                    <span className="text-gray-600">分</span>
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                      defaultChecked
                    />
                    <span className="text-sm text-gray-700">
                      スキルレベルに応じて施術時間を自動調整する
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Staff Assignments */}
          <Card>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">担当可能スタッフ</h3>
                {unassignedStaff.length > 0 && (
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        const staff = unassignedStaff.find(s => s.id === e.target.value);
                        if (staff) {
                          addStaffAssignment(staff.id, staff.name);
                          e.target.value = '';
                        }
                      }}
                      className="pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">スタッフを追加</option>
                      {unassignedStaff.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.staffId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{assignment.staffName}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              skillLevels[assignment.skillLevel].bgColor
                            } ${skillLevels[assignment.skillLevel].color}`}>
                              {skillLevels[assignment.skillLevel].label}
                            </span>
                            {assignment.canPerform ? (
                              <span className="text-xs text-green-600">施術可能</span>
                            ) : (
                              <span className="text-xs text-red-600">施術不可</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAssignment(assignment.staffId)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          スキルレベル
                        </label>
                        <select
                          value={assignment.skillLevel}
                          onChange={(e) => updateAssignment(assignment.staffId, {
                            skillLevel: e.target.value as StaffAssignment['skillLevel']
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(skillLevels).map(([value, config]) => (
                            <option key={value} value={value}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          施術時間
                        </label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={assignment.customDuration || menu.duration_minutes}
                            onChange={(e) => updateAssignment(assignment.staffId, {
                              customDuration: Number(e.target.value)
                            })}
                          />
                          <span className="text-gray-600 text-sm">分</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          歩合率
                        </label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={assignment.commissionRate || 0}
                            onChange={(e) => updateAssignment(assignment.staffId, {
                              commissionRate: Number(e.target.value)
                            })}
                          />
                          <span className="text-gray-600 text-sm">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        備考・注意事項
                      </label>
                      <textarea
                        value={assignment.notes || ''}
                        onChange={(e) => updateAssignment(assignment.staffId, {
                          notes: e.target.value
                        })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="例：研修中、指名料別途など"
                      />
                    </div>

                    <div className="mt-3 flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={assignment.canPerform}
                          onChange={(e) => updateAssignment(assignment.staffId, {
                            canPerform: e.target.checked
                          })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-700">施術可能</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-700">指名可能</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-700">研修必須</span>
                      </label>
                    </div>
                  </div>
                ))}

                {assignments.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    担当可能なスタッフが設定されていません
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Performance Settings */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">パフォーマンス設定</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                    defaultChecked
                  />
                  <span className="text-sm text-gray-700">
                    スキルレベルの高いスタッフを優先的に表示
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                  />
                  <span className="text-sm text-gray-700">
                    施術時間が短いスタッフを優先的に表示
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                  />
                  <span className="text-sm text-gray-700">
                    評価の高いスタッフを優先的に表示
                  </span>
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存する
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuStaffAssignment;