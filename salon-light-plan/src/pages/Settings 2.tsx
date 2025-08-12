import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { supabase } from '../lib/supabase';
import {
  Settings as SettingsIcon,
  User,
  CreditCard,
  Bell,
  Save,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TenantSettings {
  name: string;
  address?: string;
  phone_number?: string;
  email?: string;
  business_hours?: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
}

interface UserSettings {
  name: string;
  email: string;
  phone_number?: string;
}

const Settings: React.FC = () => {
  const { user, tenant } = useAuth();
  const { plan, limits, usage } = usePlan();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
    name: '',
    address: '',
    phone_number: '',
    email: '',
    business_hours: {
      monday: { open: '09:00', close: '20:00', closed: false },
      tuesday: { open: '09:00', close: '20:00', closed: false },
      wednesday: { open: '09:00', close: '20:00', closed: false },
      thursday: { open: '09:00', close: '20:00', closed: false },
      friday: { open: '09:00', close: '20:00', closed: false },
      saturday: { open: '09:00', close: '20:00', closed: false },
      sunday: { open: '09:00', close: '20:00', closed: true },
    },
  });
  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone_number: '',
  });

  const tabs = [
    { id: 'general', name: '一般設定', icon: SettingsIcon },
    { id: 'user', name: 'ユーザー設定', icon: User },
    { id: 'plan', name: 'プラン・料金', icon: CreditCard },
    { id: 'notifications', name: '通知設定', icon: Bell },
  ];

  useEffect(() => {
    if (tenant && user) {
      loadSettings();
    }
  }, [tenant, user]);

  const loadSettings = async () => {
    if (!tenant || !user) return;

    // テナント設定の読み込み
    setTenantSettings({
      name: tenant.name,
      address: tenant.address || '',
      phone_number: tenant.phone_number || '',
      email: '',
      business_hours: tenantSettings.business_hours,
    });

    // ユーザー設定の読み込み
    const { data: userData } = await supabase
      .from('users')
      .select('name, email, phone_number')
      .eq('id', user.id)
      .single();

    if (userData) {
      setUserSettings({
        name: userData.name || '',
        email: userData.email || user.email || '',
        phone_number: userData.phone_number || '',
      });
    }
  };

  const saveTenantSettings = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: tenantSettings.name,
          address: tenantSettings.address,
          phone_number: tenantSettings.phone_number,
          email: tenantSettings.email,
          business_hours: tenantSettings.business_hours,
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success('設定を保存しました');
    } catch (error) {
      console.error('設定保存エラー:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveUserSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: userSettings.name,
          phone_number: userSettings.phone_number,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('ユーザー設定を保存しました');
    } catch (error) {
      console.error('ユーザー設定保存エラー:', error);
      toast.error('ユーザー設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatPlanLimit = (limit: number | null) => {
    return limit === null ? '無制限' : limit.toLocaleString();
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">設定</h1>

        <div className="mt-6">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <tab.icon
                      className={`
                        -ml-0.5 mr-2 h-5 w-5
                        ${
                          activeTab === tab.id
                            ? 'text-indigo-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }
                      `}
                    />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {activeTab === 'general' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">一般設定</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">
                    店舗名
                  </label>
                  <input
                    type="text"
                    id="tenant-name"
                    value={tenantSettings.name}
                    onChange={(e) =>
                      setTenantSettings({ ...tenantSettings, name: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    住所
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={tenantSettings.address}
                    onChange={(e) =>
                      setTenantSettings({ ...tenantSettings, address: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="tenant-phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      電話番号
                    </label>
                    <input
                      type="tel"
                      id="tenant-phone"
                      value={tenantSettings.phone_number}
                      onChange={(e) =>
                        setTenantSettings({ ...tenantSettings, phone_number: e.target.value })
                      }
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tenant-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      id="tenant-email"
                      value={tenantSettings.email}
                      onChange={(e) =>
                        setTenantSettings({ ...tenantSettings, email: e.target.value })
                      }
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveTenantSettings}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">ユーザー設定</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
                    名前
                  </label>
                  <input
                    type="text"
                    id="user-name"
                    value={userSettings.name}
                    onChange={(e) => setUserSettings({ ...userSettings, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="user-email" className="block text-sm font-medium text-gray-700">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="user-email"
                    value={userSettings.email}
                    disabled
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    メールアドレスは変更できません
                  </p>
                </div>

                <div>
                  <label htmlFor="user-phone" className="block text-sm font-medium text-gray-700">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    id="user-phone"
                    value={userSettings.phone_number}
                    onChange={(e) =>
                      setUserSettings({ ...userSettings, phone_number: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveUserSettings}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">プラン・料金</h2>
              
              <div className="mb-8">
                <div className="bg-indigo-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-indigo-900">
                        現在のプラン: {plan === 'light' ? 'ライトプラン' : plan === 'standard' ? 'スタンダードプラン' : 'プレミアムプラン'}
                      </h3>
                      <p className="mt-1 text-sm text-indigo-700">
                        月額: {plan === 'light' ? '¥0' : plan === 'standard' ? '¥5,000' : '¥10,000'}
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4">現在の使用状況</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">顧客数</span>
                        <span className="font-medium">
                          {usage.customerCount} / {formatPlanLimit(limits.customers)}
                        </span>
                      </div>
                      <div className="mt-2 relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                          <div
                            style={{
                              width: limits.customers
                                ? `${(usage.customerCount / limits.customers) * 100}%`
                                : '0%',
                            }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">月間予約数</span>
                        <span className="font-medium">
                          {usage.monthlyReservationCount} / {formatPlanLimit(limits.monthlyReservations)}
                        </span>
                      </div>
                      <div className="mt-2 relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                          <div
                            style={{
                              width: limits.monthlyReservations
                                ? `${(usage.monthlyReservationCount / limits.monthlyReservations) * 100}%`
                                : '0%',
                            }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {plan !== 'premium' && (
                  <div className="pt-6 border-t border-gray-200">
                    <div className="rounded-md bg-blue-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            プランのアップグレード
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              より多くの機能と容量が必要な場合は、上位プランへのアップグレードをご検討ください。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">通知設定</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">予約通知</h3>
                    <p className="text-sm text-gray-500">新しい予約が入った時に通知を受け取る</p>
                  </div>
                  <button
                    type="button"
                    className="bg-indigo-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">顧客登録通知</h3>
                    <p className="text-sm text-gray-500">新規顧客が登録された時に通知を受け取る</p>
                  </div>
                  <button
                    type="button"
                    className="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">売上通知</h3>
                    <p className="text-sm text-gray-500">日次売上レポートを受け取る</p>
                  </div>
                  <button
                    type="button"
                    className="bg-indigo-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;