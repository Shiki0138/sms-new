/**
 * 自動リマインダー管理ダッシュボード
 * リマインダー設定、スケジュール、分析を統合管理
 */

import React, { useState, useEffect } from 'react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  EnhancedReminderSetting, 
  ScheduledReminder, 
  ReminderAnalytics, 
  ReminderDashboardStats,
  ReminderType,
  ChannelType 
} from '../../types/message';
import { getAutomatedReminderScheduler } from '../../services/automated-reminder-scheduler';
import { useTenant } from '../../hooks/useTenant';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface AutomatedReminderDashboardProps {
  className?: string;
}

export function AutomatedReminderDashboard({ className }: AutomatedReminderDashboardProps) {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'schedule' | 'analytics'>('overview');
  const [settings, setSettings] = useState<EnhancedReminderSetting[]>([]);
  const [dashboardStats, setDashboardStats] = useState<ReminderDashboardStats | null>(null);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);
  const [analytics, setAnalytics] = useState<ReminderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scheduler = tenant ? getAutomatedReminderScheduler(tenant.id) : null;

  // データ読み込み
  useEffect(() => {
    if (!scheduler) return;
    loadDashboardData();
  }, [scheduler]);

  const loadDashboardData = async () => {
    if (!scheduler) return;
    
    try {
      setLoading(true);
      setError(null);

      // 並行してデータを読み込み
      const [settingsData, statsData, analyticsData] = await Promise.all([
        scheduler.getReminderSettings(),
        loadDashboardStats(),
        scheduler.getReminderAnalytics(subDays(new Date(), 30), new Date())
      ]);

      setSettings(settingsData);
      setDashboardStats(statsData);
      setAnalytics(analyticsData);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('ダッシュボードデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (): Promise<ReminderDashboardStats> => {
    // TODO: 実際のAPIから統計データを取得
    return {
      today: {
        scheduled: 15,
        sent: 12,
        pending: 3,
        failed: 0
      },
      this_week: {
        total_sent: 89,
        delivery_rate: 0.96,
        open_rate: 0.78,
        action_rate: 0.45
      },
      trends: {
        no_show_reduction: 0.32,
        customer_satisfaction: 4.7,
        revenue_impact: 125000
      },
      upcoming: [
        { reminder_type: 'pre_visit_1day', count: 8, next_scheduled: new Date().toISOString() },
        { reminder_type: 'pre_visit_3days', count: 15, next_scheduled: new Date().toISOString() },
        { reminder_type: 'post_visit_24hours', count: 5, next_scheduled: new Date().toISOString() }
      ]
    };
  };

  // リマインダー設定の更新
  const updateReminderSetting = async (settingId: string, updates: Partial<EnhancedReminderSetting>) => {
    if (!scheduler) return;

    try {
      await scheduler.updateReminderSetting(settingId, updates);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to update reminder setting:', err);
      setError('設定の更新に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">リマインダーデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-red-800 mb-2">エラーが発生しました</h3>
        <p className="text-red-600">{error}</p>
        <Button 
          onClick={loadDashboardData} 
          className="mt-4"
          variant="outline"
        >
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">自動リマインダー管理</h2>
          <p className="text-gray-600">
            予約の1週間前、3日前、来店後翌日の自動リマインド機能
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">自動実行中</span>
          </div>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            更新
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: '概要', icon: '📊' },
            { id: 'settings', label: '設定', icon: '⚙️' },
            { id: 'schedule', label: 'スケジュール', icon: '📅' },
            { id: 'analytics', label: '分析', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'overview' && (
        <OverviewTab 
          stats={dashboardStats} 
          analytics={analytics}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab 
          settings={settings} 
          onUpdateSetting={updateReminderSetting}
        />
      )}

      {activeTab === 'schedule' && (
        <ScheduleTab 
          reminders={scheduledReminders}
          onRefresh={loadDashboardData}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab 
          analytics={analytics}
          onRefresh={loadDashboardData}
        />
      )}
    </div>
  );
}

// 概要タブ
interface OverviewTabProps {
  stats: ReminderDashboardStats | null;
  analytics: ReminderAnalytics | null;
}

function OverviewTab({ stats, analytics }: OverviewTabProps) {
  if (!stats) return <div>統計データを読み込み中...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* 今日の実績 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今日の実績</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">予定済み</span>
            <span className="text-2xl font-bold text-blue-600">{stats.today.scheduled}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">送信済み</span>
            <span className="text-2xl font-bold text-green-600">{stats.today.sent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">保留中</span>
            <span className="text-2xl font-bold text-orange-600">{stats.today.pending}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">失敗</span>
            <span className="text-2xl font-bold text-red-600">{stats.today.failed}</span>
          </div>
        </div>
      </Card>

      {/* 今週のパフォーマンス */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今週のパフォーマンス</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">総送信数</span>
            <span className="text-xl font-bold">{stats.this_week.total_sent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">配信成功率</span>
            <span className="text-xl font-bold text-green-600">
              {(stats.this_week.delivery_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">開封率</span>
            <span className="text-xl font-bold text-blue-600">
              {(stats.this_week.open_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">アクション率</span>
            <span className="text-xl font-bold text-purple-600">
              {(stats.this_week.action_rate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </Card>

      {/* ビジネスインパクト */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ビジネスインパクト</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">No-Show削減</span>
            <span className="text-xl font-bold text-green-600">
              {(stats.trends.no_show_reduction * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">顧客満足度</span>
            <span className="text-xl font-bold text-yellow-600">
              {stats.trends.customer_satisfaction.toFixed(1)}/5.0
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">収益インパクト</span>
            <span className="text-xl font-bold text-green-600">
              ¥{stats.trends.revenue_impact.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* 今後の予定 */}
      <Card className="p-6 lg:col-span-2 xl:col-span-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今後の送信予定</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.upcoming.map((item) => (
            <div key={item.reminder_type} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {getReminderTypeLabel(item.reminder_type)}
                </span>
                <span className="text-lg font-bold text-blue-600">{item.count}</span>
              </div>
              <p className="text-xs text-gray-500">
                次回: {format(new Date(item.next_scheduled), 'M/d HH:mm', { locale: ja })}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// 設定タブ
interface SettingsTabProps {
  settings: EnhancedReminderSetting[];
  onUpdateSetting: (settingId: string, updates: Partial<EnhancedReminderSetting>) => Promise<void>;
}

function SettingsTab({ settings, onUpdateSetting }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">リマインダー設定</h3>
        <Button variant="primary" size="sm">
          新しい設定を追加
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((setting) => (
          <ReminderSettingCard
            key={setting.id}
            setting={setting}
            onUpdate={onUpdateSetting}
          />
        ))}
      </div>
    </div>
  );
}

// リマインダー設定カード
interface ReminderSettingCardProps {
  setting: EnhancedReminderSetting;
  onUpdate: (settingId: string, updates: Partial<EnhancedReminderSetting>) => Promise<void>;
}

function ReminderSettingCard({ setting, onUpdate }: ReminderSettingCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(setting);

  const handleSave = async () => {
    try {
      await onUpdate(setting.id, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleCancel = () => {
    setEditData(setting);
    setIsEditing(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${setting.is_enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div>
            <h4 className="font-semibold text-gray-900">{setting.label}</h4>
            <p className="text-sm text-gray-600">{setting.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            size="sm"
          >
            {isEditing ? 'キャンセル' : '編集'}
          </Button>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={editData.is_enabled}
              onChange={(e) => {
                const updates = { ...editData, is_enabled: e.target.checked };
                setEditData(updates);
                if (!isEditing) {
                  onUpdate(setting.id, { is_enabled: e.target.checked });
                }
              }}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              editData.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                editData.is_enabled ? 'translate-x-5' : 'translate-x-0'
              } mt-0.5 ml-0.5`}></div>
            </div>
          </label>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* 送信タイミング */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              送信タイミング
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={editData.timing_value}
                onChange={(e) => setEditData({ ...editData, timing_value: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
              <select
                value={editData.timing_unit}
                onChange={(e) => setEditData({ ...editData, timing_unit: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="hours">時間</option>
                <option value="days">日</option>
                <option value="weeks">週</option>
              </select>
              <span className="text-sm text-gray-600">
                {setting.reminder_type.includes('pre_') ? '前' : '後'}
              </span>
            </div>
          </div>

          {/* 送信チャンネル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              送信チャンネル
            </label>
            <div className="flex flex-wrap gap-2">
              {(['line', 'email', 'instagram'] as ChannelType[]).map((channel) => (
                <label key={channel} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editData.send_via_channels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditData({ 
                          ...editData, 
                          send_via_channels: [...editData.send_via_channels, channel] 
                        });
                      } else {
                        setEditData({ 
                          ...editData, 
                          send_via_channels: editData.send_via_channels.filter(c => c !== channel) 
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>

          {/* メッセージテンプレート */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メッセージテンプレート
            </label>
            <textarea
              value={editData.message_template}
              onChange={(e) => setEditData({ ...editData, message_template: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="メッセージテンプレートを入力..."
            />
            <p className="text-xs text-gray-500 mt-1">
              利用可能な変数: {'{customer_name}, {date}, {time}, {menu}, {staff_name}'}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button onClick={handleCancel} variant="outline" size="sm">
              キャンセル
            </Button>
            <Button onClick={handleSave} variant="primary" size="sm">
              保存
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-gray-600">送信タイミング: </span>
            <span className="font-medium">
              {setting.timing_value}{setting.timing_unit === 'days' ? '日' : setting.timing_unit === 'hours' ? '時間' : '週'}
              {setting.reminder_type.includes('pre_') ? '前' : '後'}
            </span>
          </div>
          
          <div className="text-sm">
            <span className="text-gray-600">送信チャンネル: </span>
            <span className="font-medium">
              {setting.send_via_channels.map(c => c.toUpperCase()).join(', ')}
            </span>
          </div>
          
          <div className="text-sm">
            <span className="text-gray-600">優先度: </span>
            <span className={`font-medium ${
              setting.priority === 'high' ? 'text-red-600' :
              setting.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {setting.priority === 'high' ? '高' : setting.priority === 'medium' ? '中' : '低'}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

// スケジュールタブ
interface ScheduleTabProps {
  reminders: ScheduledReminder[];
  onRefresh: () => Promise<void>;
}

function ScheduleTab({ reminders, onRefresh }: ScheduleTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">送信スケジュール</h3>
        <Button onClick={onRefresh} variant="outline" size="sm">
          更新
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {reminders.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              現在スケジュールされているリマインダーはありません
            </li>
          ) : (
            reminders.map((reminder) => (
              <ScheduledReminderItem key={reminder.id} reminder={reminder} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

// スケジュールされたリマインダーアイテム
interface ScheduledReminderItemProps {
  reminder: ScheduledReminder;
}

function ScheduledReminderItem({ reminder }: ScheduledReminderItemProps) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const statusLabels = {
    scheduled: '予定済み',
    processing: '処理中',
    sent: '送信済み',
    failed: '失敗',
    cancelled: 'キャンセル'
  };

  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[reminder.status]}`}>
            {statusLabels[reminder.status]}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {getReminderTypeLabel(reminder.reminder_type)}
            </p>
            <p className="text-sm text-gray-500">
              予定: {format(new Date(reminder.scheduled_at), 'M/d HH:mm', { locale: ja })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {reminder.metadata.channels.map(c => c.toUpperCase()).join(', ')}
            </p>
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
              reminder.priority === 'high' ? 'bg-red-50 text-red-700' :
              reminder.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
              'bg-green-50 text-green-700'
            }`}>
              優先度: {reminder.priority === 'high' ? '高' : reminder.priority === 'medium' ? '中' : '低'}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// 分析タブ
interface AnalyticsTabProps {
  analytics: ReminderAnalytics | null;
  onRefresh: () => Promise<void>;
}

function AnalyticsTab({ analytics, onRefresh }: AnalyticsTabProps) {
  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">分析データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">リマインダー分析</h3>
        <div className="text-sm text-gray-500">
          期間: {format(new Date(analytics.period.start), 'M/d', { locale: ja })} - {format(new Date(analytics.period.end), 'M/d', { locale: ja })}
        </div>
      </div>

      {/* 全体概要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.overview.total_sent}</div>
            <div className="text-sm text-gray-600">総送信数</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(analytics.overview.delivery_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">配信成功率</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(analytics.overview.open_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">開封率</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(analytics.overview.action_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">アクション率</div>
          </div>
        </Card>
      </div>

      {/* タイプ別効果 */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">タイプ別効果</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  リマインダータイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  送信数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  開封数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  効果率
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.by_type.map((item) => (
                <tr key={item.type}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getReminderTypeLabel(item.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.opened}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.actioned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.effectiveness > 0.7 ? 'bg-green-100 text-green-800' :
                      item.effectiveness > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {(item.effectiveness * 100).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 最適化提案 */}
      {analytics.optimization_suggestions.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">最適化提案</h4>
          <ul className="space-y-2">
            {analytics.optimization_suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">💡</span>
                <span className="text-sm text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ヘルパー関数
function getReminderTypeLabel(type: ReminderType): string {
  const labels: Record<ReminderType, string> = {
    pre_visit_7days: '1週間前リマインダー',
    pre_visit_3days: '3日前リマインダー',
    pre_visit_1day: '前日リマインダー',
    post_visit_24hours: '来店後翌日フォローアップ',
    post_visit_1week: '1週間後フォローアップ',
    post_visit_1month: '1ヶ月後メンテナンス案内',
    no_show_prevention: 'No-Show防止リマインダー',
    service_maintenance: 'メンテナンスリマインダー',
    seasonal_care: '季節のケアリマインダー',
    loyalty_milestone: 'ロイヤルティマイルストーン'
  };

  return labels[type] || type;
}