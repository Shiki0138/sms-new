import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  BellSlashIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { BulkMessagingService } from '../../services/bulk-messaging-service';
import { CustomerMessagePreference, OptInOutRequest, BulkPreferenceUpdateRequest } from '../../types/bulk-messaging';
import { Customer } from '../../types/customer';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CustomerPreferencesPanelProps {
  tenantId: string;
  customer?: Customer;
  customers?: Customer[];
  onPreferenceUpdate?: () => void;
  mode?: 'single' | 'bulk';
}

export default function CustomerPreferencesPanel({
  tenantId,
  customer,
  customers = [],
  onPreferenceUpdate,
  mode = 'single',
}: CustomerPreferencesPanelProps) {
  const [service] = useState(() => new BulkMessagingService(tenantId));
  const [preferences, setPreferences] = useState<CustomerMessagePreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [optOutChannel, setOptOutChannel] = useState<'line' | 'email' | 'sms' | null>(null);
  const [optOutReason, setOptOutReason] = useState('');

  // Bulk mode states
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bulkPreferences, setBulkPreferences] = useState<BulkPreferenceUpdateRequest['updates']>({});

  const channels = [
    { id: 'line', name: 'LINE', icon: ChatBubbleLeftRightIcon, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'email', name: 'メール', icon: EnvelopeIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'sms', name: 'SMS', icon: DevicePhoneMobileIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  const messageTypes = [
    { id: 'reminders', name: 'リマインダー', description: '予約前後の通知' },
    { id: 'campaigns', name: 'キャンペーン', description: '特別オファーやセール情報' },
    { id: 'announcements', name: 'お知らせ', description: '営業時間変更など重要な情報' },
    { id: 'urgent', name: '緊急連絡', description: '予約変更など緊急のお知らせ' },
  ];

  const weekDays = [
    { id: 'mon', name: '月' },
    { id: 'tue', name: '火' },
    { id: 'wed', name: '水' },
    { id: 'thu', name: '木' },
    { id: 'fri', name: '金' },
    { id: 'sat', name: '土' },
    { id: 'sun', name: '日' },
  ];

  useEffect(() => {
    if (mode === 'single' && customer) {
      loadCustomerPreferences();
    }
  }, [customer]);

  const loadCustomerPreferences = async () => {
    if (!customer) return;
    
    setLoading(true);
    try {
      const prefs = await service.getCustomerPreferences(customer.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPreferenceForChannel = (channelType: 'line' | 'email' | 'sms'): CustomerMessagePreference | undefined => {
    return preferences.find(p => p.channel_type === channelType);
  };

  const handleOptInToggle = async (channelType: 'line' | 'email' | 'sms') => {
    if (mode === 'bulk') {
      // In bulk mode, just update the state
      setBulkPreferences(prev => ({
        ...prev,
        is_opted_in: !prev.is_opted_in,
      }));
      return;
    }

    if (!customer) return;

    const currentPref = getPreferenceForChannel(channelType);
    const isCurrentlyOptedIn = currentPref?.is_opted_in ?? true;

    if (isCurrentlyOptedIn) {
      // Show opt-out modal
      setOptOutChannel(channelType);
      setShowOptOutModal(true);
    } else {
      // Opt back in
      await updatePreference(channelType, true);
    }
  };

  const updatePreference = async (
    channelType: 'line' | 'email' | 'sms',
    isOptedIn: boolean,
    reason?: string,
    preferences?: Partial<CustomerMessagePreference>
  ) => {
    if (!customer) return;

    setSaving(true);
    try {
      const request: OptInOutRequest = {
        customer_id: customer.id,
        channel_type: channelType,
        is_opted_in: isOptedIn,
        reason,
        preferences,
      };

      await service.updateCustomerPreference(request);
      await loadCustomerPreferences();
      onPreferenceUpdate?.();
    } catch (error) {
      console.error('Error updating preference:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOptOutConfirm = async () => {
    if (!optOutChannel || !customer) return;

    await updatePreference(optOutChannel, false, optOutReason);
    setShowOptOutModal(false);
    setOptOutChannel(null);
    setOptOutReason('');
  };

  const handleMessageTypeToggle = async (
    channelType: 'line' | 'email' | 'sms',
    messageType: 'reminders' | 'campaigns' | 'announcements' | 'urgent'
  ) => {
    if (mode === 'bulk') {
      setBulkPreferences(prev => ({
        ...prev,
        [`receive_${messageType}`]: !prev[`receive_${messageType}` as keyof typeof prev],
      }));
      return;
    }

    if (!customer) return;

    const currentPref = getPreferenceForChannel(channelType);
    const updates = {
      [`receive_${messageType}`]: !currentPref?.[`receive_${messageType}` as keyof CustomerMessagePreference],
    };

    await updatePreference(channelType, currentPref?.is_opted_in ?? true, undefined, updates);
  };

  const handleTimePreferenceUpdate = async (
    channelType: 'line' | 'email' | 'sms',
    startTime: string,
    endTime: string
  ) => {
    if (mode === 'bulk') {
      setBulkPreferences(prev => ({
        ...prev,
        preferred_time_start: startTime,
        preferred_time_end: endTime,
      }));
      return;
    }

    if (!customer) return;

    const currentPref = getPreferenceForChannel(channelType);
    await updatePreference(channelType, currentPref?.is_opted_in ?? true, undefined, {
      preferred_time_start: startTime,
      preferred_time_end: endTime,
    });
  };

  const handleDayPreferenceToggle = async (
    channelType: 'line' | 'email' | 'sms',
    day: string
  ) => {
    if (mode === 'bulk') {
      setBulkPreferences(prev => {
        const currentDays = prev.preferred_days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const newDays = currentDays.includes(day)
          ? currentDays.filter(d => d !== day)
          : [...currentDays, day];
        return {
          ...prev,
          preferred_days: newDays,
        };
      });
      return;
    }

    if (!customer) return;

    const currentPref = getPreferenceForChannel(channelType);
    const currentDays = currentPref?.preferred_days || weekDays.map(d => d.id);
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    await updatePreference(channelType, currentPref?.is_opted_in ?? true, undefined, {
      preferred_days: newDays,
    });
  };

  const handleBulkUpdate = async () => {
    if (selectedCustomers.length === 0) return;

    setSaving(true);
    try {
      const request: BulkPreferenceUpdateRequest = {
        customer_ids: selectedCustomers,
        updates: bulkPreferences,
      };

      const updatedCount = await service.bulkUpdatePreferences(request);
      console.log(`Updated preferences for ${updatedCount} customers`);
      
      onPreferenceUpdate?.();
      setSelectedCustomers([]);
      setBulkPreferences({});
    } catch (error) {
      console.error('Error updating bulk preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderChannelPreferences = (channelType: 'line' | 'email' | 'sms') => {
    const channel = channels.find(c => c.id === channelType)!;
    const pref = getPreferenceForChannel(channelType);
    const isOptedIn = mode === 'bulk' ? bulkPreferences.is_opted_in ?? true : pref?.is_opted_in ?? true;

    return (
      <motion.div
        key={channelType}
        layout
        className={`p-6 border rounded-xl transition-all ${
          isOptedIn ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
        }`}
      >
        {/* Channel Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${channel.bgColor}`}>
              <channel.icon className={`h-5 w-5 ${channel.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{channel.name}</h3>
              {pref?.opt_out_date && (
                <p className="text-xs text-gray-500">
                  停止日: {format(new Date(pref.opt_out_date), 'yyyy年M月d日', { locale: ja })}
                </p>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOptInToggle(channelType)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isOptedIn ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isOptedIn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </motion.button>
        </div>

        {/* Message Type Preferences */}
        {isOptedIn && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">受信するメッセージの種類</h4>
              <div className="space-y-2">
                {messageTypes.map((type) => {
                  const prefKey = `receive_${type.id}` as keyof CustomerMessagePreference;
                  const isEnabled = mode === 'bulk' 
                    ? bulkPreferences[prefKey] ?? true
                    : pref?.[prefKey] ?? true;

                  return (
                    <label
                      key={type.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleMessageTypeToggle(channelType, type.id as any)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{type.name}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Time Preferences */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">配信希望時間帯</h4>
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  value={mode === 'bulk' ? bulkPreferences.preferred_time_start || '09:00' : pref?.preferred_time_start || '09:00'}
                  onChange={(e) => {
                    const endTime = mode === 'bulk' 
                      ? bulkPreferences.preferred_time_end || '20:00'
                      : pref?.preferred_time_end || '20:00';
                    handleTimePreferenceUpdate(channelType, e.target.value, endTime);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="time"
                  value={mode === 'bulk' ? bulkPreferences.preferred_time_end || '20:00' : pref?.preferred_time_end || '20:00'}
                  onChange={(e) => {
                    const startTime = mode === 'bulk'
                      ? bulkPreferences.preferred_time_start || '09:00'
                      : pref?.preferred_time_start || '09:00';
                    handleTimePreferenceUpdate(channelType, startTime, e.target.value);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            {/* Day Preferences */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">配信希望曜日</h4>
              <div className="flex space-x-1">
                {weekDays.map((day) => {
                  const currentDays = mode === 'bulk'
                    ? bulkPreferences.preferred_days || weekDays.map(d => d.id)
                    : pref?.preferred_days || weekDays.map(d => d.id);
                  const isSelected = currentDays.includes(day.id);

                  return (
                    <motion.button
                      key={day.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDayPreferenceToggle(channelType, day.id)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day.name}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
              <BellIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'single' ? 'メッセージ配信設定' : '一括配信設定'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'single' 
                  ? `${customer?.name}様の配信設定を管理`
                  : `${selectedCustomers.length}名の顧客の設定を一括更新`
                }
              </p>
            </div>
          </div>

          {mode === 'bulk' && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">{selectedCustomers.length}</div>
              <div className="text-xs text-gray-500">選択中</div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Customer Selection */}
      {mode === 'bulk' && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">対象顧客を選択</h3>
          <div className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {customers.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers([...selectedCustomers, c.id]);
                      } else {
                        setSelectedCustomers(selectedCustomers.filter(id => id !== c.id));
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.email || c.phone_number || 'メールアドレス・電話番号なし'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <button
              onClick={() => setSelectedCustomers(customers.map(c => c.id))}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              すべて選択
            </button>
            <button
              onClick={() => setSelectedCustomers([])}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              選択解除
            </button>
          </div>
        </Card>
      )}

      {/* Channel Preferences */}
      <div className="space-y-4">
        {mode === 'single' 
          ? channels.map(channel => renderChannelPreferences(channel.id as any))
          : (
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">配信設定</h3>
              <div className="space-y-4">
                {/* Global opt-in/out */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BellIcon className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">すべてのメッセージ配信</div>
                      <div className="text-sm text-gray-500">すべてのチャンネルでの配信を一括設定</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setBulkPreferences(prev => ({
                      ...prev,
                      is_opted_in: !prev.is_opted_in,
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      bulkPreferences.is_opted_in ?? true ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        bulkPreferences.is_opted_in ?? true ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </motion.button>
                </div>

                {/* Message type preferences */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">メッセージタイプ別設定</h4>
                  <div className="space-y-2">
                    {messageTypes.map((type) => {
                      const prefKey = `receive_${type.id}` as keyof BulkPreferenceUpdateRequest['updates'];
                      const isEnabled = bulkPreferences[prefKey] ?? true;

                      return (
                        <label
                          key={type.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => setBulkPreferences(prev => ({
                                ...prev,
                                [prefKey]: !isEnabled,
                              }))}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{type.name}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )
        }
      </div>

      {/* Save Button for Bulk Mode */}
      {mode === 'bulk' && selectedCustomers.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleBulkUpdate}
            disabled={saving}
            className="min-w-[150px]"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>更新中...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4" />
                <span>一括更新 ({selectedCustomers.length}名)</span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Opt-out Modal */}
      <AnimatePresence>
        {showOptOutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowOptOutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-start space-x-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">配信停止の確認</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {optOutChannel && channels.find(c => c.id === optOutChannel)?.name}での配信を停止しますか？
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  停止理由（任意）
                </label>
                <textarea
                  value={optOutReason}
                  onChange={(e) => setOptOutReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="配信停止の理由をお聞かせください..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowOptOutModal(false);
                    setOptOutChannel(null);
                    setOptOutReason('');
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleOptOutConfirm}
                  className="bg-red-600 hover:bg-red-700"
                >
                  配信を停止
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}