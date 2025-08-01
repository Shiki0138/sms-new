import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  ClockIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { ReminderSetting, ReminderType, ChannelType } from '../../types/message';
import { animations, salonTheme } from '../../styles/design-system';
import { getReminderService } from '../../services/reminder-service';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// リマインダータイプの表示設定
const REMINDER_CONFIG: Record<ReminderType, {
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  defaultChannels: ChannelType[];
}> = {
  pre_visit_7days: {
    label: '1週間前リマインダー',
    description: '予約の1週間前にお客様へ確認メッセージを送信',
    icon: ClockIcon,
    color: 'bg-blue-100 text-blue-700',
    defaultChannels: ['line', 'email'],
  },
  pre_visit_3days: {
    label: '3日前リマインダー',
    description: '予約の3日前に詳細確認と準備事項を送信',
    icon: ClockIcon,
    color: 'bg-purple-100 text-purple-700',
    defaultChannels: ['line'],
  },
  pre_visit_1day: {
    label: '前日リマインダー',
    description: '予約前日に最終確認と道順案内を送信',
    icon: BellIcon,
    color: 'bg-orange-100 text-orange-700',
    defaultChannels: ['line', 'email'],
  },
  post_visit_24hours: {
    label: '来店後24時間',
    description: '来店翌日にお礼とアフターケアのアドバイスを送信',
    icon: CheckIcon,
    color: 'bg-green-100 text-green-700',
    defaultChannels: ['line'],
  },
  post_visit_1week: {
    label: '来店後1週間',
    description: '1週間後に仕上がり確認とケア方法を送信',
    icon: CheckIcon,
    color: 'bg-teal-100 text-teal-700',
    defaultChannels: ['line'],
  },
  post_visit_1month: {
    label: '来店後1ヶ月',
    description: '1ヶ月後に次回予約の案内とメニュー提案を送信',
    icon: CheckIcon,
    color: 'bg-pink-100 text-pink-700',
    defaultChannels: ['line', 'email'],
  },
};

// チャンネル設定
const CHANNEL_CONFIG: Record<ChannelType, {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
}> = {
  line: {
    label: 'LINE',
    icon: ChatBubbleLeftIcon,
    color: 'bg-green-100 text-green-700',
  },
  instagram: {
    label: 'Instagram',
    icon: CameraIcon,
    color: 'bg-pink-100 text-pink-700',
  },
  email: {
    label: 'メール',
    icon: EnvelopeIcon,
    color: 'bg-blue-100 text-blue-700',
  },
};

export default function ReminderSettings() {
  const { tenant } = useAuth();
  const [settings, setSettings] = useState<ReminderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string>('');

  // 設定を読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const reminderService = getReminderService();
      const data = await reminderService.getReminderSettings(tenant?.id || '');
      setSettings(data);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
      toast.error('リマインダー設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 有効/無効を切り替え
  const toggleEnabled = async (setting: ReminderSetting) => {
    const newSettings = settings.map(s =>
      s.id === setting.id ? { ...s, is_enabled: !s.is_enabled } : s
    );
    setSettings(newSettings);

    try {
      // TODO: Supabaseで更新
      toast.success(
        setting.is_enabled 
          ? `${REMINDER_CONFIG[setting.reminder_type].label}を無効にしました` 
          : `${REMINDER_CONFIG[setting.reminder_type].label}を有効にしました`
      );
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('設定の更新に失敗しました');
    }
  };

  // チャンネルを切り替え
  const toggleChannel = async (setting: ReminderSetting, channel: ChannelType) => {
    const newChannels = setting.send_via_channels.includes(channel)
      ? setting.send_via_channels.filter(c => c !== channel)
      : [...setting.send_via_channels, channel];

    const newSettings = settings.map(s =>
      s.id === setting.id ? { ...s, send_via_channels: newChannels } : s
    );
    setSettings(newSettings);

    try {
      // TODO: Supabaseで更新
    } catch (error) {
      console.error('Error updating channels:', error);
    }
  };

  // テンプレート編集開始
  const startEditingTemplate = (setting: ReminderSetting) => {
    setEditingId(setting.id);
    setEditingTemplate(setting.message_template);
  };

  // テンプレート保存
  const saveTemplate = async () => {
    if (!editingId) return;

    const newSettings = settings.map(s =>
      s.id === editingId ? { ...s, message_template: editingTemplate } : s
    );
    setSettings(newSettings);

    try {
      // TODO: Supabaseで更新
      toast.success('テンプレートを更新しました');
      setEditingId(null);
      setEditingTemplate('');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('テンプレートの保存に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-primary-100 rounded-lg">
            <BellIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">自動リマインダー設定</h2>
            <p className="text-sm text-gray-600">
              予約前後の自動通知メッセージを設定できます
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {settings.map((setting, index) => {
              const config = REMINDER_CONFIG[setting.reminder_type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, ...animations.spring.gentle }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* ヘッダー部分 */}
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {config.label}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {config.description}
                          </p>
                        </div>
                      </div>

                      {/* 有効/無効スイッチ */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleEnabled(setting)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          setting.is_enabled ? 'bg-primary-500' : 'bg-gray-300'
                        }`}
                      >
                        <motion.span
                          animate={{ x: setting.is_enabled ? 20 : 2 }}
                          transition={animations.spring.smooth}
                          className="inline-block h-4 w-4 transform rounded-full bg-white"
                        />
                      </motion.button>
                    </div>

                    {/* 送信チャンネル選択 */}
                    {setting.is_enabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={animations.spring.gentle}
                        className="mt-4 flex items-center space-x-2"
                      >
                        <span className="text-sm text-gray-600">送信方法:</span>
                        {Object.entries(CHANNEL_CONFIG).map(([channel, channelConfig]) => {
                          const ChannelIcon = channelConfig.icon;
                          const isActive = setting.send_via_channels.includes(channel as ChannelType);

                          return (
                            <motion.button
                              key={channel}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleChannel(setting, channel as ChannelType)}
                              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                isActive
                                  ? channelConfig.color
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <ChannelIcon className="h-3 w-3" />
                              <span>{channelConfig.label}</span>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>

                  {/* テンプレート編集エリア */}
                  {setting.is_enabled && (
                    <div className="p-4 border-t border-gray-200">
                      {editingId === setting.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editingTemplate}
                            onChange={(e) => setEditingTemplate(e.target.value)}
                            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="メッセージテンプレート"
                          />
                          <div className="flex justify-end space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setEditingId(null);
                                setEditingTemplate('');
                              }}
                              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                            >
                              キャンセル
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={saveTemplate}
                              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                            >
                              保存
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-700 whitespace-pre-line">
                            {setting.message_template.split('\n').slice(0, 3).join('\n')}
                            {setting.message_template.split('\n').length > 3 && '...'}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => startEditingTemplate(setting)}
                            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>テンプレートを編集</span>
                          </motion.button>
                        </div>
                      )}

                      {/* 利用可能な変数 */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-1">利用可能な変数:</p>
                        <p className="text-xs text-gray-500">
                          {'{customer_name}'} {'{date}'} {'{time}'} {'{menu}'} {'{salon_name}'}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <BellIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">リマインダー送信について</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>お客様の営業時間外には送信されません</li>
                <li>同じリマインダーは1回のみ送信されます</li>
                <li>お客様がメッセージ受信を拒否している場合は送信されません</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}