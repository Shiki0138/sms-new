import React, { useState, useEffect } from 'react';
import { Users, Crown, Star, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import PlanRestrictionWrapper from '../components/PlanRestrictionWrapper';
import { api } from '../services/api';

interface MembershipTier {
  id: number;
  name: string;
  description: string;
  monthly_price: number;
  benefits: string[];
  discount_percentage: number;
  priority_booking: boolean;
  active_members: number;
}

interface CustomerMembership {
  id: number;
  customer_id: number;
  tier_name: string;
  status: string;
  start_date: string;
  next_billing_date: string;
  auto_renew: boolean;
}

const Memberships: React.FC = () => {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customerMembership, setCustomerMembership] = useState<CustomerMembership | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [newTier, setNewTier] = useState({
    name: '',
    description: '',
    monthly_price: 0,
    benefits: [''],
    discount_percentage: 0,
    priority_booking: false
  });

  const fetchTiers = async () => {
    try {
      const response = await api.get('/memberships/tiers');
      setTiers(response.data);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  };

  const fetchCustomerMembership = async (customerId: number) => {
    try {
      const response = await api.get(`/memberships/customers/${customerId}`);
      setCustomerMembership(response.data[0] || null);
    } catch (error) {
      console.error('Error fetching customer membership:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/memberships/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createTier = async () => {
    try {
      await api.post('/memberships/tiers', newTier);
      setShowCreateTier(false);
      fetchTiers();
      setNewTier({
        name: '',
        description: '',
        monthly_price: 0,
        benefits: [''],
        discount_percentage: 0,
        priority_booking: false
      });
    } catch (error) {
      console.error('Error creating tier:', error);
    }
  };

  const subscribeMember = async (customerId: number, tierId: number) => {
    try {
      await api.post(`/memberships/customers/${customerId}/subscribe`, {
        tier_id: tierId,
        payment_method: 'credit_card',
        auto_renew: true
      });
      fetchCustomerMembership(customerId);
    } catch (error) {
      console.error('Error subscribing member:', error);
    }
  };

  const cancelMembership = async (customerId: number) => {
    try {
      await api.put(`/memberships/customers/${customerId}/cancel`);
      fetchCustomerMembership(customerId);
    } catch (error) {
      console.error('Error cancelling membership:', error);
    }
  };

  useEffect(() => {
    fetchTiers();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerMembership(selectedCustomer);
    }
  }, [selectedCustomer]);

  return (
    <PlanRestrictionWrapper feature="membership_management" requiredPlan="standard">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">会員管理</h1>
          <p className="text-gray-600 dark:text-gray-400">
            月額制の会員プログラムで安定した収益を確保します
          </p>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">アクティブ</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.active_memberships || 0}</p>
            <p className="text-sm text-gray-600">会員数</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">月額</span>
            </div>
            <p className="text-2xl font-bold">¥{analytics?.monthlyRecurringRevenue || 0}</p>
            <p className="text-sm text-gray-600">継続収益</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">継続率</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.retentionRate || 0}%</p>
            <p className="text-sm text-gray-600">会員継続率</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Crown className="w-8 h-8 text-yellow-600" />
              <span className="text-sm text-gray-500">収益</span>
            </div>
            <p className="text-2xl font-bold">¥{analytics?.metrics?.total_revenue || 0}</p>
            <p className="text-sm text-gray-600">総収益</p>
          </div>
        </div>

        {/* Membership Tiers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">会員プラン</h2>
            <button
              onClick={() => setShowCreateTier(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              新規プラン作成
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {tiers.map((tier) => (
              <div key={tier.id} className="border dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  {tier.priority_booking && (
                    <Star className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {tier.description}
                </p>
                
                <div className="mb-4">
                  <p className="text-3xl font-bold text-blue-600">
                    ¥{tier.monthly_price.toLocaleString()}
                    <span className="text-sm text-gray-500 font-normal">/月</span>
                  </p>
                </div>

                <div className="mb-4">
                  <p className="font-semibold mb-2">特典:</p>
                  <ul className="text-sm space-y-1">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-600">
                    アクティブ会員: <span className="font-semibold">{tier.active_members}名</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Membership Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold">顧客会員管理</h2>
          </div>
          
          <div className="p-6">
            <select
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-4"
              onChange={(e) => setSelectedCustomer(parseInt(e.target.value) || null)}
            >
              <option value="">顧客を選択してください</option>
              <option value="1">山田 花子</option>
              <option value="2">佐藤 太郎</option>
              <option value="3">鈴木 美咲</option>
            </select>

            {selectedCustomer && (
              <div>
                {customerMembership ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{customerMembership.tier_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        customerMembership.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {customerMembership.status === 'active' ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">開始日</p>
                        <p className="font-medium">{customerMembership.start_date}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">次回請求日</p>
                        <p className="font-medium">{customerMembership.next_billing_date}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">自動更新</p>
                        <p className="font-medium">{customerMembership.auto_renew ? 'ON' : 'OFF'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => cancelMembership(selectedCustomer)}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      会員をキャンセル
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-600 mb-4">この顧客はまだ会員登録していません</p>
                    {tiers.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => subscribeMember(selectedCustomer, tier.id)}
                        className="w-full p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                      >
                        <span className="font-medium">{tier.name}</span>に登録
                        <span className="text-gray-600 ml-2">
                          (¥{tier.monthly_price.toLocaleString()}/月)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Tier Modal */}
        {showCreateTier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">新規会員プラン作成</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">プラン名</label>
                  <input
                    type="text"
                    value={newTier.name}
                    onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">説明</label>
                  <textarea
                    value={newTier.description}
                    onChange={(e) => setNewTier({ ...newTier, description: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">月額料金</label>
                  <input
                    type="number"
                    value={newTier.monthly_price}
                    onChange={(e) => setNewTier({ ...newTier, monthly_price: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">割引率 (%)</label>
                  <input
                    type="number"
                    value={newTier.discount_percentage}
                    onChange={(e) => setNewTier({ ...newTier, discount_percentage: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newTier.priority_booking}
                      onChange={(e) => setNewTier({ ...newTier, priority_booking: e.target.checked })}
                      className="mr-2"
                    />
                    優先予約
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={createTier}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  作成
                </button>
                <button
                  onClick={() => setShowCreateTier(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlanRestrictionWrapper>
  );
};

export default Memberships;