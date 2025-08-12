import { config } from 'dotenv';
import { BuildSystemServer } from './api/server';
import { DatabaseManager } from './storage/DatabaseManager';
import { RedisManager } from './storage/RedisManager';
import { WorkerPool } from './core/workers/WorkerPool';
import { TaskEngine } from './core/engine/TaskEngine';
import { PluginManager } from './plugins/PluginManager';
import { Logger } from './core/utils/Logger';

// Load environment variables
config();

const logger = new Logger('Main');

async function bootstrap() {
  try {
    logger.info('Starting Modern Build System...');

    // Initialize database
    const db = new DatabaseManager({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'build_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
    await db.connect();
    await db.migrate();

    // Initialize Redis
    const redis = new RedisManager({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    await redis.connect();

    // Initialize worker pool
    const workerPool = new WorkerPool({
      minWorkers: parseInt(process.env.MIN_WORKERS || '2'),
      maxWorkers: parseInt(process.env.MAX_WORKERS || '10'),
      workerTimeout: parseInt(process.env.WORKER_TIMEOUT || '300000')
    });
    await workerPool.start();

    // Initialize task engine
    const taskEngine = new TaskEngine({
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS || '50'),
      defaultTimeout: parseInt(process.env.DEFAULT_TASK_TIMEOUT || '300000'),
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
      enableCache: process.env.ENABLE_CACHE === 'true'
    });

    // Initialize plugin manager
    const pluginManager = new PluginManager();
    await pluginManager.loadPlugins();

    // Start API server
    const server = new BuildSystemServer({
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
      enableGraphQL: process.env.ENABLE_GRAPHQL !== 'false',
      enableREST: process.env.ENABLE_REST !== 'false',
      enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false'
    });
    await server.start();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await shutdown(server, workerPool, db, redis);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await shutdown(server, workerPool, db, redis);
    });

    logger.info('Modern Build System started successfully!');
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

async function shutdown(
  server: BuildSystemServer,
  workerPool: WorkerPool,
  db: DatabaseManager,
  redis: RedisManager
): Promise<void> {
  try {
    await server.stop();
    await workerPool.stop();
    await db.disconnect();
    await redis.disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  logger.error('Bootstrap failed', error);
  process.exit(1);
});