import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, CheckCircle, XCircle, Brain } from 'lucide-react';
import PlanRestrictionWrapper from '../components/PlanRestrictionWrapper';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

interface UpsellingSuggestion {
  id: number;
  service_name: string;
  service_description: string;
  reason: string;
  confidence_score: number;
  potential_revenue: number;
  status?: 'pending' | 'accepted' | 'rejected';
}

const Upselling: React.FC = () => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<UpsellingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchSuggestions = async (customerId: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/upselling/suggestions/${customerId}`);
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSuggestionStatus = async (suggestionId: number, status: 'accepted' | 'rejected') => {
    try {
      await api.put(`/upselling/suggestions/${suggestionId}`, { status });
      // Update local state
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, status } : s)
      );
    } catch (error) {
      console.error('Error updating suggestion:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/upselling/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <PlanRestrictionWrapper feature="smart_upselling" requiredPlan="standard">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">スマートアップセリング</h1>
          <p className="text-gray-600 dark:text-gray-400">
            AIが顧客の購買履歴を分析し、最適なサービスを提案します
          </p>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">今月</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.total_suggestions || 0}</p>
            <p className="text-sm text-gray-600">提案数</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">成功率</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.metrics?.conversionRate || '0%'}</p>
            <p className="text-sm text-gray-600">承認率</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <span className="text-sm text-gray-500">収益</span>
            </div>
            <p className="text-2xl font-bold">¥{analytics?.metrics?.realized_revenue || 0}</p>
            <p className="text-sm text-gray-600">実現収益</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">潜在</span>
            </div>
            <p className="text-2xl font-bold">¥{analytics?.metrics?.total_potential_revenue || 0}</p>
            <p className="text-sm text-gray-600">潜在収益</p>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">顧客を選択</h2>
          <select
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            onChange={(e) => {
              const customerId = parseInt(e.target.value);
              setSelectedCustomer(customerId);
              if (customerId) fetchSuggestions(customerId);
            }}
          >
            <option value="">顧客を選択してください</option>
            <option value="1">山田 花子</option>
            <option value="2">佐藤 太郎</option>
            <option value="3">鈴木 美咲</option>
          </select>
        </div>

        {/* Suggestions List */}
        {selectedCustomer && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">AI提案サービス</h2>
            </div>
            
            {loading ? (
              <div className="p-6 text-center">
                <p>分析中...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="divide-y dark:divide-gray-700">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {suggestion.service_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {suggestion.service_description}
                        </p>
                        <div className="mb-3">
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            <Brain className="inline w-4 h-4 mr-1" />
                            {suggestion.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center">
                            <span className="font-medium">信頼度:</span>
                            <span className="ml-2 text-green-600">
                              {(suggestion.confidence_score * 100).toFixed(0)}%
                            </span>
                          </span>
                          <span className="flex items-center">
                            <span className="font-medium">予想収益:</span>
                            <span className="ml-2 text-blue-600">
                              ¥{suggestion.potential_revenue.toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>

                      {!suggestion.status && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.id, 'accepted')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="承認"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="却下"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}

                      {suggestion.status && (
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          suggestion.status === 'accepted' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {suggestion.status === 'accepted' ? '承認済み' : '却下済み'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                提案がありません
              </div>
            )}
          </div>
        )}
      </div>
    </PlanRestrictionWrapper>
  );
};

export default Upselling;