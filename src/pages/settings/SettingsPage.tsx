import React, { useState } from 'react';
import { User, Store, Bell, Shield, Package, ExternalLink, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useUpdateTenant } from '../../hooks/useUpdateTenant';
import { toast } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const updateTenant = useUpdateTenant();
  const [activeTab, setActiveTab] = useState<'salon' | 'account' | 'notifications' | 'security'>('salon');

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
    } catch (error) {
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
    { id: 'account', label: 'アカウント', icon: User },
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
                onClick={() => setActiveTab(tab.id as any)}
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
                  onChange={(e) => setSalonData({ ...salonData, name: e.target.value })}
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
                  onChange={(e) => setSalonData({ ...salonData, phone_number: e.target.value })}
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
                  onChange={(e) => setSalonData({ ...salonData, email: e.target.value })}
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
                  onChange={(e) => setSalonData({ ...salonData, address: e.target.value })}
                  placeholder="東京都渋谷区..."
                />
              </div>

              {/* クイックアクション */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-4">クイックアクション</h3>
                <div className="space-y-3">
                  <Link
                    to="/settings/menus"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">メニュー管理</div>
                        <div className="text-xs text-gray-500">施術メニューの追加・編集</div>
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
                        <div className="text-sm font-medium text-gray-900">売上レポート</div>
                        <div className="text-xs text-gray-500">売上データの分析・確認</div>
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

      {/* アカウントタブ */}
      {activeTab === 'account' && (
        <Card>
          <h2 className="text-lg font-medium text-gray-900 mb-6">アカウント設定</h2>
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

              <h3 className="text-sm font-medium text-gray-900">パスワード変更</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現在のパスワード
                </label>
                <Input
                  type="password"
                  value={accountData.currentPassword}
                  onChange={(e) => setAccountData({ ...accountData, currentPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <Input
                  type="password"
                  value={accountData.newPassword}
                  onChange={(e) => setAccountData({ ...accountData, newPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認）
                </label>
                <Input
                  type="password"
                  value={accountData.confirmPassword}
                  onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <Button type="submit">
                  パスワードを変更
                </Button>
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
                <h3 className="text-sm font-medium text-gray-900">予約リマインダー</h3>
                <p className="text-sm text-gray-500">予約の前日にメールで通知します</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">新規予約通知</h3>
                <p className="text-sm text-gray-500">新しい予約が入った時にメールで通知します</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">月次レポート</h3>
                <p className="text-sm text-gray-500">月末に売上レポートをメールで送信します</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* セキュリティタブ */}
      {activeTab === 'security' && (
        <Card>
          <h2 className="text-lg font-medium text-gray-900 mb-6">セキュリティ設定</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">ログイン履歴</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">最終ログイン: {new Date().toLocaleString('ja-JP')}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">データのエクスポート</h3>
              <p className="text-sm text-gray-500 mb-3">
                全ての顧客データと予約データをCSV形式でダウンロードできます
              </p>
              <Button variant="secondary">
                データをエクスポート
              </Button>
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-sm font-medium text-red-600 mb-2">危険な操作</h3>
              <p className="text-sm text-gray-500 mb-3">
                アカウントと全てのデータを削除します。この操作は取り消せません。
              </p>
              <Button variant="secondary" className="text-red-600 hover:text-red-700">
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