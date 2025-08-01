import React, { useState } from 'react';
import { X, Save, Plus, Clock, Users, Calendar, Percent, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { TreatmentMenu } from '../../types/treatment';

interface MenuPricingOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  menu: TreatmentMenu;
}

interface PricingOption {
  id: string;
  type: 'member' | 'time' | 'day' | 'package' | 'campaign';
  name: string;
  price: number;
  discount?: number;
  conditions?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  validFrom?: string;
  validUntil?: string;
}

const MenuPricingOptions: React.FC<MenuPricingOptionsProps> = ({ isOpen, onClose, menu }) => {
  const [basePrice, setBasePrice] = useState(menu.price);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([
    {
      id: '1',
      type: 'member',
      name: 'メンバー価格',
      price: menu.price * 0.9,
      discount: 10,
    },
  ]);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionType, setNewOptionType] = useState<PricingOption['type']>('member');

  const addPricingOption = (type: PricingOption['type']) => {
    const newOption: PricingOption = {
      id: Date.now().toString(),
      type,
      name: getDefaultOptionName(type),
      price: basePrice,
      discount: 0,
    };

    if (type === 'time') {
      newOption.startTime = '10:00';
      newOption.endTime = '15:00';
    } else if (type === 'day') {
      newOption.daysOfWeek = [1, 2, 3, 4, 5]; // Weekdays
    } else if (type === 'campaign') {
      newOption.validFrom = new Date().toISOString().split('T')[0];
      newOption.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setPricingOptions([...pricingOptions, newOption]);
    setShowAddOption(false);
  };

  const getDefaultOptionName = (type: PricingOption['type']) => {
    switch (type) {
      case 'member': return 'メンバー価格';
      case 'time': return '時間帯割引';
      case 'day': return '曜日割引';
      case 'package': return 'パッケージ価格';
      case 'campaign': return 'キャンペーン価格';
      default: return '特別価格';
    }
  };

  const updateOption = (id: string, updates: Partial<PricingOption>) => {
    setPricingOptions(pricingOptions.map(opt => 
      opt.id === id ? { ...opt, ...updates } : opt
    ));
  };

  const removeOption = (id: string) => {
    setPricingOptions(pricingOptions.filter(opt => opt.id !== id));
  };

  const handleSave = async () => {
    try {
      // Save pricing options logic here
      toast.success('価格設定を保存しました');
      onClose();
    } catch (error) {
      toast.error('保存に失敗しました');
    }
  };

  if (!isOpen) return null;

  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">価格設定</h2>
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
          {/* Base Price */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">基本価格</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="text-xl font-semibold"
                  />
                </div>
                <span className="text-gray-600">円（税込）</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                通常の販売価格です。特別価格が適用されない場合はこの価格が使用されます。
              </p>
            </div>
          </Card>

          {/* Pricing Options */}
          <Card>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">特別価格設定</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddOption(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>

              {showAddOption && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-3">追加する価格タイプを選択</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => addPricingOption('member')}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 transition-colors"
                    >
                      <Users className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <span className="text-sm">メンバー価格</span>
                    </button>
                    <button
                      onClick={() => addPricingOption('time')}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 transition-colors"
                    >
                      <Clock className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <span className="text-sm">時間帯割引</span>
                    </button>
                    <button
                      onClick={() => addPricingOption('day')}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 transition-colors"
                    >
                      <Calendar className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <span className="text-sm">曜日割引</span>
                    </button>
                    <button
                      onClick={() => addPricingOption('package')}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 transition-colors"
                    >
                      <Tag className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <span className="text-sm">パッケージ</span>
                    </button>
                    <button
                      onClick={() => addPricingOption('campaign')}
                      className="p-3 border border-gray-300 rounded-lg hover:bg-white hover:border-blue-500 transition-colors"
                    >
                      <Percent className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                      <span className="text-sm">キャンペーン</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowAddOption(false)}
                    className="mt-3 text-sm text-gray-600 hover:text-gray-800"
                  >
                    キャンセル
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {pricingOptions.map((option) => (
                  <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {option.type === 'member' && <Users className="h-5 w-5 text-blue-600" />}
                        {option.type === 'time' && <Clock className="h-5 w-5 text-green-600" />}
                        {option.type === 'day' && <Calendar className="h-5 w-5 text-purple-600" />}
                        {option.type === 'package' && <Tag className="h-5 w-5 text-orange-600" />}
                        {option.type === 'campaign' && <Percent className="h-5 w-5 text-red-600" />}
                        <input
                          type="text"
                          value={option.name}
                          onChange={(e) => updateOption(option.id, { name: e.target.value })}
                          className="font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeOption(option.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          価格
                        </label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={option.price}
                            onChange={(e) => updateOption(option.id, { price: Number(e.target.value) })}
                          />
                          <span className="text-gray-600">円</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          割引率
                        </label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={option.discount || 0}
                            onChange={(e) => {
                              const discount = Number(e.target.value);
                              updateOption(option.id, { 
                                discount,
                                price: Math.round(basePrice * (1 - discount / 100))
                              });
                            }}
                          />
                          <span className="text-gray-600">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Time-based options */}
                    {option.type === 'time' && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            開始時刻
                          </label>
                          <Input
                            type="time"
                            value={option.startTime || ''}
                            onChange={(e) => updateOption(option.id, { startTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            終了時刻
                          </label>
                          <Input
                            type="time"
                            value={option.endTime || ''}
                            onChange={(e) => updateOption(option.id, { endTime: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Day-based options */}
                    {option.type === 'day' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          適用曜日
                        </label>
                        <div className="flex space-x-2">
                          {daysOfWeek.map((day, index) => (
                            <label
                              key={index}
                              className={`flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-colors ${
                                option.daysOfWeek?.includes(index)
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={option.daysOfWeek?.includes(index) || false}
                                onChange={(e) => {
                                  const days = option.daysOfWeek || [];
                                  if (e.target.checked) {
                                    updateOption(option.id, { daysOfWeek: [...days, index] });
                                  } else {
                                    updateOption(option.id, { 
                                      daysOfWeek: days.filter(d => d !== index) 
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm font-medium">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campaign options */}
                    {option.type === 'campaign' && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            開始日
                          </label>
                          <Input
                            type="date"
                            value={option.validFrom || ''}
                            onChange={(e) => updateOption(option.id, { validFrom: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            終了日
                          </label>
                          <Input
                            type="date"
                            value={option.validUntil || ''}
                            onChange={(e) => updateOption(option.id, { validUntil: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Conditions */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        適用条件・備考
                      </label>
                      <textarea
                        value={option.conditions || ''}
                        onChange={(e) => updateOption(option.id, { conditions: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="例：初回限定、学生証提示など"
                      />
                    </div>
                  </div>
                ))}

                {pricingOptions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    特別価格が設定されていません
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Price Display Settings */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">価格表示設定</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                    defaultChecked
                  />
                  <span className="text-sm text-gray-700">
                    税込価格を表示する
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                  />
                  <span className="text-sm text-gray-700">
                    割引前価格を取り消し線で表示する
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                  />
                  <span className="text-sm text-gray-700">
                    割引率をバッジで表示する
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

export default MenuPricingOptions;