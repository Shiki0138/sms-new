import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, Users, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useTreatmentRecords } from '../../hooks/useTreatmentRecords';

type ReportPeriod = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

const SalesReportPage: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { data: allTreatmentRecords } = useTreatmentRecords();

  // 期間の計算
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    
    switch (period) {
      case 'thisMonth':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          periodLabel: format(now, 'yyyy年M月', { locale: ja })
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
          periodLabel: format(lastMonth, 'yyyy年M月', { locale: ja })
        };
      case 'thisYear':
        return {
          startDate: format(startOfYear(now), 'yyyy-MM-dd'),
          endDate: format(endOfYear(now), 'yyyy-MM-dd'),
          periodLabel: format(now, 'yyyy年', { locale: ja })
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
          periodLabel: customStartDate && customEndDate 
            ? `${customStartDate} ～ ${customEndDate}`
            : 'カスタム期間'
        };
      default:
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          periodLabel: format(now, 'yyyy年M月', { locale: ja })
        };
    }
  }, [period, customStartDate, customEndDate]);

  // フィルタリングされた施術記録
  const filteredRecords = useMemo(() => {
    if (!allTreatmentRecords || !startDate || !endDate) return [];
    
    return allTreatmentRecords.filter(record => 
      record.date >= startDate && record.date <= endDate
    );
  }, [allTreatmentRecords, startDate, endDate]);

  // 統計の計算
  const stats = useMemo(() => {
    const totalSales = filteredRecords.reduce((sum, record) => sum + record.price, 0);
    const totalCustomers = new Set(filteredRecords.map(record => record.customer_id)).size;
    const totalTreatments = filteredRecords.length;
    const averagePrice = totalTreatments > 0 ? totalSales / totalTreatments : 0;

    // メニュー別集計
    const menuStats = filteredRecords.reduce((acc, record) => {
      if (!acc[record.menu_name]) {
        acc[record.menu_name] = { count: 0, sales: 0 };
      }
      acc[record.menu_name].count++;
      acc[record.menu_name].sales += record.price;
      return acc;
    }, {} as Record<string, { count: number; sales: number }>);

    const topMenus = Object.entries(menuStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // 日別売上
    const dailySales = filteredRecords.reduce((acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = 0;
      }
      acc[record.date] += record.price;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSales,
      totalCustomers,
      totalTreatments,
      averagePrice,
      topMenus,
      dailySales,
    };
  }, [filteredRecords]);

  const handleExportData = () => {
    // CSV エクスポート処理
    const csvData = [
      ['日付', 'メニュー', '料金', '顧客ID'],
      ...filteredRecords.map(record => [
        record.date,
        record.menu_name,
        record.price.toString(),
        record.customer_id
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_report_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">売上レポート</h1>
            <p className="mt-1 text-sm text-gray-600">
              期間: {periodLabel}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={handleExportData} variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              データをエクスポート
            </Button>
          </div>
        </div>
      </div>

      {/* 期間選択 */}
      <Card className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">期間選択</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <button
            onClick={() => setPeriod('thisMonth')}
            className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
              period === 'thisMonth'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            今月
          </button>
          <button
            onClick={() => setPeriod('lastMonth')}
            className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
              period === 'lastMonth'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            先月
          </button>
          <button
            onClick={() => setPeriod('thisYear')}
            className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
              period === 'thisYear'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            今年
          </button>
          <button
            onClick={() => setPeriod('custom')}
            className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
              period === 'custom'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            カスタム
          </button>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </Card>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">総売上</p>
              <p className="text-2xl font-semibold text-gray-900">
                ¥{stats.totalSales.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">来店客数</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalCustomers}名
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">施術件数</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalTreatments}件
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">平均単価</p>
              <p className="text-2xl font-semibold text-gray-900">
                ¥{Math.round(stats.averagePrice).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 人気メニューランキング */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">人気メニューランキング</h3>
          {stats.topMenus.length > 0 ? (
            <div className="space-y-3">
              {stats.topMenus.map((menu, index) => (
                <div key={menu.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 text-sm font-medium rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {menu.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      ¥{menu.sales.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {menu.count}件
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              この期間のデータがありません
            </p>
          )}
        </Card>

        {/* 日別売上 */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">日別売上推移</h3>
          {Object.keys(stats.dailySales).length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(stats.dailySales)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 20)
                .map(([date, sales]) => (
                  <div key={date} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('ja-JP')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      ¥{sales.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              この期間のデータがありません
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SalesReportPage;