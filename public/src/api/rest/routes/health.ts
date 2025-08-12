import { Router } from 'express';
import os from 'os';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', async (_req, res) => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(healthInfo);
});

// Detailed health check
healthRouter.get('/detailed', async (_req, res) => {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    workers: 'unknown'
  };

  // Check database
  try {
    // TODO: Get database instance from dependency injection
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
  }

  // Check Redis
  try {
    // TODO: Get Redis instance from dependency injection
    checks.redis = 'healthy';
  } catch (error) {
    checks.redis = 'unhealthy';
  }

  const isHealthy = Object.values(checks).every(status => status === 'healthy');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      hostname: os.hostname()
    }
  });
});

// Liveness probe for Kubernetes
healthRouter.get('/live', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe for Kubernetes
healthRouter.get('/ready', async (_req, res) => {
  // TODO: Check if all services are ready
  const isReady = true;

  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});