import { EventEmitter } from 'events';
import { Task, TaskStatus, TaskResult, TaskExecution, TaskType } from '../types';
import { DependencyResolver } from './DependencyResolver';
import { TaskScheduler } from './TaskScheduler';
import { ExecutorManager } from './ExecutorManager';
import { CacheManager } from './CacheManager';
import { Logger } from '../utils/Logger';

export interface TaskEngineOptions {
  maxConcurrent: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCache: boolean;
}

export class TaskEngine extends EventEmitter {
  private options: TaskEngineOptions;
  private dependencyResolver: DependencyResolver;
  private scheduler: TaskScheduler;
  private executorManager: ExecutorManager;
  private cacheManager: CacheManager;
  private logger: Logger;
  private runningTasks: Map<string, TaskExecution>;

  constructor(options: TaskEngineOptions) {
    super();
    this.options = options;
    this.dependencyResolver = new DependencyResolver();
    this.scheduler = new TaskScheduler(options.maxConcurrent);
    this.executorManager = new ExecutorManager();
    this.cacheManager = new CacheManager();
    this.logger = new Logger('TaskEngine');
    this.runningTasks = new Map();
  }

  async execute(tasks: Task[]): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();
    
    try {
      // Resolve dependencies and create execution order
      const executionPlan = this.dependencyResolver.resolve(tasks);
      this.logger.info(`Execution plan created with ${executionPlan.length} stages`);

      // Execute tasks in stages
      for (const stage of executionPlan) {
        await this.executeStage(stage, results);
      }

      return results;
    } catch (error) {
      this.logger.error('Task execution failed', error);
      throw error;
    }
  }

  private async executeStage(
    tasks: Task[],
    results: Map<string, TaskResult>
  ): Promise<void> {
    const promises = tasks.map(task => this.executeTask(task, results));
    await Promise.all(promises);
  }

  private async executeTask(
    task: Task,
    results: Map<string, TaskResult>
  ): Promise<void> {
    const execution: TaskExecution = {
      taskId: task.id,
      status: TaskStatus.RUNNING,
      startTime: new Date(),
      attempts: 0
    };

    this.runningTasks.set(task.id, execution);
    this.emit('task:start', { task, execution });

    try {
      // Check cache if enabled
      if (this.options.enableCache && task.config.cache) {
        const cachedResult = await this.cacheManager.get(task);
        if (cachedResult) {
          this.logger.info(`Cache hit for task ${task.id}`);
          execution.status = TaskStatus.SUCCESS;
          execution.result = cachedResult;
          results.set(task.id, cachedResult);
          this.emit('task:cached', { task, result: cachedResult });
          return;
        }
      }

      // Execute task with retries
      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
        execution.attempts = attempt + 1;

        try {
          const result = await this.executeWithTimeout(task);
          execution.status = TaskStatus.SUCCESS;
          execution.result = result;
          results.set(task.id, result);

          // Cache successful result
          if (this.options.enableCache && task.config.cache) {
            await this.cacheManager.set(task, result);
          }

          this.emit('task:success', { task, result });
          return;
        } catch (error) {
          lastError = error as Error;
          this.logger.warn(
            `Task ${task.id} attempt ${attempt + 1} failed: ${lastError.message}`
          );

          if (attempt < this.options.retryAttempts) {
            await this.delay(this.options.retryDelay);
          }
        }
      }

      // All attempts failed
      execution.status = TaskStatus.FAILED;
      const errorResult: TaskResult = {
        exitCode: 1,
        output: '',
        error: lastError?.message || 'Unknown error',
        duration: Date.now() - execution.startTime.getTime()
      };
      execution.result = errorResult;
      results.set(task.id, errorResult);
      this.emit('task:failed', { task, error: lastError });
    } finally {
      execution.endTime = new Date();
      this.runningTasks.delete(task.id);
      this.emit('task:complete', { task, execution });
    }
  }

  private async executeWithTimeout(task: Task): Promise<TaskResult> {
    const timeout = task.config.timeout || this.options.defaultTimeout;
    const executor = this.executorManager.getExecutor(task.type);

    return Promise.race([
      executor.execute(task),
      this.createTimeoutPromise(timeout, task.id)
    ]);
  }

  private createTimeoutPromise(timeout: number, taskId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cancel(taskId: string): Promise<void> {
    const execution = this.runningTasks.get(taskId);
    if (!execution) {
      throw new Error(`Task ${taskId} is not running`);
    }

    // Cancel through executor
    const executor = this.executorManager.getExecutor(TaskType.CUSTOM);
    await executor.cancel(taskId);

    execution.status = TaskStatus.CANCELLED;
    this.runningTasks.delete(taskId);
    this.emit('task:cancelled', { taskId });
  }

  getStatus(): {
    running: number;
    queued: number;
    workers: number;
  } {
    return {
      running: this.runningTasks.size,
      queued: this.scheduler.getQueueSize(),
      workers: this.executorManager.getActiveWorkers()
    };
  }
}