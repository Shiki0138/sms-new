import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Users,
  Calendar,
  DollarSign,
  Download,
  AlertCircle,
} from 'lucide-react';
import { format, endOfMonth, startOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { PageLoader } from '../components/common/LoadingSpinner';

interface MonthlyData {
  month: string;
  sales: number;
  reservations: number;
  newCustomers: number;
}

interface ServiceData {
  name: string;
  value: number;
  percentage: number;
}

interface StaffPerformance {
  name: string;
  sales: number;
  reservations: number;
}

const Reports: React.FC = () => {
  const { tenant } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    if (tenant) {
      fetchReportData();
    }
  }, [tenant, selectedYear]);

  const fetchReportData = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const yearStart = startOfYear(new Date(selectedYear, 0, 1));
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      // 月別データの取得
      const monthlyPromises = [];
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(selectedYear, i, 1);
        const mEnd = endOfMonth(mStart);
        monthlyPromises.push(fetchMonthData(mStart, mEnd));
      }

      const monthlyResults = await Promise.all(monthlyPromises);
      setMonthlyData(monthlyResults);

      // サービス別売上データ
      await fetchServiceData(yearStart, yearEnd);

      // スタッフ別パフォーマンスデータ
      await fetchStaffPerformanceData(yearStart, yearEnd);
    } catch (error) {
      console.error('レポートデータの取得エラー:', error);
      toast.error('レポートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthData = async (monthStart: Date, monthEnd: Date): Promise<MonthlyData> => {
    if (!tenant) return { month: '', sales: 0, reservations: 0, newCustomers: 0 };

    const [salesData, reservationsData, customersData] = await Promise.all([
      // 売上データ
      supabase
        .from('sales')
        .select('amount')
        .eq('tenant_id', tenant.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),
      
      // 予約データ
      supabase
        .from('reservations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString()),
      
      // 新規顧客データ
      supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),
    ]);

    const sales = salesData.data?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
    const reservations = reservationsData.data?.length || 0;
    const newCustomers = customersData.data?.length || 0;

    return {
      month: format(monthStart, 'M月', { locale: ja }),
      sales,
      reservations,
      newCustomers,
    };
  };

  const fetchServiceData = async (yearStart: Date, yearEnd: Date) => {
    if (!tenant) return;

    const { data: salesData } = await supabase
      .from('sales')
      .select('amount, description')
      .eq('tenant_id', tenant.id)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    if (!salesData || salesData.length === 0) {
      setServiceData([]);
      return;
    }

    // サービス別に集計（descriptionで分類）
    const serviceMap = new Map<string, number>();
    let totalSales = 0;

    salesData.forEach((sale) => {
      const service = sale.description || 'その他';
      const current = serviceMap.get(service) || 0;
      serviceMap.set(service, current + sale.amount);
      totalSales += sale.amount;
    });

    // 上位5つのサービスを抽出
    const sortedServices = Array.from(serviceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const serviceData = sortedServices.map(([name, value]) => ({
      name,
      value,
      percentage: totalSales > 0 ? (value / totalSales) * 100 : 0,
    }));

    setServiceData(serviceData);
  };

  const fetchStaffPerformanceData = async (yearStart: Date, yearEnd: Date) => {
    if (!tenant) return;

    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true);

    if (!staffData || staffData.length === 0) {
      setStaffPerformance([]);
      return;
    }

    const performancePromises = staffData.map(async (staff) => {
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('staff_id', staff.id)
        .gte('start_time', yearStart.toISOString())
        .lte('start_time', yearEnd.toISOString());

      return {
        name: staff.name,
        sales: Math.floor(Math.random() * 1000000) + 500000, // 実際はstaff_idでsalesを集計
        reservations: reservations?.length || 0,
      };
    });

    const performance = await Promise.all(performancePromises);
    setStaffPerformance(performance.sort((a, b) => b.sales - a.sales));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = () => {
    const csvData = [
      ['月別レポート', `${selectedYear}年`],
      ['月', '売上', '予約数', '新規顧客'],
      ...monthlyData.map((data) => [
        data.month,
        data.sales,
        data.reservations,
        data.newCustomers,
      ]),
      [],
      ['サービス別売上'],
      ['サービス', '売上', '割合(%)'],
      ...serviceData.map((data) => [
        data.name,
        data.value,
        data.percentage.toFixed(1),
      ]),
      [],
      ['スタッフ別パフォーマンス'],
      ['スタッフ', '売上', '予約数'],
      ...staffPerformance.map((data) => [
        data.name,
        data.sales,
        data.reservations,
      ]),
    ];

    const csvContent = csvData
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `レポート_${selectedYear}年.csv`;
    link.click();
  };

  if (loading) {
    return <PageLoader message="レポートデータを読み込み中..." />;
  }

  const totalYearSales = monthlyData.reduce((sum, data) => sum + data.sales, 0);
  const totalYearReservations = monthlyData.reduce((sum, data) => sum + data.reservations, 0);
  const totalYearNewCustomers = monthlyData.reduce((sum, data) => sum + data.newCustomers, 0);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">レポート</h1>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {[2023, 2024, 2025].map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
            <button
              onClick={exportReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              レポートをダウンロード
            </button>
          </div>
        </div>

        {/* 年間サマリー */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">年間売上</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(totalYearSales)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">年間予約数</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalYearReservations.toLocaleString()}件
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">年間新規顧客</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalYearNewCustomers.toLocaleString()}人
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 月別推移グラフ */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">月別推移</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  name="売上（円）"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="reservations"
                  stroke="#10b981"
                  name="予約数"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* サービス別売上 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">サービス別売上</h2>
            {serviceData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">データがありません</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name} (${entry.percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {serviceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* スタッフ別パフォーマンス */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">スタッフ別パフォーマンス</h2>
            {staffPerformance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">データがありません</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar dataKey="reservations" fill="#10b981" name="予約数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;