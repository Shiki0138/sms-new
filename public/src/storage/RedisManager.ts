import Redis, { ChainableCommander } from 'ioredis';
import { Logger } from '../core/utils/Logger';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | void;
}

export class RedisManager {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private logger: Logger;
  private config: RedisConfig;
  private connected: boolean = false;

  constructor(config: RedisConfig) {
    this.config = config;
    this.logger = new Logger('RedisManager');

    const redisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'build:',
      retryStrategy: config.retryStrategy || this.defaultRetryStrategy,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    };

    // Create Redis clients
    this.client = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);
    this.publisher = new Redis(redisOptions);

    this.setupEventHandlers();
  }

  private defaultRetryStrategy(times: number): number | void {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }

  private setupEventHandlers(): void {
    // Client events
    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.connected = true;
      this.logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });

    this.client.on('close', () => {
      this.connected = false;
      this.logger.info('Redis client connection closed');
    });

    // Subscriber events
    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err);
    });

    this.subscriber.on('message', (channel, message) => {
      this.logger.debug(`Received message on channel ${channel}`);
    });

    // Publisher events
    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.logger.info('Redis connection established');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.client.quit(),
        this.subscriber.quit(),
        this.publisher.quit()
      ]);
      this.connected = false;
      this.logger.info('Redis connections closed');
    } catch (error) {
      this.logger.error('Error closing Redis connections', error);
      throw error;
    }
  }

  // Key-Value operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttl?: number
  ): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.client.del(...key);
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(
    key: string,
    field: string,
    value: string
  ): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async lrange(
    key: string,
    start: number,
    stop: number
  ): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return this.publisher.publish(channel, message);
  }

  async subscribe(
    channel: string | string[],
    callback: (channel: string, message: string) => void
  ): Promise<void> {
    if (Array.isArray(channel)) {
      await this.subscriber.subscribe(...channel);
    } else {
      await this.subscriber.subscribe(channel);
    }
    this.subscriber.on('message', callback);
  }

  async unsubscribe(channel?: string | string[]): Promise<void> {
    if (channel) {
      if (Array.isArray(channel)) {
        await this.subscriber.unsubscribe(...channel);
      } else {
        await this.subscriber.unsubscribe(channel);
      }
    } else {
      await this.subscriber.unsubscribe();
    }
  }

  // Atomic operations
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrby(key: string, increment: number): Promise<number> {
    return this.client.incrby(key, increment);
  }

  // Transaction operations
  multi(): ChainableCommander {
    return this.client.multi();
  }

  // Utility methods
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async flushdb(): Promise<void> {
    await this.client.flushdb();
    this.logger.warn('Flushed Redis database');
  }

  getClient(): Redis {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // JSON helpers
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to parse JSON for key ${key}`, error);
      return null;
    }
  }

  async setJSON<T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    const json = JSON.stringify(value);
    await this.set(key, json, ttl);
  }
}