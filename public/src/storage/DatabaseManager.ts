import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '../core/utils/Logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolSize?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export interface QueryOptions {
  timeout?: number;
  transaction?: PoolClient;
}

export class DatabaseManager {
  private pool: Pool;
  private logger: Logger;
  private config: DatabaseConfig;
  private connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.logger = new Logger('DatabaseManager');
    
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.poolSize || 20,
      connectionTimeoutMillis: config.connectionTimeout || 30000,
      idleTimeoutMillis: config.idleTimeout || 10000,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected database pool error', err);
    });

    this.pool.on('connect', () => {
      this.logger.debug('New database connection established');
    });

    this.pool.on('remove', () => {
      this.logger.debug('Database connection removed from pool');
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.connected = true;
      this.logger.info('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.connected = false;
      this.logger.info('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection', error);
      throw error;
    }
  }

  async query<T = any>(
    text: string,
    params?: any[],
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    const client = options?.transaction || this.pool;
    
    try {
      const start = Date.now();
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug('Query executed', {
        query: text,
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      this.logger.error('Query failed', error, { query: text });
      throw error;
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate(): Promise<void> {
    try {
      await this.createTables();
      await this.createIndexes();
      await this.createFunctions();
      this.logger.info('Database migration completed');
    } catch (error) {
      this.logger.error('Database migration failed', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB DEFAULT '{}',
        triggers JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'idle',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS builds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
        build_number INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_data JSONB DEFAULT '{}',
        commit_info JSONB,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP WITH TIME ZONE,
        duration INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
        stage_name VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        config JSONB DEFAULT '{}',
        result JSONB,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        duration INTEGER,
        attempts INTEGER DEFAULT 0,
        worker_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS artifacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        path TEXT NOT NULL,
        size BIGINT,
        checksum VARCHAR(64),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS logs (
        id BIGSERIAL PRIMARY KEY,
        build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(20) NOT NULL,
        source VARCHAR(255),
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'
      )`,
      
      `CREATE TABLE IF NOT EXISTS workers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        capabilities TEXT[],
        resources JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS plugins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        version VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        author VARCHAR(255),
        description TEXT,
        capabilities JSONB DEFAULT '[]',
        config JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_pipelines_project_id ON pipelines(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_builds_pipeline_id ON builds(pipeline_id)',
      'CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_build_id ON tasks(build_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_artifacts_build_id ON artifacts(build_id)',
      'CREATE INDEX IF NOT EXISTS idx_artifacts_task_id ON artifacts(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_build_id ON logs(build_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_task_id ON logs(task_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status)',
      'CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON workers(last_heartbeat)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }
  }

  private async createFunctions(): Promise<void> {
    const functions = [
      `CREATE OR REPLACE FUNCTION update_updated_at()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql`,
       
      `CREATE OR REPLACE FUNCTION get_next_build_number(p_pipeline_id UUID)
       RETURNS INTEGER AS $$
       DECLARE
         next_number INTEGER;
       BEGIN
         SELECT COALESCE(MAX(build_number), 0) + 1
         INTO next_number
         FROM builds
         WHERE pipeline_id = p_pipeline_id;
         RETURN next_number;
       END;
       $$ LANGUAGE plpgsql`
    ];

    for (const func of functions) {
      await this.query(func);
    }

    // Create triggers
    const triggers = [
      'CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      'CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      'CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON plugins FOR EACH ROW EXECUTE FUNCTION update_updated_at()'
    ];

    for (const trigger of triggers) {
      await this.query(trigger.replace('CREATE TRIGGER', 'CREATE TRIGGER IF NOT EXISTS'));
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  isConnected(): boolean {
    return this.connected;
  }
}