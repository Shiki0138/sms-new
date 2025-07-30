import React, { useState } from 'react';
import {
  User,
  Store,
  Bell,
  Shield,
  Package,
  ExternalLink,
  BarChart3,
  Link as LinkIcon,
  Crown,
  Star,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useUpdateTenant } from '../../hooks/useUpdateTenant';
import { toast } from 'react-hot-toast';
import ApiIntegrationSettings from '../../components/settings/ApiIntegrationSettings';
import ReminderSettings from '../../components/settings/ReminderSettings';
import HolidaySettingsCard from '../../components/settings/HolidaySettingsCard';
import PlanUsageCard from '../../components/common/PlanUsageCard';
import { useBusinessHours } from '../../hooks/useBusinessHours';
import { useBusinessHoursContext } from '../../contexts/BusinessHoursContext';

const SettingsPage: React.FC = () => {
  const { user, tenant: authTenant } = useAuth();
  const { data: tenant } = useTenant();
  const updateTenant = useUpdateTenant();
  const [activeTab, setActiveTab] = useState<
    | 'salon'
    | 'plan'
    | 'account'
    | 'api'
    | 'reminders'
    | 'business_hours'
    | 'notifications'
    | 'security'
  >('salon');

  // 営業時間・休日設定 - 開発環境では固定IDを使用
  const effectiveTenantId = tenant?.id || authTenant?.id || (import.meta.env.DEV ? 'dev-tenant-id' : '');

  // デバッグ用ログ
  React.useEffect(() => {
    console.log('Debug - Tenant info:', {
      tenant: tenant,
      authTenant: authTenant,
      effectiveTenantId: effectiveTenantId,
    });
  }, [tenant, authTenant, effectiveTenantId]);

  const {
    businessHours,
    holidaySettings,
    updateBusinessHour,
    createHolidaySetting,
    updateHolidaySetting,
    deleteHolidaySetting,
  } = useBusinessHours(effectiveTenantId);
  
  // コンテキストからrefreshData関数を取得
  const { refreshData: refreshContextData } = useBusinessHoursContext();

  // サロン情報
  const [salonData, setSalonData] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
  });

  // テナントデータが読み込まれたら初期値を設定
  React.useEffect(() => {
    if (tenant) {
      setSalonData({
        name: tenant.name || '',
        phone_number: tenant.phone_number || '',
        email: tenant.email || '',
        address: tenant.address || '',
      });
    }
  }, [tenant]);

  // アカウント情報
  const [accountData, setAccountData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSalonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateTenant.mutateAsync(salonData);
      toast.success('サロン情報を更新しました');
    } catch {
      toast.error('サロン情報の更新に失敗しました');
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountData.newPassword !== accountData.confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }

    // 開発環境では実際の更新はスキップ
    if (import.meta.env.DEV) {
      toast.success('アカウント情報を更新しました');
      return;
    }

    // TODO: 実際のパスワード更新処理
  };

  const tabs = [
    { id: 'salon', label: 'サロン情報', icon: Store },
    { id: 'plan', label: 'プラン・利用状況', icon: Crown },
    { id: 'account', label: 'アカウント', icon: User },
    { id: 'api', label: 'API連携', icon: LinkIcon },
    { id: 'reminders', label: 'リマインダー', icon: Bell },
    { id: 'business_hours', label: '営業時間・休日', icon: Calendar },
    { id: 'notifications', label: '通知設定', icon: Bell },
    { id: 'security', label: 'セキュリティ', icon: Shield },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="mt-1 text-sm text-gray-600">
          サロンの各種設定を管理します
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | 'salon'
                      | 'plan'
                      | 'account'
                      | 'api'
                      | 'reminders'
                      | 'business_hours'
                      | 'notifications'
                      | 'security'
                  )
                }
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* サロン情報タブ */}
      {activeTab === 'salon' && (
        <Card>
          <h2 className="text-lg font-medium text-gray-900 mb-6">サロン情報</h2>
          <form onSubmit={handleSalonSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  サロン名
                </label>
                <Input
                  type="text"
                  value={salonData.name}
                  onChange={(e) =>
                    setSalonData({ ...salonData, name: e.target.value })
                  }
                  placeholder="美容室サンプル"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <Input
                  type="tel"
                  value={salonData.phone_number}
                  onChange={(e) =>
                    setSalonData({ ...salonData, phone_number: e.target.value })
                  }
                  placeholder="03-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <Input
                  type="email"
                  value={salonData.email}
                  onChange={(e) =>
                    setSalonData({ ...salonData, email: e.target.value })
                  }
                  placeholder="salon@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  住所
                </label>
                <Input
                  type="text"
                  value={salonData.address}
                  onChange={(e) =>
                    setSalonData({ ...salonData, address: e.target.value })
                  }
                  placeholder="東京都渋谷区..."
                />
              </div>

              {/* クイックアクション */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  クイックアクション
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/settings/menus"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          メニュー管理
                        </div>
                        <div className="text-xs text-gray-500">
                          施術メニューの追加・編集
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </Link>
                  <Link
                    to="/reports/sales"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <BarChart3 className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          売上レポート
                        </div>
                        <div className="text-xs text-gray-500">
                          売上データの分析・確認
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </Link>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={updateTenant.isPending}>
                  保存する
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* プラン・利用状況タブ */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* 現在のプラン情報 */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl">
                  <Crown className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    現在のプラン
                  </h2>
                  <p className="text-sm text-gray-600">ライトプラン</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">¥0</div>
                <div className="text-xs text-gray-500">/ 月</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    顧客登録
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900">100名まで</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Bell className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    月間予約
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900">50件まで</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                プラン特典
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">
                    基本的な顧客・予約管理
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">
                    簡易統計ダッシュボード
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">メール通知機能</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 利用状況 */}
          <PlanUsageCard />

          {/* プランアップグレード案内 */}
          <Card>
            <div className="text-center py-6">
              <div className="p-4 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full w-16 h-16 mx-auto mb-4">
                <Crown className="h-8 w-8 text-primary-600 mx-auto mt-2" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                さらなる機能をお探しですか？
              </h3>
              <p className="text-gray-600 mb-4">
                スタンダードプランでは月間500件の予約管理、詳細分析機能、外部連携機能をご利用いただけます。
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">月間予約500件まで</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">詳細売上分析</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">LINE・Instagram連携</span>
                </div>
              </div>
              <Button className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600">
                スタンダードプランにアップグレード
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* アカウントタブ */}
      {activeTab === 'account' && (
        <Card>
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            アカウント設定
          </h2>
          <form onSubmit={handleAccountSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <Input
                  type="email"
                  value={accountData.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <hr className="my-6" />

              <h3 className="text-sm font-medium text-gray-900">
                パスワード変更
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現在のパスワード
                </label>
                <Input
                  type="password"
                  value={accountData.currentPassword}
                  onChange={(e) =>
                    setAccountData({
                      ...accountData,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <Input
                  type="password"
                  value={accountData.newPassword}
                  onChange={(e) =>
                    setAccountData({
                      ...accountData,
                      newPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認）
                </label>
                <Input
                  type="password"
                  value={accountData.confirmPassword}
                  onChange={(e) =>
                    setAccountData({
                      ...accountData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div className="pt-4">
                <Button type="submit">パスワードを変更</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* 通知設定タブ */}
      {activeTab === 'notifications' && (
        <Card>
          <h2 className="text-lg font-medium text-gray-900 mb-6">通知設定</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  予約リマインダー
                </h3>
                <p className="text-sm text-gray-500">
                  予約の前日にメールで通知します
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  新規予約通知
                </h3>
                <p className="text-sm text-gray-500">
                  新しい予約が入った時にメールで通知します
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  月次レポート
                </h3>
                <p className="text-sm text-gray-500">
                  月末に売上レポートをメールで送信します
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* API連携タブ */}
      {activeTab === 'api' && <ApiIntegrationSettings />}

      {/* リマインダータブ */}
      {activeTab === 'reminders' && <ReminderSettings />}

      {/* 営業時間・休日タブ */}
      {activeTab === 'business_hours' && (
        <HolidaySettingsCard
          holidays={holidaySettings}
          businessHours={businessHours}
          onAddHoliday={async (holiday) => {
            console.log('Adding holiday with tenant ID:', effectiveTenantId);
            console.log('Holiday data:', holiday);

            if (!effectiveTenantId) {
              toast.error(
                'テナント情報が取得できません。ページを更新してください。'
              );
              return;
            }

            const result = await createHolidaySetting(holiday);
            if (!result.success) {
              console.error('Holiday creation failed:', result.error);
              toast.error(result.error || '休日設定の追加に失敗しました');
            } else {
              toast.success('休日設定を追加しました');
              // コンテキストをリフレッシュして予約画面に反映
              await refreshContextData();
            }
          }}
          onUpdateHoliday={async (id, holiday) => {
            const success = await updateHolidaySetting(id, holiday);
            if (success) {
              toast.success('休日設定を更新しました');
              // コンテキストをリフレッシュして予約画面に反映
              await refreshContextData();
            } else {
              toast.error('休日設定の更新に失敗しました');
            }
          }}
          onDeleteHoliday={async (id) => {
            const success = await deleteHolidaySetting(id);
            if (success) {
              toast.success('休日設定を削除しました');
              // コンテキストをリフレッシュして予約画面に反映
              await refreshContextData();
            } else {
              toast.error('休日設定の削除に失敗しました');
            }
          }}
          onUpdateBusinessHours={async (dayOfWeek, hours) => {
            const success = await updateBusinessHour(dayOfWeek, hours);
            if (success) {
              toast.success('営業時間を更新しました');
              // コンテキストをリフレッシュして予約画面に反映
              await refreshContextData();
            } else {
              toast.error('営業時間の更新に失敗しました');
            }
          }}
        />
      )}

      {/* セキュリティタブ */}
      {activeTab === 'security' && (
        <Card>
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            セキュリティ設定
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                ログイン履歴
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  最終ログイン: {new Date().toLocaleString('ja-JP')}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                データのエクスポート
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                全ての顧客データと予約データをCSV形式でダウンロードできます
              </p>
              <Button variant="secondary">データをエクスポート</Button>
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-sm font-medium text-red-600 mb-2">
                危険な操作
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                アカウントと全てのデータを削除します。この操作は取り消せません。
              </p>
              <Button
                variant="secondary"
                className="text-red-600 hover:text-red-700"
              >
                アカウントを削除
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
