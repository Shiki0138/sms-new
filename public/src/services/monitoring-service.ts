// Comprehensive Monitoring Service for Salon Management System
import supabase from '../lib/supabase';

export interface MessageMetrics {
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  deliveryRate: number;
  averageResponseTime: number;
  channelBreakdown: Record<string, number>;
  hourlyStats: Array<{ hour: number; count: number }>;
  errorTypes: Record<string, number>;
}

export interface SystemHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastTriggered?: string;
  notificationChannels: string[];
}

export interface PerformanceMetrics {
  apiResponseTimes: Record<string, number>;
  databaseQueryTimes: Record<string, number>;
  queueProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
}

export class MonitoringService {
  private tenantId: string;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // =====================================
  // Message Monitoring
  // =====================================

  async getMessageMetrics(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<MessageMetrics> {
    const cacheKey = `message-metrics-${timeframe}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startTime = this.getStartTime(now, timeframe);

    try {
      // Get total messages
      const { data: totalData, error: totalError } = await supabase
        .from('messages')
        .select('id, channel_type, sent_at, is_read, delivery_status')
        .eq('tenant_id', this.tenantId)
        .gte('created_at', startTime.toISOString());

      if (totalError) throw totalError;

      // Get queue items for delivery tracking
      const { data: queueData, error: queueError } = await supabase
        .from('message_queue')
        .select('id, channel_type, status, created_at, processed_at, last_error')
        .eq('tenant_id', this.tenantId)
        .gte('created_at', startTime.toISOString());

      if (queueError) throw queueError;

      // Calculate metrics
      const totalMessages = totalData?.length || 0;
      const sentMessages = queueData?.filter(m => m.status === 'sent').length || 0;
      const deliveredMessages = totalData?.filter(m => m.delivery_status === 'delivered').length || 0;
      const failedMessages = queueData?.filter(m => m.status === 'failed').length || 0;

      const deliveryRate = sentMessages > 0 ? (deliveredMessages / sentMessages) * 100 : 0;

      // Calculate average response time (mock implementation)
      const averageResponseTime = this.calculateAverageResponseTime(totalData || []);

      // Channel breakdown
      const channelBreakdown: Record<string, number> = {};
      totalData?.forEach(msg => {
        channelBreakdown[msg.channel_type] = (channelBreakdown[msg.channel_type] || 0) + 1;
      });

      // Hourly stats
      const hourlyStats = this.calculateHourlyStats(totalData || [], timeframe);

      // Error types
      const errorTypes: Record<string, number> = {};
      queueData?.forEach(item => {
        if (item.last_error) {
          const errorType = this.categorizeError(item.last_error);
          errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        }
      });

      const metrics: MessageMetrics = {
        totalMessages,
        sentMessages,
        deliveredMessages,
        failedMessages,
        deliveryRate,
        averageResponseTime,
        channelBreakdown,
        hourlyStats,
        errorTypes,
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting message metrics:', error);
      throw error;
    }
  }

  async logMessageEvent(event: {
    messageId: string;
    eventType: 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';
    channelType: string;
    customerId: string;
    metadata?: Record<string, any>;
    error?: string;
  }): Promise<void> {
    try {
      await supabase.from('message_events').insert({
        tenant_id: this.tenantId,
        message_id: event.messageId,
        event_type: event.eventType,
        channel_type: event.channelType,
        customer_id: event.customerId,
        metadata: event.metadata || {},
        error_message: event.error,
        timestamp: new Date().toISOString(),
      });

      // Update delivery rates in real-time
      this.invalidateCache(`message-metrics-`);
    } catch (error) {
      console.error('Error logging message event:', error);
    }
  }

  // =====================================
  // System Health Monitoring
  // =====================================

  async performHealthCheck(): Promise<SystemHealthCheck[]> {
    const checks = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkMessageQueueHealth(),
      this.checkExternalAPIHealth(),
      this.checkMemoryUsage(),
      this.checkStorageSpace(),
    ]);

    return checks;
  }

  private async checkDatabaseHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now();
    try {
      await supabase.from('tenants').select('id').limit(1);
      const responseTime = Date.now() - startTime;

      return {
        service: 'Database',
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          connectionPool: 'active',
          queryTime: responseTime,
        },
      };
    } catch (error) {
      return {
        service: 'Database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMessageQueueHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now();
    try {
      const { data: pendingMessages, error } = await supabase
        .from('message_queue')
        .select('id')
        .eq('status', 'pending')
        .lt('scheduled_for', new Date().toISOString());

      if (error) throw error;

      const pendingCount = pendingMessages?.length || 0;
      const responseTime = Date.now() - startTime;

      return {
        service: 'Message Queue',
        status: pendingCount < 100 ? 'healthy' : pendingCount < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          pendingMessages: pendingCount,
          processingCapacity: 'normal',
        },
      };
    } catch (error) {
      return {
        service: 'Message Queue',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkExternalAPIHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now();
    try {
      // Mock health check for external APIs (LINE, Email services, etc.)
      const apiChecks = await Promise.allSettled([
        this.pingService('line-api'),
        this.pingService('email-service'),
        this.pingService('sms-service'),
      ]);

      const successCount = apiChecks.filter(check => check.status === 'fulfilled').length;
      const responseTime = Date.now() - startTime;

      return {
        service: 'External APIs',
        status: successCount === 3 ? 'healthy' : successCount >= 2 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          lineAPI: apiChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
          emailService: apiChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
          smsService: apiChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        },
      };
    } catch (error) {
      return {
        service: 'External APIs',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMemoryUsage(): Promise<SystemHealthCheck> {
    const startTime = Date.now();
    try {
      // Mock memory usage check
      const memoryUsage = Math.random() * 100; // Simulate memory usage percentage
      const responseTime = Date.now() - startTime;

      return {
        service: 'Memory',
        status: memoryUsage < 70 ? 'healthy' : memoryUsage < 85 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          usagePercentage: memoryUsage,
          availableMemory: '2.1GB',
          totalMemory: '4GB',
        },
      };
    } catch (error) {
      return {
        service: 'Memory',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkStorageSpace(): Promise<SystemHealthCheck> {
    const startTime = Date.now();
    try {
      // Mock storage check
      const storageUsage = Math.random() * 100;
      const responseTime = Date.now() - startTime;

      return {
        service: 'Storage',
        status: storageUsage < 80 ? 'healthy' : storageUsage < 90 ? 'degraded' : 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          usagePercentage: storageUsage,
          availableSpace: '15.2GB',
          totalSpace: '50GB',
        },
      };
    } catch (error) {
      return {
        service: 'Storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =====================================
  // Performance Monitoring
  // =====================================

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheKey = 'performance-metrics';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get API response times from logs
      const apiResponseTimes = await this.calculateAPIResponseTimes();
      
      // Get database query times
      const databaseQueryTimes = await this.calculateDatabaseQueryTimes();
      
      // Get queue processing metrics
      const queueProcessingTime = await this.calculateQueueProcessingTime();

      // Mock system metrics (in production, these would come from system monitoring)
      const metrics: PerformanceMetrics = {
        apiResponseTimes,
        databaseQueryTimes,
        queueProcessingTime,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        activeConnections: Math.floor(Math.random() * 50) + 10,
        errorRate: Math.random() * 5, // 0-5% error rate
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  // =====================================
  // Alert Management
  // =====================================

  async checkAlerts(): Promise<void> {
    const rules = await this.getAlertRules();
    const metrics = await this.getMessageMetrics();
    const healthChecks = await this.performHealthCheck();

    for (const rule of rules) {
      if (!rule.isActive) continue;

      const shouldTrigger = await this.evaluateAlertRule(rule, metrics, healthChecks);
      
      if (shouldTrigger) {
        await this.triggerAlert(rule);
      }
    }
  }

  private async getAlertRules(): Promise<AlertRule[]> {
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  private async evaluateAlertRule(
    rule: AlertRule,
    metrics: MessageMetrics,
    healthChecks: SystemHealthCheck[]
  ): Promise<boolean> {
    switch (rule.condition) {
      case 'delivery_rate_below':
        return metrics.deliveryRate < rule.threshold;
      
      case 'error_rate_above':
        const totalErrors = Object.values(metrics.errorTypes).reduce((sum, count) => sum + count, 0);
        const errorRate = metrics.totalMessages > 0 ? (totalErrors / metrics.totalMessages) * 100 : 0;
        return errorRate > rule.threshold;
      
      case 'queue_size_above':
        // This would need to be calculated from current queue size
        return false; // Placeholder
      
      case 'service_unhealthy':
        return healthChecks.some(check => check.status === 'unhealthy');
      
      case 'response_time_above':
        return metrics.averageResponseTime > rule.threshold;
      
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    try {
      // Log the alert
      await supabase.from('alert_logs').insert({
        tenant_id: this.tenantId,
        rule_id: rule.id,
        severity: rule.severity,
        message: `Alert "${rule.name}" triggered`,
        triggered_at: new Date().toISOString(),
      });

      // Update rule last triggered
      await supabase
        .from('alert_rules')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', rule.id);

      // Send notifications (implementation depends on notification channels)
      await this.sendAlertNotifications(rule);
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  private async sendAlertNotifications(rule: AlertRule): Promise<void> {
    // Implementation would send to configured channels (email, Slack, etc.)
    console.log(`🚨 Alert triggered: ${rule.name} (${rule.severity})`);
  }

  // =====================================
  // Utility Methods
  // =====================================

  private getStartTime(now: Date, timeframe: string): Date {
    const start = new Date(now);
    switch (timeframe) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
    }
    return start;
  }

  private calculateAverageResponseTime(messages: any[]): number {
    // Mock implementation - in reality, this would calculate based on sent_at timestamps
    return Math.floor(Math.random() * 300) + 60; // 60-360 seconds
  }

  private calculateHourlyStats(messages: any[], timeframe: string): Array<{ hour: number; count: number }> {
    const stats: Array<{ hour: number; count: number }> = [];
    const hours = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 24;
    
    for (let i = 0; i < hours; i++) {
      stats.push({
        hour: i,
        count: Math.floor(Math.random() * 50),
      });
    }
    
    return stats;
  }

  private categorizeError(error: string): string {
    if (error.toLowerCase().includes('network')) return 'Network Error';
    if (error.toLowerCase().includes('timeout')) return 'Timeout Error';
    if (error.toLowerCase().includes('auth')) return 'Authentication Error';
    if (error.toLowerCase().includes('rate limit')) return 'Rate Limit Error';
    return 'Unknown Error';
  }

  private async pingService(service: string): Promise<boolean> {
    // Mock implementation - in reality, this would ping actual services
    return new Promise((resolve) => {
      setTimeout(() => resolve(Math.random() > 0.1), 100); // 90% success rate
    });
  }

  private async calculateAPIResponseTimes(): Promise<Record<string, number>> {
    // Mock implementation
    return {
      '/api/messages': Math.random() * 200 + 50,
      '/api/campaigns': Math.random() * 300 + 100,
      '/api/customers': Math.random() * 150 + 75,
      '/api/health': Math.random() * 50 + 10,
    };
  }

  private async calculateDatabaseQueryTimes(): Promise<Record<string, number>> {
    // Mock implementation
    return {
      'SELECT messages': Math.random() * 100 + 25,
      'INSERT message_queue': Math.random() * 50 + 10,
      'UPDATE campaigns': Math.random() * 75 + 20,
      'DELETE old_messages': Math.random() * 200 + 50,
    };
  }

  private async calculateQueueProcessingTime(): Promise<number> {
    const { data, error } = await supabase
      .from('message_queue')
      .select('created_at, processed_at')
      .eq('tenant_id', this.tenantId)
      .not('processed_at', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(100);

    if (error || !data?.length) return 0;

    const processingTimes = data.map(item => {
      const created = new Date(item.created_at);
      const processed = new Date(item.processed_at);
      return processed.getTime() - created.getTime();
    });

    return processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length / 1000; // Convert to seconds
  }

  private getCachedData(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private invalidateCache(prefix: string): void {
    for (const key of this.metricsCache.keys()) {
      if (key.startsWith(prefix)) {
        this.metricsCache.delete(key);
      }
    }
  }
}

export default MonitoringService;