import React, { useState, useEffect } from 'react';
import { Gift, Share2, Users, TrendingUp, Award, Send } from 'lucide-react';
import PlanRestrictionWrapper from '../components/PlanRestrictionWrapper';
import { api } from '../services/api';

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  rewards_earned: number;
  rewards_available: number;
}

interface Referral {
  id: number;
  referred_name: string;
  referred_phone?: string;
  status: 'pending' | 'converted' | 'expired';
  reward_value: number;
  conversion_date?: string;
  created_at: string;
}

const Referrals: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showCreateReferral, setShowCreateReferral] = useState(false);
  const [newReferral, setNewReferral] = useState({
    referred_name: '',
    referred_phone: '',
    referred_email: '',
    reward_type: 'discount',
    reward_value: 10
  });

  const fetchCustomerReferrals = async (customerId: number) => {
    try {
      const response = await api.get(`/referrals/customer/${customerId}`);
      setStats(response.data.stats);
      setReferralCode(response.data.referralCode);
      setShareUrl(response.data.shareUrl);
      setRecentReferrals(response.data.recentReferrals);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/referrals/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createReferral = async () => {
    if (!selectedCustomer) return;

    try {
      await api.post('/referrals/create', {
        referrer_id: selectedCustomer,
        ...newReferral
      });
      
      setShowCreateReferral(false);
      fetchCustomerReferrals(selectedCustomer);
      setNewReferral({
        referred_name: '',
        referred_phone: '',
        referred_email: '',
        reward_type: 'discount',
        reward_value: 10
      });
    } catch (error) {
      console.error('Error creating referral:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました！');
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerReferrals(selectedCustomer);
    }
  }, [selectedCustomer]);

  return (
    <PlanRestrictionWrapper feature="referral_tracking" requiredPlan="standard">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">紹介プログラム管理</h1>
          <p className="text-gray-600 dark:text-gray-400">
            顧客の紹介を追跡し、報酬を管理します
          </p>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Gift className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">総数</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.total_referrals || 0}</p>
            <p className="text-sm text-gray-600">紹介数</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">成功</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.successful_conversions || 0}</p>
            <p className="text-sm text-gray-600">成約数</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">成約率</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.conversionRate || '0%'}</p>
            <p className="text-sm text-gray-600">変換率</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-yellow-600" />
              <span className="text-sm text-gray-500">報酬</span>
            </div>
            <p className="text-2xl font-bold">¥{analytics?.metrics?.total_rewards_issued || 0}</p>
            <p className="text-sm text-gray-600">発行済み</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-indigo-600" />
              <span className="text-sm text-gray-500">紹介者</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.active_referrers || 0}</p>
            <p className="text-sm text-gray-600">アクティブ</p>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold">顧客を選択</h2>
          </div>
          <div className="p-6">
            <select
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              onChange={(e) => setSelectedCustomer(parseInt(e.target.value) || null)}
            >
              <option value="">顧客を選択してください</option>
              <option value="1">山田 花子</option>
              <option value="2">佐藤 太郎</option>
              <option value="3">鈴木 美咲</option>
            </select>
          </div>
        </div>

        {selectedCustomer && stats && (
          <>
            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">紹介統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">総紹介数</span>
                    <span className="font-semibold">{stats.total_referrals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">成功紹介</span>
                    <span className="font-semibold text-green-600">{stats.successful_referrals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">保留中</span>
                    <span className="font-semibold text-yellow-600">{stats.pending_referrals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">獲得報酬</span>
                    <span className="font-semibold">¥{stats.rewards_earned.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">利用可能報酬</span>
                    <span className="font-semibold text-blue-600">¥{stats.rewards_available.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">紹介コード</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">あなたの紹介コード</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-lg">
                        {referralCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(referralCode)}
                        className="p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2">共有URL</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCreateReferral(true)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    新規紹介を送信
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Referrals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold">最近の紹介</h3>
              </div>
              
              {recentReferrals.length > 0 ? (
                <div className="divide-y dark:divide-gray-700">
                  {recentReferrals.map((referral) => (
                    <div key={referral.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{referral.referred_name}</h4>
                          {referral.referred_phone && (
                            <p className="text-sm text-gray-600">{referral.referred_phone}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            紹介日: {new Date(referral.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            referral.status === 'converted' 
                              ? 'bg-green-100 text-green-700'
                              : referral.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {referral.status === 'converted' ? '成約' : 
                             referral.status === 'pending' ? '保留中' : '期限切れ'}
                          </span>
                          <p className="text-sm mt-2">
                            報酬: ¥{referral.reward_value.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  まだ紹介がありません
                </div>
              )}
            </div>
          </>
        )}

        {/* Create Referral Modal */}
        {showCreateReferral && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">新規紹介を送信</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">紹介者名 *</label>
                  <input
                    type="text"
                    value={newReferral.referred_name}
                    onChange={(e) => setNewReferral({ ...newReferral, referred_name: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={newReferral.referred_phone}
                    onChange={(e) => setNewReferral({ ...newReferral, referred_phone: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={newReferral.referred_email}
                    onChange={(e) => setNewReferral({ ...newReferral, referred_email: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">報酬タイプ</label>
                  <select
                    value={newReferral.reward_type}
                    onChange={(e) => setNewReferral({ ...newReferral, reward_type: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="discount">割引</option>
                    <option value="credit">クレジット</option>
                    <option value="service">サービス</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    報酬額 {newReferral.reward_type === 'discount' ? '(%)' : '(円)'}
                  </label>
                  <input
                    type="number"
                    value={newReferral.reward_value}
                    onChange={(e) => setNewReferral({ ...newReferral, reward_value: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={createReferral}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  送信
                </button>
                <button
                  onClick={() => setShowCreateReferral(false)}
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

export default Referrals;