// Health Check API Routes
import { Router } from 'express';
import { HealthChecker } from '../utils/health-check';
import { MonitoringService } from '../services/monitoring-service';
import { LoggingService } from '../services/logging-service';

const router = Router();

// Middleware to extract tenant ID (implement based on your auth system)
const extractTenantId = (req: any) => {
  // This should be implemented based on your authentication system
  return req.user?.tenant_id || 'default-tenant';
};

// Basic health check endpoint (no authentication required)
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const tenantId = extractTenantId(req);
    const healthChecker = new HealthChecker(tenantId);
    
    const systemStatus = await healthChecker.performSystemHealthCheck();
    
    // Log the health check
    const logger = new LoggingService(tenantId);
    logger.logAPIRequest({
      method: req.method,
      endpoint: req.path,
      statusCode: 200,
      responseTime: Date.now() - startTime,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: systemStatus.overall,
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      ...systemStatus
    });

    healthChecker.destroy();
    logger.destroy();
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check (requires authentication)
router.get('/health/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Add authentication check here
    // if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const tenantId = extractTenantId(req);
    const healthChecker = new HealthChecker(tenantId);
    const monitoringService = new MonitoringService(tenantId);
    
    const [systemStatus, messageMetrics, performanceMetrics] = await Promise.all([
      healthChecker.performSystemHealthCheck(),
      monitoringService.getMessageMetrics('1h'),
      monitoringService.getPerformanceMetrics()
    ]);

    res.status(200).json({
      system_status: systemStatus,
      message_metrics: messageMetrics,
      performance_metrics: performanceMetrics,
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime
    });

    healthChecker.destroy();
  } catch (error) {
    console.error('Detailed health check error:', error);
    
    res.status(500).json({
      error: 'Detailed health check failed',
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  });
});

// Readiness probe (for Kubernetes/Docker)
router.get('/health/ready', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const tenantId = extractTenantId(req);
    const healthChecker = new HealthChecker(tenantId);
    
    // Check only critical services for readiness
    const databaseHealth = await healthChecker['checkDatabaseHealth']();
    
    if (databaseHealth.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        response_time: Date.now() - startTime,
        reason: 'Database not available'
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime
    });

    healthChecker.destroy();
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      reason: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint for Prometheus/monitoring systems
router.get('/metrics', async (req, res) => {
  try {
    const tenantId = extractTenantId(req);
    const monitoringService = new MonitoringService(tenantId);
    
    const [messageMetrics, performanceMetrics] = await Promise.all([
      monitoringService.getMessageMetrics('1h'),
      monitoringService.getPerformanceMetrics()
    ]);

    // Format metrics in Prometheus format
    const prometheusMetrics = formatPrometheusMetrics(messageMetrics, performanceMetrics);
    
    res.set('Content-Type', 'text/plain');
    res.status(200).send(prometheusMetrics);
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check with specific service
router.get('/health/:service', async (req, res) => {
  const { service } = req.params;
  const startTime = Date.now();
  
  try {
    const tenantId = extractTenantId(req);
    const healthChecker = new HealthChecker(tenantId);
    
    let result;
    switch (service.toLowerCase()) {
      case 'database':
        result = await healthChecker['checkDatabaseHealth']();
        break;
      case 'redis':
        result = await healthChecker['checkRedisHealth']();
        break;
      case 'queue':
        result = await healthChecker['checkMessageQueueHealth']();
        break;
      case 'external':
        result = await healthChecker['checkExternalAPIHealth']();
        break;
      default:
        return res.status(400).json({
          error: 'Invalid service name',
          available_services: ['database', 'redis', 'queue', 'external']
        });
    }

    res.status(result.status === 'unhealthy' ? 503 : 200).json({
      ...result,
      response_time: Date.now() - startTime
    });

    healthChecker.destroy();
  } catch (error) {
    res.status(500).json({
      service,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Format metrics for Prometheus
function formatPrometheusMetrics(messageMetrics: any, performanceMetrics: any): string {
  const metrics = [];
  
  // Message metrics
  metrics.push(`# HELP messages_total Total number of messages processed`);
  metrics.push(`# TYPE messages_total counter`);
  metrics.push(`messages_total ${messageMetrics.totalMessages}`);
  
  metrics.push(`# HELP messages_sent_total Total number of messages sent`);
  metrics.push(`# TYPE messages_sent_total counter`);
  metrics.push(`messages_sent_total ${messageMetrics.sentMessages}`);
  
  metrics.push(`# HELP messages_delivered_total Total number of messages delivered`);
  metrics.push(`# TYPE messages_delivered_total counter`);
  metrics.push(`messages_delivered_total ${messageMetrics.deliveredMessages}`);
  
  metrics.push(`# HELP messages_failed_total Total number of failed messages`);
  metrics.push(`# TYPE messages_failed_total counter`);
  metrics.push(`messages_failed_total ${messageMetrics.failedMessages}`);
  
  metrics.push(`# HELP message_delivery_rate Message delivery rate percentage`);
  metrics.push(`# TYPE message_delivery_rate gauge`);
  metrics.push(`message_delivery_rate ${messageMetrics.deliveryRate}`);
  
  metrics.push(`# HELP message_response_time_seconds Average message response time`);
  metrics.push(`# TYPE message_response_time_seconds gauge`);
  metrics.push(`message_response_time_seconds ${messageMetrics.averageResponseTime / 1000}`);
  
  // Channel breakdown
  Object.entries(messageMetrics.channelBreakdown).forEach(([channel, count]) => {
    metrics.push(`messages_by_channel{channel="${channel}"} ${count}`);
  });
  
  // Performance metrics
  metrics.push(`# HELP memory_usage_percent Memory usage percentage`);
  metrics.push(`# TYPE memory_usage_percent gauge`);
  metrics.push(`memory_usage_percent ${performanceMetrics.memoryUsage}`);
  
  metrics.push(`# HELP cpu_usage_percent CPU usage percentage`);
  metrics.push(`# TYPE cpu_usage_percent gauge`);
  metrics.push(`cpu_usage_percent ${performanceMetrics.cpuUsage}`);
  
  metrics.push(`# HELP error_rate_percent Error rate percentage`);
  metrics.push(`# TYPE error_rate_percent gauge`);
  metrics.push(`error_rate_percent ${performanceMetrics.errorRate}`);
  
  metrics.push(`# HELP active_connections Active database connections`);
  metrics.push(`# TYPE active_connections gauge`);
  metrics.push(`active_connections ${performanceMetrics.activeConnections}`);
  
  metrics.push(`# HELP queue_processing_time_seconds Queue processing time`);
  metrics.push(`# TYPE queue_processing_time_seconds gauge`);
  metrics.push(`queue_processing_time_seconds ${performanceMetrics.queueProcessingTime}`);
  
  // API response times
  Object.entries(performanceMetrics.apiResponseTimes).forEach(([endpoint, time]) => {
    const cleanEndpoint = endpoint.replace(/[^a-zA-Z0-9_]/g, '_');
    metrics.push(`api_response_time_seconds{endpoint="${endpoint}"} ${Number(time) / 1000}`);
  });
  
  return metrics.join('\n') + '\n';
}

export default router;