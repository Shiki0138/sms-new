import { EventEmitter } from 'events';
import { Task, TaskStatus } from '../types';

interface ScheduledTask {
  task: Task;
  priority: number;
  addedAt: Date;
}

export class TaskScheduler extends EventEmitter {
  private queue: ScheduledTask[];
  private running: Map<string, Task>;
  private maxConcurrent: number;
  private taskCompletion: Map<string, Promise<void>>;

  constructor(maxConcurrent: number) {
    super();
    this.queue = [];
    this.running = new Map();
    this.maxConcurrent = maxConcurrent;
    this.taskCompletion = new Map();
  }

  async schedule(task: Task, priority: number = 0): Promise<void> {
    const scheduledTask: ScheduledTask = {
      task,
      priority,
      addedAt: new Date()
    };

    // Add to queue in priority order
    const insertIndex = this.queue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(scheduledTask);
    } else {
      this.queue.splice(insertIndex, 0, scheduledTask);
    }

    this.emit('task:queued', { task, queueLength: this.queue.length });

    // Try to process queue
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const scheduledTask = this.queue.shift();
      if (!scheduledTask) break;

      const { task } = scheduledTask;
      this.running.set(task.id, task);

      // Create completion promise
      const completionPromise = new Promise<void>((resolve) => {
        const cleanup = () => {
          this.running.delete(task.id);
          this.taskCompletion.delete(task.id);
          this.emit('task:completed', { task });
          resolve();
          this.processQueue();
        };

        // Store cleanup function
        this.once(`task:done:${task.id}`, cleanup);
      });

      this.taskCompletion.set(task.id, completionPromise);
      this.emit('task:started', { task });
    }
  }

  complete(taskId: string): void {
    if (this.running.has(taskId)) {
      this.emit(`task:done:${taskId}`);
    }
  }

  async waitForTask(taskId: string): Promise<void> {
    const completion = this.taskCompletion.get(taskId);
    if (completion) {
      await completion;
    }
  }

  async waitForAll(): Promise<void> {
    const allCompletions = Array.from(this.taskCompletion.values());
    await Promise.all(allCompletions);
  }

  cancel(taskId: string): boolean {
    // Remove from queue if present
    const queueIndex = this.queue.findIndex(item => item.task.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      this.emit('task:cancelled', { taskId });
      return true;
    }

    // If running, emit cancellation event
    if (this.running.has(taskId)) {
      this.emit('task:cancel-requested', { taskId });
      return true;
    }

    return false;
  }

  clear(): void {
    this.queue = [];
    this.emit('queue:cleared');
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getRunningCount(): number {
    return this.running.size;
  }

  getQueuedTasks(): Task[] {
    return this.queue.map(item => item.task);
  }

  getRunningTasks(): Task[] {
    return Array.from(this.running.values());
  }

  isPaused(): boolean {
    return this.maxConcurrent === 0;
  }

  pause(): void {
    this.maxConcurrent = 0;
    this.emit('scheduler:paused');
  }

  resume(maxConcurrent: number): void {
    this.maxConcurrent = maxConcurrent;
    this.emit('scheduler:resumed');
    this.processQueue();
  }

  adjustConcurrency(delta: number): void {
    this.maxConcurrent = Math.max(1, this.maxConcurrent + delta);
    this.emit('concurrency:adjusted', { newValue: this.maxConcurrent });
    
    if (delta > 0) {
      this.processQueue();
    }
  }

  getStats(): {
    queued: number;
    running: number;
    maxConcurrent: number;
    utilization: number;
  } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      maxConcurrent: this.maxConcurrent,
      utilization: this.maxConcurrent > 0 
        ? this.running.size / this.maxConcurrent 
        : 0
    };
  }
}