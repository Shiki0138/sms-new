// Health Monitoring Dashboard Component
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { MonitoringService, SystemHealthCheck, MessageMetrics, PerformanceMetrics } from '../../services/monitoring-service';
import { LoggingService } from '../../services/logging-service';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface HealthDashboardProps {
  tenantId: string;
}

export default function HealthDashboard({ tenantId }: HealthDashboardProps) {
  const [monitoringService] = useState(() => new MonitoringService(tenantId));
  const [loggingService] = useState(() => new LoggingService(tenantId));
  
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheck[]>([]);
  const [messageMetrics, setMessageMetrics] = useState<MessageMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [health, messages, performance] = await Promise.all([
        monitoringService.performHealthCheck(),
        monitoringService.getMessageMetrics('24h'),
        monitoringService.getPerformanceMetrics(),
      ]);

      setHealthChecks(health);
      setMessageMetrics(messages);
      setPerformanceMetrics(performance);
      setLastUpdate(new Date());
      
      // Log dashboard access
      loggingService.logUserAction({
        type: 'view_dashboard',
        resource: 'health_monitoring',
        success: true,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      loggingService.error('Failed to load health dashboard', 'monitoring', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const getOverallStatus = (): 'healthy' | 'degraded' | 'unhealthy' => {
    if (!healthChecks.length) return 'unhealthy';
    
    const unhealthyCount = healthChecks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = healthChecks.filter(check => check.status === 'degraded').length;
    
    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatResponseTime = (time: number): string => {
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && !healthChecks.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${getStatusColor(overallStatus)}`}>
              <HeartIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">システム監視</h2>
              <p className="text-sm text-gray-600">
                最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-refresh" className="text-sm text-gray-700">
                自動更新
              </label>
            </div>
            <Button onClick={loadDashboardData} disabled={loading}>
              {loading ? '更新中...' : '今すぐ更新'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Overall Status */}
      <Card>
        <div className="text-center py-8">
          <motion.div
            animate={{ scale: overallStatus === 'healthy' ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: overallStatus === 'healthy' ? Infinity : 0 }}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getStatusColor(overallStatus)} mb-4`}
          >
            {getStatusIcon(overallStatus)}
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {overallStatus === 'healthy' && 'システム正常'}
            {overallStatus === 'degraded' && 'パフォーマンス低下'}
            {overallStatus === 'unhealthy' && 'システム異常'}
          </h3>
          <p className="text-gray-600">
            {overallStatus === 'healthy' && 'すべてのサービスが正常に動作しています'}
            {overallStatus === 'degraded' && '一部のサービスでパフォーマンスが低下しています'}
            {overallStatus === 'unhealthy' && 'サービスで問題が発生しています'}
          </p>
        </div>
      </Card>

      {/* Service Health Checks */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">サービス状態</h3>
          <div className="space-y-4">
            {healthChecks.map(check => (
              <motion.div
                key={check.service}
                whileHover={{ scale: 1.01 }}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">{check.service}</h4>
                    <p className="text-sm text-gray-600">
                      応答時間: {formatResponseTime(check.responseTime)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                    {check.status === 'healthy' && '正常'}
                    {check.status === 'degraded' && '低下'}
                    {check.status === 'unhealthy' && '異常'}
                  </span>
                  {check.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">{check.errorMessage}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* Message Metrics */}
      {messageMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">総メッセージ数</p>
                  <p className="text-2xl font-bold text-gray-900">{messageMetrics.totalMessages.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">配信率</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPercentage(messageMetrics.deliveryRate)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">平均応答時間</p>
                  <p className="text-2xl font-bold text-gray-900">{formatResponseTime(messageMetrics.averageResponseTime)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">失敗メッセージ</p>
                  <p className="text-2xl font-bold text-gray-900">{messageMetrics.failedMessages.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Channel Breakdown */}
      {messageMetrics && Object.keys(messageMetrics.channelBreakdown).length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">チャンネル別メッセージ数</h3>
            <div className="space-y-3">
              {Object.entries(messageMetrics.channelBreakdown).map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">{channel}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((count / messageMetrics.totalMessages) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">パフォーマンス指標</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">API応答時間</h4>
                <div className="space-y-2">
                  {Object.entries(performanceMetrics.apiResponseTimes).map(([endpoint, time]) => (
                    <div key={endpoint} className="flex justify-between text-sm">
                      <span className="text-gray-700">{endpoint}</span>
                      <span className="font-medium">{formatResponseTime(time)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">データベース</h4>
                <div className="space-y-2">
                  {Object.entries(performanceMetrics.databaseQueryTimes).map(([query, time]) => (
                    <div key={query} className="flex justify-between text-sm">
                      <span className="text-gray-700">{query}</span>
                      <span className="font-medium">{formatResponseTime(time)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">システムリソース</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">メモリ使用率</span>
                    <span className="font-medium">{formatPercentage(performanceMetrics.memoryUsage)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">CPU使用率</span>
                    <span className="font-medium">{formatPercentage(performanceMetrics.cpuUsage)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">エラー率</span>
                    <span className="font-medium">{formatPercentage(performanceMetrics.errorRate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Summary */}
      {messageMetrics && Object.keys(messageMetrics.errorTypes).length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">エラー分析</h3>
            <div className="space-y-3">
              {Object.entries(messageMetrics.errorTypes).map(([errorType, count]) => (
                <div key={errorType} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">{errorType}</span>
                  </div>
                  <span className="text-sm font-bold text-red-900">{count}件</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}