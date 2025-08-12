// Health Check Utilities for System Monitoring
import supabase from '../lib/supabase';
import { LoggingService } from '../services/logging-service';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  uptime: number;
  version: string;
  environment: string;
}

export class HealthChecker {
  private logger: LoggingService;

  constructor(tenantId: string) {
    this.logger = new LoggingService(tenantId);
  }

  async performSystemHealthCheck(): Promise<SystemStatus> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [
        databaseHealth,
        redisHealth,
        messageQueueHealth,
        externalAPIHealth,
        diskSpaceHealth,
        memoryHealth
      ] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkMessageQueueHealth(),
        this.checkExternalAPIHealth(),
        this.checkDiskSpace(),
        this.checkMemoryUsage()
      ]);

      const services: HealthCheckResult[] = [
        this.getResultFromSettled(databaseHealth, 'Database'),
        this.getResultFromSettled(redisHealth, 'Redis'),
        this.getResultFromSettled(messageQueueHealth, 'Message Queue'),
        this.getResultFromSettled(externalAPIHealth, 'External APIs'),
        this.getResultFromSettled(diskSpaceHealth, 'Disk Space'),
        this.getResultFromSettled(memoryHealth, 'Memory')
      ];

      // Determine overall status
      const overallStatus = this.determineOverallStatus(services);

      // Log health check results
      this.logger.info('System health check completed', 'system', {
        overall_status: overallStatus,
        response_time: Date.now() - startTime,
        services_checked: services.length,
        healthy_services: services.filter(s => s.status === 'healthy').length,
        degraded_services: services.filter(s => s.status === 'degraded').length,
        unhealthy_services: services.filter(s => s.status === 'unhealthy').length
      });

      return {
        overall: overallStatus,
        services,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      this.logger.error('Health check failed', 'system', {}, error as Error);
      throw error;
    }
  }

  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);

      if (error) throw error;

      const responseTime = Date.now() - startTime;

      // Test write operation
      const writeStart = Date.now();
      const { error: writeError } = await supabase
        .from('system_logs')
        .insert({
          tenant_id: '00000000-0000-0000-0000-000000000000',
          level: 'debug',
          category: 'system',
          message: 'Health check test',
          metadata: { health_check: true }
        });

      const writeTime = Date.now() - writeStart;

      return {
        service: 'Database',
        status: responseTime < 200 && writeTime < 500 ? 'healthy' : 
                responseTime < 1000 && writeTime < 2000 ? 'degraded' : 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          read_time: responseTime,
          write_time: writeTime,
          connection_count: data?.length || 0,
          write_error: writeError ? writeError.message : null
        }
      };
    } catch (error) {
      return {
        service: 'Database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Mock Redis check (implement actual Redis connection check)
      const mockRedisResponse = await this.mockAsyncOperation(50, Math.random() > 0.1);
      
      if (!mockRedisResponse.success) {
        throw new Error('Redis connection failed');
      }

      const responseTime = Date.now() - startTime;

      return {
        service: 'Redis',
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          memory_usage: '45MB',
          connected_clients: 12,
          ops_per_sec: 1250
        }
      };
    } catch (error) {
      return {
        service: 'Redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkMessageQueueHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { data: pendingMessages, error } = await supabase
        .from('message_queue')
        .select('id, status, created_at')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString());

      if (error) throw error;

      const responseTime = Date.now() - startTime;
      const pendingCount = pendingMessages?.length || 0;
      
      // Check for old pending messages (>10 minutes)
      const oldPendingMessages = pendingMessages?.filter(msg => {
        const created = new Date(msg.created_at).getTime();
        return Date.now() - created > 10 * 60 * 1000; // 10 minutes
      }) || [];

      const status = pendingCount < 100 && oldPendingMessages.length < 10 ? 'healthy' :
                   pendingCount < 500 && oldPendingMessages.length < 50 ? 'degraded' : 'unhealthy';

      return {
        service: 'Message Queue',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          pending_messages: pendingCount,
          old_pending_messages: oldPendingMessages.length,
          processing_capacity: status === 'healthy' ? 'normal' : 'overloaded'
        }
      };
    } catch (error) {
      return {
        service: 'Message Queue',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkExternalAPIHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test external API connectivity
      const [lineCheck, emailCheck, smsCheck] = await Promise.allSettled([
        this.checkLineAPI(),
        this.checkEmailAPI(),
        this.checkSMSAPI()
      ]);

      const responseTime = Date.now() - startTime;
      
      const results = {
        line: lineCheck.status === 'fulfilled' ? lineCheck.value : false,
        email: emailCheck.status === 'fulfilled' ? emailCheck.value : false,
        sms: smsCheck.status === 'fulfilled' ? smsCheck.value : false
      };

      const healthyServices = Object.values(results).filter(Boolean).length;
      const totalServices = Object.keys(results).length;

      const status = healthyServices === totalServices ? 'healthy' :
                   healthyServices >= totalServices * 0.6 ? 'degraded' : 'unhealthy';

      return {
        service: 'External APIs',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          line_api: results.line ? 'healthy' : 'unhealthy',
          email_service: results.email ? 'healthy' : 'unhealthy',
          sms_service: results.sms ? 'healthy' : 'unhealthy',
          healthy_count: healthyServices,
          total_count: totalServices
        }
      };
    } catch (error) {
      return {
        service: 'External APIs',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkDiskSpace(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Mock disk space check (implement actual disk space check)
      const diskUsage = Math.random() * 100; // Simulate disk usage percentage
      const responseTime = Date.now() - startTime;

      const status = diskUsage < 70 ? 'healthy' : diskUsage < 85 ? 'degraded' : 'unhealthy';

      return {
        service: 'Disk Space',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          usage_percentage: Math.round(diskUsage * 10) / 10,
          available_gb: Math.round((100 - diskUsage) * 0.5 * 10) / 10,
          total_gb: 50,
          mount_point: '/'
        }
      };
    } catch (error) {
      return {
        service: 'Disk Space',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const responseTime = Date.now() - startTime;
      
      const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const usagePercentage = (usedMB / totalMB) * 100;

      const status = usagePercentage < 70 ? 'healthy' : 
                   usagePercentage < 85 ? 'degraded' : 'unhealthy';

      return {
        service: 'Memory',
        status,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          heap_used_mb: usedMB,
          heap_total_mb: totalMB,
          usage_percentage: Math.round(usagePercentage * 10) / 10,
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
          external_mb: Math.round(memoryUsage.external / 1024 / 1024)
        }
      };
    } catch (error) {
      return {
        service: 'Memory',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkLineAPI(): Promise<boolean> {
    try {
      // Mock LINE API check
      const result = await this.mockAsyncOperation(200, Math.random() > 0.05);
      return result.success;
    } catch {
      return false;
    }
  }

  private async checkEmailAPI(): Promise<boolean> {
    try {
      // Mock Email API check
      const result = await this.mockAsyncOperation(150, Math.random() > 0.02);
      return result.success;
    } catch {
      return false;
    }
  }

  private async checkSMSAPI(): Promise<boolean> {
    try {
      // Mock SMS API check
      const result = await this.mockAsyncOperation(300, Math.random() > 0.08);
      return result.success;
    } catch {
      return false;
    }
  }

  private async mockAsyncOperation(delay: number, success: boolean): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (success) {
          resolve({ success: true });
        } else {
          reject(new Error('Mock operation failed'));
        }
      }, delay);
    });
  }

  private getResultFromSettled(
    result: PromiseSettledResult<HealthCheckResult>,
    serviceName: string
  ): HealthCheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime: 0,
        timestamp: new Date().toISOString(),
        error: result.reason instanceof Error ? result.reason.message : 'Health check failed'
      };
    }
  }

  private determineOverallStatus(services: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    }
    
    if (degradedCount > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  // Cleanup method
  destroy(): void {
    this.logger.destroy();
  }
}

export default HealthChecker;