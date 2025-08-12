import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { SalesForm } from '../components/sales/SalesForm';
import { PageLoader } from '../components/common/LoadingSpinner';

interface Sale {
  id: string;
  customer_id: string;
  reservation_id?: string;
  amount: number;
  payment_method: 'cash' | 'credit' | 'other';
  description?: string;
  created_at: string;
  customers?: {
    name: string;
  };
  reservations?: {
    start_time: string;
  };
}

interface MonthlySummary {
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  previousMonthSales: number;
  growthRate: number;
}

const Sales: React.FC = () => {
  const { tenant } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
    totalSales: 0,
    transactionCount: 0,
    averageTransaction: 0,
    previousMonthSales: 0,
    growthRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (tenant) {
      fetchSalesData();
    }
  }, [tenant, selectedMonth]);

  const fetchSalesData = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const previousMonthStart = startOfMonth(subMonths(selectedMonth, 1));
      const previousMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

      // 当月の売上データ
      const { data: currentSales, error: currentError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (
            name
          ),
          reservations (
            start_time
          )
        `)
        .eq('tenant_id', tenant.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      if (currentError) throw currentError;

      // 前月の売上合計
      const { data: previousSales, error: previousError } = await supabase
        .from('sales')
        .select('amount')
        .eq('tenant_id', tenant.id)
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString());

      if (previousError) throw previousError;

      const totalSales = currentSales?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
      const previousTotal = previousSales?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
      const transactionCount = currentSales?.length || 0;
      const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;
      const growthRate = previousTotal > 0 ? ((totalSales - previousTotal) / previousTotal) * 100 : 0;

      setSales(currentSales || []);
      setMonthlySummary({
        totalSales,
        transactionCount,
        averageTransaction,
        previousMonthSales: previousTotal,
        growthRate,
      });
    } catch (error) {
      console.error('売上データの取得エラー:', error);
      toast.error('売上データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return '現金';
      case 'credit':
        return 'クレジットカード';
      default:
        return 'その他';
    }
  };

  const exportToCSV = () => {
    const headers = ['日付', '顧客名', '金額', '支払方法', '説明'];
    const rows = sales.map((sale) => [
      format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm'),
      sale.customers?.name || '',
      sale.amount,
      getPaymentMethodLabel(sale.payment_method),
      sale.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `売上データ_${format(selectedMonth, 'yyyy年MM月')}.csv`;
    link.click();
  };

  if (loading) {
    return <PageLoader message="売上データを読み込み中..." />;
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">売上管理</h1>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              CSVエクスポート
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              売上登録
            </button>
          </div>
        </div>

        {/* 月選択 */}
        <div className="mt-6 flex items-center space-x-4">
          <label htmlFor="month" className="text-sm font-medium text-gray-700">
            対象月:
          </label>
          <input
            type="month"
            id="month"
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={(e) => setSelectedMonth(new Date(e.target.value))}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* サマリーカード */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      月間売上
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(monthlySummary.totalSales)}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      取引件数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {monthlySummary.transactionCount}件
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
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      平均単価
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(monthlySummary.averageTransaction)}
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
                  {monthlySummary.growthRate >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      前月比
                    </dt>
                    <dd
                      className={`text-lg font-medium ${
                        monthlySummary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {monthlySummary.growthRate > 0 ? '+' : ''}
                      {monthlySummary.growthRate.toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 売上一覧 */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                {sales.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">売上データがありません</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      この月の売上データは登録されていません。
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          日時
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          顧客
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          金額
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          支払方法
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          説明
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(sale.created_at), 'M月d日 HH:mm', { locale: ja })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.customers?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(sale.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {getPaymentMethodLabel(sale.payment_method)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {sale.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 売上登録モーダル */}
        <SalesForm
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchSalesData}
        />
      </div>
    </div>
  );
};

export default Sales;