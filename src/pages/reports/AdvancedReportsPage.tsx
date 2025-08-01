import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  UserGroupIcon,
  CurrencyYenIcon,
  SparklesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  CalendarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Crown, TrendingUp, Users, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'react-hot-toast';
import { animations } from '../../styles/design-system';
import {
  AdvancedReportingService,
  CustomerLifetimeValue,
  ServiceAnalytics,
  StaffPerformanceMetrics,
  RevenueTrend,
} from '../../services/advanced-reporting-service';
import { useAuth } from '../../hooks/useAuth';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export default function AdvancedReportsPage() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clv' | 'service' | 'staff' | 'revenue'>('clv');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // レポートデータ
  const [clvData, setClvData] = useState<CustomerLifetimeValue[]>([]);
  const [serviceData, setServiceData] = useState<ServiceAnalytics[]>([]);
  const [staffData, setStaffData] = useState<StaffPerformanceMetrics[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueTrend[]>([]);
  const [segmentStats, setSegmentStats] = useState<any[]>([]);

  const reportingService = tenant?.id ? new AdvancedReportingService(tenant.id) : null;

  useEffect(() => {
    if (reportingService) {
      loadReportData();
    }
  }, [tenant, dateRange]);

  const loadReportData = async () => {
    if (!reportingService) return;

    setLoading(true);
    try {
      const [clv, services, staff, revenue, segments] = await Promise.all([
        reportingService.getCustomerLifetimeValues(),
        reportingService.getServiceAnalytics({ startDate: dateRange.start, endDate: dateRange.end }),
        reportingService.getStaffPerformanceMetrics({ startDate: dateRange.start, endDate: dateRange.end }),
        reportingService.getRevenueTrends({ startDate: dateRange.start, endDate: dateRange.end }),
        reportingService.getCustomerSegmentStats(),
      ]);

      setClvData(clv);
      setServiceData(services);
      setStaffData(staff);
      setRevenueData(revenue);
      setSegmentStats(segments);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('レポートデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const refreshCLV = async () => {
    if (!reportingService) return;

    toast.loading('顧客生涯価値を再計算中...');
    try {
      await reportingService.calculateAllCustomerLifetimeValues();
      await loadReportData();
      toast.success('顧客生涯価値を更新しました');
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(value);
  };

  const getSegmentColor = (segment: string) => {
    const colors: Record<string, string> = {
      'VIP': '#3B82F6',
      'Regular': '#10B981',
      'New': '#F59E0B',
      'At-Risk': '#EF4444',
      'Lost': '#6B7280',
    };
    return colors[segment] || '#6B7280';
  };

  const tabs = [
    { id: 'clv', label: '顧客生涯価値', icon: UserGroupIcon },
    { id: 'service', label: 'サービス分析', icon: SparklesIcon },
    { id: 'staff', label: 'スタッフ分析', icon: Users },
    { id: 'revenue', label: '収益トレンド', icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">高度な分析レポート</h1>
        <p className="mt-1 text-sm text-gray-600">
          ビジネスインサイトと詳細な分析データ
        </p>
      </div>

      {/* 期間選択 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-500">〜</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {activeTab === 'clv' && (
          <button
            onClick={refreshCLV}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>CLV再計算</span>
          </button>
        )}
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
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
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

      {/* 顧客生涯価値（CLV）タブ */}
      {activeTab === 'clv' && (
        <div className="space-y-6">
          {/* セグメント別統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={animations.spring.gentle}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">顧客セグメント分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={segmentStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.segment}: ${entry.count}名`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {segmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSegmentColor(entry.segment)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value}名`} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ...animations.spring.gentle }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">セグメント別売上</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={segmentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" />
                  <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="totalRevenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* 顧客ランキング */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ...animations.spring.gentle }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">優良顧客ランキング</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">セグメント</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">総売上</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">来店回数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">平均単価</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">予測年間価値</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">離脱リスク</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clvData.slice(0, 10).map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.customerName || '名前未設定'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full text-white`}
                          style={{ backgroundColor: getSegmentColor(customer.customerSegment) }}>
                          {customer.customerSegment}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.totalVisits}回
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.averageOrderValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {formatCurrency(customer.projectedAnnualValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                customer.churnProbability > 0.7 ? 'bg-red-500' :
                                customer.churnProbability > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${customer.churnProbability * 100}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-gray-600">
                            {(customer.churnProbability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* サービス分析タブ */}
      {activeTab === 'service' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceData.slice(0, 6).map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900">{service.serviceName}</h4>
                  <span className={`text-sm ${
                    service.trend === 'rising' ? 'text-green-600' :
                    service.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {service.trend === 'rising' ? '↑' : service.trend === 'declining' ? '↓' : '→'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">予約数</span>
                    <span className="font-medium">{service.bookingCount}件</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">売上</span>
                    <span className="font-medium">{formatCurrency(service.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">リピート率</span>
                    <span className="font-medium">{(service.repeatRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">人気度スコア</span>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary-500"
                          style={{ width: `${service.popularityScore}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm">{service.popularityScore}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* スタッフ分析タブ */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={animations.spring.gentle}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">スタッフパフォーマンス</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スタッフ名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">完了予約</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">売上</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">稼働率</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">リピート率</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">新規獲得</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">生産性スコア</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {staffData.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staff.staffName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staff.completedAppointments}件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(staff.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${staff.utilizationRate * 100}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs">{(staff.utilizationRate * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(staff.repeatCustomerRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staff.newCustomerCount}名
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          staff.productivityScore >= 80 ? 'bg-green-100 text-green-800' :
                          staff.productivityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {staff.productivityScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* 収益トレンドタブ */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={animations.spring.gentle}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">日別収益推移</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} />
                <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                />
                <Legend />
                <Line type="monotone" dataKey="dailyRevenue" stroke="#3B82F6" name="総売上" strokeWidth={2} />
                <Line type="monotone" dataKey="newCustomerRevenue" stroke="#10B981" name="新規顧客" strokeWidth={2} />
                <Line type="monotone" dataKey="repeatCustomerRevenue" stroke="#F59E0B" name="リピート顧客" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* 収益サマリー */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                label: '期間総売上',
                value: formatCurrency(revenueData.reduce((sum, d) => sum + d.dailyRevenue, 0)),
                icon: CurrencyYenIcon,
                color: 'bg-blue-100 text-blue-600',
              },
              {
                label: '平均客単価',
                value: formatCurrency(
                  revenueData.reduce((sum, d) => sum + d.averageTicketSize, 0) / revenueData.length || 0
                ),
                icon: DollarSign,
                color: 'bg-green-100 text-green-600',
              },
              {
                label: '新規顧客売上比率',
                value: `${(
                  (revenueData.reduce((sum, d) => sum + d.newCustomerRevenue, 0) /
                    revenueData.reduce((sum, d) => sum + d.dailyRevenue, 0) || 0) * 100
                ).toFixed(1)}%`,
                icon: UserGroupIcon,
                color: 'bg-yellow-100 text-yellow-600',
              },
              {
                label: '総予約数',
                value: `${revenueData.reduce((sum, d) => sum + d.appointmentCount, 0)}件`,
                icon: CalendarIcon,
                color: 'bg-purple-100 text-purple-600',
              },
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}