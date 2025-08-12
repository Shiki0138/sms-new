import { EventEmitter } from 'events';
import { Worker, WorkerStatus, WorkerType, WorkerResources } from '../types';
import { Logger } from '../utils/Logger';

export interface WorkerPoolOptions {
  minWorkers: number;
  maxWorkers: number;
  workerTimeout: number;
  autoScale?: boolean;
  scaleThreshold?: number;
}

export class WorkerPool extends EventEmitter {
  private options: WorkerPoolOptions;
  private workers: Map<string, Worker>;
  private logger: Logger;
  private isRunning: boolean;
  private heartbeatInterval?: NodeJS.Timeout;
  private scaleInterval?: NodeJS.Timeout;

  constructor(options: WorkerPoolOptions) {
    super();
    this.options = options;
    this.workers = new Map();
    this.logger = new Logger('WorkerPool');
    this.isRunning = false;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting worker pool');

    // Spawn minimum workers
    await this.spawnWorkers(this.options.minWorkers);

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    // Start auto-scaling if enabled
    if (this.options.autoScale) {
      this.startAutoScaling();
    }

    this.emit('pool:started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping worker pool');

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.scaleInterval) {
      clearInterval(this.scaleInterval);
    }

    // Stop all workers
    await this.stopAllWorkers();

    this.emit('pool:stopped');
  }

  private async spawnWorkers(count: number): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      promises.push(this.spawnWorker());
    }

    await Promise.all(promises);
  }

  private async spawnWorker(): Promise<void> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const worker: Worker = {
      id: workerId,
      name: `Worker ${workerId}`,
      type: WorkerType.LOCAL,
      status: WorkerStatus.ONLINE,
      capabilities: ['build', 'test', 'lint', 'deploy'],
      resources: {
        cpu: 100,
        memory: 1024,
        disk: 10240,
        network: {
          bandwidth: 100,
          latency: 1,
          region: 'us-east-1'
        }
      },
      currentTasks: [],
      lastHeartbeat: new Date(),
      metadata: {}
    };

    this.workers.set(workerId, worker);
    this.logger.info(`Spawned worker ${workerId}`);
    this.emit('worker:spawned', worker);
  }

  private async stopAllWorkers(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [workerId] of this.workers) {
      promises.push(this.stopWorker(workerId));
    }

    await Promise.all(promises);
  }

  private async stopWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    // Mark as offline
    worker.status = WorkerStatus.OFFLINE;
    
    // TODO: Implement graceful shutdown
    // - Wait for current tasks to complete
    // - Clean up resources
    
    this.workers.delete(workerId);
    this.logger.info(`Stopped worker ${workerId}`);
    this.emit('worker:stopped', worker);
  }

  assignTask(taskId: string): string | null {
    // Find available worker with least load
    let selectedWorker: Worker | null = null;
    let minTasks = Infinity;

    for (const worker of this.workers.values()) {
      if (worker.status === WorkerStatus.ONLINE && 
          worker.currentTasks.length < minTasks) {
        minTasks = worker.currentTasks.length;
        selectedWorker = worker;
      }
    }

    if (!selectedWorker) {
      this.logger.warn('No available workers for task assignment');
      return null;
    }

    // Assign task to worker
    selectedWorker.currentTasks.push(taskId);
    if (selectedWorker.currentTasks.length >= 5) {
      selectedWorker.status = WorkerStatus.BUSY;
    }

    this.logger.debug(`Assigned task ${taskId} to worker ${selectedWorker.id}`);
    return selectedWorker.id;
  }

  releaseTask(workerId: string, taskId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    // Remove task from worker
    worker.currentTasks = worker.currentTasks.filter(id => id !== taskId);
    
    // Update status if no longer busy
    if (worker.status === WorkerStatus.BUSY && worker.currentTasks.length < 5) {
      worker.status = WorkerStatus.ONLINE;
    }

    this.logger.debug(`Released task ${taskId} from worker ${workerId}`);
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.options.workerTimeout;

      for (const [workerId, worker] of this.workers) {
        const lastHeartbeat = worker.lastHeartbeat.getTime();
        
        if (now - lastHeartbeat > timeout) {
          this.logger.warn(`Worker ${workerId} missed heartbeat`);
          worker.status = WorkerStatus.ERROR;
          this.emit('worker:unhealthy', worker);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private startAutoScaling(): void {
    this.scaleInterval = setInterval(() => {
      const stats = this.getStats();
      const threshold = this.options.scaleThreshold || 0.8;

      if (stats.utilization > threshold && 
          this.workers.size < this.options.maxWorkers) {
        // Scale up
        this.spawnWorker().catch(err => 
          this.logger.error('Failed to spawn worker during auto-scaling', err)
        );
      } else if (stats.utilization < threshold * 0.5 && 
                 this.workers.size > this.options.minWorkers) {
        // Scale down
        const idleWorker = this.findIdleWorker();
        if (idleWorker) {
          this.stopWorker(idleWorker.id).catch(err =>
            this.logger.error('Failed to stop worker during auto-scaling', err)
          );
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private findIdleWorker(): Worker | null {
    for (const worker of this.workers.values()) {
      if (worker.status === WorkerStatus.ONLINE && 
          worker.currentTasks.length === 0) {
        return worker;
      }
    }
    return null;
  }

  updateHeartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = new Date();
      if (worker.status === WorkerStatus.ERROR) {
        worker.status = WorkerStatus.ONLINE;
        this.emit('worker:recovered', worker);
      }
    }
  }

  getWorker(workerId: string): Worker | undefined {
    return this.workers.get(workerId);
  }

  getWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  getStats(): {
    total: number;
    online: number;
    busy: number;
    error: number;
    utilization: number;
  } {
    let online = 0;
    let busy = 0;
    let error = 0;
    let totalTasks = 0;
    let totalCapacity = 0;

    for (const worker of this.workers.values()) {
      switch (worker.status) {
        case WorkerStatus.ONLINE:
          online++;
          break;
        case WorkerStatus.BUSY:
          busy++;
          break;
        case WorkerStatus.ERROR:
          error++;
          break;
      }
      
      totalTasks += worker.currentTasks.length;
      totalCapacity += 5; // Assuming max 5 tasks per worker
    }

    return {
      total: this.workers.size,
      online,
      busy,
      error,
      utilization: totalCapacity > 0 ? totalTasks / totalCapacity : 0
    };
  }
}