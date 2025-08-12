import crypto from 'crypto';
import { Task, TaskResult, CacheConfig } from '../types';
import { Logger } from '../utils/Logger';

interface CacheEntry {
  key: string;
  result: TaskResult;
  timestamp: Date;
  ttl?: number;
  checksum: string;
}

export class CacheManager {
  private cache: Map<string, CacheEntry>;
  private logger: Logger;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600000) {
    this.cache = new Map();
    this.logger = new Logger('CacheManager');
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  async get(task: Task): Promise<TaskResult | null> {
    if (!task.config.cache) {
      return null;
    }

    const cacheKey = this.generateCacheKey(task);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.logger.debug(`Cache miss for task ${task.id}`);
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      this.logger.debug(`Cache expired for task ${task.id}`);
      return null;
    }

    // Verify checksum
    const currentChecksum = await this.calculateChecksum(task);
    if (entry.checksum !== currentChecksum) {
      this.cache.delete(cacheKey);
      this.logger.debug(`Cache invalidated due to checksum mismatch for task ${task.id}`);
      return null;
    }

    this.logger.debug(`Cache hit for task ${task.id}`);
    return entry.result;
  }

  async set(task: Task, result: TaskResult): Promise<void> {
    if (!task.config.cache) {
      return;
    }

    // Ensure cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const cacheKey = this.generateCacheKey(task);
    const checksum = await this.calculateChecksum(task);
    const ttl = task.config.cache.ttl || this.defaultTTL;

    const entry: CacheEntry = {
      key: cacheKey,
      result,
      timestamp: new Date(),
      ttl,
      checksum
    };

    this.cache.set(cacheKey, entry);
    this.logger.debug(`Cached result for task ${task.id}`);
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.logger.info('Cache cleared');
      return;
    }

    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.logger.info(`Invalidated ${keysToDelete.length} cache entries`);
  }

  private generateCacheKey(task: Task): string {
    const cacheConfig = task.config.cache!;
    const keyParts = [
      task.type,
      task.name,
      cacheConfig.key,
      JSON.stringify(task.config.env || {}),
      task.config.workingDir || ''
    ];

    return crypto
      .createHash('sha256')
      .update(keyParts.join(':'))
      .digest('hex');
  }

  private async calculateChecksum(task: Task): Promise<string> {
    const cacheConfig = task.config.cache!;
    
    // In a real implementation, this would calculate checksums
    // of the specified paths/files
    const checksumData = [
      task.type,
      task.name,
      JSON.stringify(task.config),
      cacheConfig.key
    ].join(':');

    return crypto
      .createHash('sha256')
      .update(checksumData)
      .digest('hex');
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) {
      return false;
    }

    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return now - entryTime > entry.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache) {
        if (this.isExpired(entry)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.cache.delete(key));

      if (keysToDelete.length > 0) {
        this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
      }
    }, 60000); // Run every minute
  }

  getStats(): {
    size: number;
    hitRate: number;
    missRate: number;
  } {
    // In a real implementation, we would track hits and misses
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit tracking
      missRate: 0  // TODO: Implement miss tracking
    };
  }

  clear(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }
}