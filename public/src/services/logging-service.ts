// Comprehensive Logging Service for Salon Management System
import supabase from '../lib/supabase';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory = 'messaging' | 'api' | 'database' | 'security' | 'performance' | 'user_action' | 'system';

export interface LogEntry {
  id?: string;
  tenant_id: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  user_id?: string;
  customer_id?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  correlation_id?: string;
  stack_trace?: string;
  created_at?: string;
}

export interface LogQuery {
  level?: LogLevel[];
  category?: LogCategory[];
  search?: string;
  user_id?: string;
  customer_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface LogAggregation {
  level: LogLevel;
  category: LogCategory;
  count: number;
  date: string;
}

export class LoggingService {
  private tenantId: string;
  private correlationId?: string;
  private sessionId?: string;
  private userId?: string;
  private batchSize = 100;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(tenantId: string, options?: {
    correlationId?: string;
    sessionId?: string;
    userId?: string;
  }) {
    this.tenantId = tenantId;
    this.correlationId = options?.correlationId;
    this.sessionId = options?.sessionId;
    this.userId = options?.userId;

    // Start auto-flush interval
    this.startAutoFlush();
  }

  // =====================================
  // Logging Methods
  // =====================================

  debug(message: string, category: LogCategory = 'system', metadata?: Record<string, any>): void {
    this.log('debug', category, message, metadata);
  }

  info(message: string, category: LogCategory = 'system', metadata?: Record<string, any>): void {
    this.log('info', category, message, metadata);
  }

  warn(message: string, category: LogCategory = 'system', metadata?: Record<string, any>): void {
    this.log('warn', category, message, metadata);
  }

  error(message: string, category: LogCategory = 'system', metadata?: Record<string, any>, error?: Error): void {
    const enhancedMetadata = {
      ...metadata,
      error_name: error?.name,
      error_message: error?.message,
    };

    this.log('error', category, message, enhancedMetadata, error?.stack);
  }

  critical(message: string, category: LogCategory = 'system', metadata?: Record<string, any>, error?: Error): void {
    const enhancedMetadata = {
      ...metadata,
      error_name: error?.name,
      error_message: error?.message,
    };

    this.log('critical', category, message, enhancedMetadata, error?.stack);
  }

  // =====================================
  // Specialized Logging Methods
  // =====================================

  logMessageEvent(event: {
    type: 'sent' | 'received' | 'delivered' | 'failed' | 'opened' | 'clicked';
    messageId: string;
    customerId: string;
    channelType: string;
    content?: string;
    error?: Error;
    metadata?: Record<string, any>;
  }): void {
    const metadata = {
      message_id: event.messageId,
      customer_id: event.customerId,
      channel_type: event.channelType,
      event_type: event.type,
      content_length: event.content?.length,
      ...event.metadata,
    };

    if (event.error) {
      this.error(`Message ${event.type} failed: ${event.error.message}`, 'messaging', metadata, event.error);
    } else {
      this.info(`Message ${event.type}`, 'messaging', metadata);
    }
  }

  logAPIRequest(request: {
    method: string;
    endpoint: string;
    statusCode: number;
    responseTime: number;
    requestSize?: number;
    responseSize?: number;
    userAgent?: string;
    ipAddress?: string;
    error?: Error;
  }): void {
    const metadata = {
      method: request.method,
      endpoint: request.endpoint,
      status_code: request.statusCode,
      response_time_ms: request.responseTime,
      request_size_bytes: request.requestSize,
      response_size_bytes: request.responseSize,
      user_agent: request.userAgent,
      ip_address: request.ipAddress,
    };

    const level = request.statusCode >= 500 ? 'error' : request.statusCode >= 400 ? 'warn' : 'info';
    const message = `${request.method} ${request.endpoint} - ${request.statusCode} (${request.responseTime}ms)`;

    this.log(level, 'api', message, metadata, request.error?.stack);
  }

  logDatabaseQuery(query: {
    operation: string;
    table: string;
    executionTime: number;
    rowsAffected?: number;
    error?: Error;
  }): void {
    const metadata = {
      operation: query.operation,
      table: query.table,
      execution_time_ms: query.executionTime,
      rows_affected: query.rowsAffected,
    };

    if (query.error) {
      this.error(`Database query failed: ${query.error.message}`, 'database', metadata, query.error);
    } else {
      const level = query.executionTime > 1000 ? 'warn' : 'debug';
      this.log(level, 'database', `${query.operation} on ${query.table} (${query.executionTime}ms)`, metadata);
    }
  }

  logUserAction(action: {
    type: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    success: boolean;
    error?: Error;
  }): void {
    const metadata = {
      action_type: action.type,
      resource: action.resource,
      resource_id: action.resourceId,
      success: action.success,
      ...action.details,
    };

    if (!action.success && action.error) {
      this.error(`User action failed: ${action.type} on ${action.resource}`, 'user_action', metadata, action.error);
    } else {
      this.info(`User action: ${action.type} on ${action.resource}`, 'user_action', metadata);
    }
  }

  logSecurityEvent(event: {
    type: 'login_attempt' | 'login_success' | 'login_failure' | 'permission_denied' | 'suspicious_activity';
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }): void {
    const metadata = {
      event_type: event.type,
      user_id: event.userId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      ...event.details,
    };

    const level = event.type.includes('failure') || event.type === 'permission_denied' || event.type === 'suspicious_activity' 
      ? 'warn' 
      : 'info';

    this.log(level, 'security', `Security event: ${event.type}`, metadata);
  }

  logPerformanceMetric(metric: {
    name: string;
    value: number;
    unit: string;
    threshold?: number;
    metadata?: Record<string, any>;
  }): void {
    const metadata = {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit,
      threshold: metric.threshold,
      above_threshold: metric.threshold ? metric.value > metric.threshold : false,
      ...metric.metadata,
    };

    const level = metric.threshold && metric.value > metric.threshold ? 'warn' : 'info';
    this.log(level, 'performance', `Performance metric: ${metric.name} = ${metric.value}${metric.unit}`, metadata);
  }

  // =====================================
  // Core Logging Method
  // =====================================

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: Record<string, any>,
    stackTrace?: string
  ): void {
    const logEntry: LogEntry = {
      tenant_id: this.tenantId,
      level,
      category,
      message,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
      user_id: this.userId,
      correlation_id: this.correlationId,
      session_id: this.sessionId,
      stack_trace: stackTrace,
      created_at: new Date().toISOString(),
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(logEntry);
    }

    // Immediate flush for critical errors
    if (level === 'critical') {
      this.flushLogs();
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.batchSize) {
      this.flushLogs();
    }
  }

  private consoleLog(entry: LogEntry): void {
    const timestamp = new Date(entry.created_at!).toISOString();
    const level = entry.level.toUpperCase().padEnd(8);
    const category = entry.category.toUpperCase().padEnd(12);
    
    let consoleMethod: keyof Console;
    switch (entry.level) {
      case 'debug':
        consoleMethod = 'debug';
        break;
      case 'info':
        consoleMethod = 'info';
        break;
      case 'warn':
        consoleMethod = 'warn';
        break;
      case 'error':
      case 'critical':
        consoleMethod = 'error';
        break;
      default:
        consoleMethod = 'log';
    }

    console[consoleMethod](`[${timestamp}] ${level} ${category} ${entry.message}`);
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console[consoleMethod]('Metadata:', entry.metadata);
    }
    
    if (entry.stack_trace) {
      console[consoleMethod]('Stack trace:', entry.stack_trace);
    }
  }

  // =====================================
  // Log Management
  // =====================================

  async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await supabase
        .from('system_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush logs to database:', error);
        // Put logs back in buffer for retry
        this.logBuffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  async queryLogs(query: LogQuery): Promise<LogEntry[]> {
    let supabaseQuery = supabase
      .from('system_logs')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false });

    if (query.level?.length) {
      supabaseQuery = supabaseQuery.in('level', query.level);
    }

    if (query.category?.length) {
      supabaseQuery = supabaseQuery.in('category', query.category);
    }

    if (query.user_id) {
      supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
    }

    if (query.customer_id) {
      supabaseQuery = supabaseQuery.eq('customer_id', query.customer_id);
    }

    if (query.from_date) {
      supabaseQuery = supabaseQuery.gte('created_at', query.from_date);
    }

    if (query.to_date) {
      supabaseQuery = supabaseQuery.lte('created_at', query.to_date);
    }

    if (query.search) {
      supabaseQuery = supabaseQuery.or(`message.ilike.%${query.search}%,metadata->>'message_id'.ilike.%${query.search}%`);
    }

    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }

    if (query.offset) {
      supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 100) - 1);
    }

    const { data, error } = await supabaseQuery;

    if (error) throw error;
    return data || [];
  }

  async getLogAggregations(
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<LogAggregation[]> {
    const now = new Date();
    const startTime = this.getStartTime(now, timeframe);

    const { data, error } = await supabase
      .from('system_logs')
      .select('level, category, created_at')
      .eq('tenant_id', this.tenantId)
      .gte('created_at', startTime.toISOString());

    if (error) throw error;

    // Group by date, level, and category
    const aggregations: Record<string, LogAggregation> = {};

    data?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      const key = `${date}-${log.level}-${log.category}`;
      
      if (!aggregations[key]) {
        aggregations[key] = {
          level: log.level,
          category: log.category,
          count: 0,
          date,
        };
      }
      
      aggregations[key].count++;
    });

    return Object.values(aggregations);
  }

  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await supabase
      .from('system_logs')
      .delete()
      .eq('tenant_id', this.tenantId)
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw error;
    
    const deletedCount = data?.length || 0;
    this.info(`Cleaned up ${deletedCount} old log entries`, 'system', {
      retention_days: retentionDays,
      cutoff_date: cutoffDate.toISOString(),
    });

    return deletedCount;
  }

  // =====================================
  // Utility Methods
  // =====================================

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  setUserId(id: string): void {
    this.userId = id;
  }

  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 30000); // Flush every 30 seconds
  }

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

  // Cleanup method
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs(); // Final flush
  }
}

export default LoggingService;