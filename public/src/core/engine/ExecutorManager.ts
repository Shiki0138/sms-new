import { Task, TaskResult, TaskType } from '../types';
import { Logger } from '../utils/Logger';

export interface Executor {
  execute(task: Task): Promise<TaskResult>;
  cancel(taskId: string): Promise<void>;
  supports(type: TaskType): boolean;
}

export abstract class BaseExecutor implements Executor {
  protected logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  abstract execute(task: Task): Promise<TaskResult>;
  abstract cancel(taskId: string): Promise<void>;
  abstract supports(type: TaskType): boolean;

  protected createResult(
    exitCode: number,
    output: string,
    duration: number,
    error?: string
  ): TaskResult {
    return {
      exitCode,
      output,
      error,
      duration,
      artifacts: [],
      metrics: {}
    };
  }
}

export class ExecutorManager {
  private executors: Map<TaskType, Executor>;
  private defaultExecutor: Executor;
  private logger: Logger;

  constructor() {
    this.executors = new Map();
    this.logger = new Logger('ExecutorManager');
    
    // Initialize with default executors
    this.initializeExecutors();
    
    // Set default executor
    this.defaultExecutor = new ShellExecutor();
  }

  private initializeExecutors(): void {
    // Register built-in executors
    this.register(TaskType.BUILD, new BuildExecutor());
    this.register(TaskType.TEST, new TestExecutor());
    this.register(TaskType.LINT, new LintExecutor());
    this.register(TaskType.DEPLOY, new DeployExecutor());
  }

  register(type: TaskType, executor: Executor): void {
    this.executors.set(type, executor);
    this.logger.info(`Registered executor for ${type}`);
  }

  getExecutor(type: TaskType): Executor {
    const executor = this.executors.get(type);
    if (!executor) {
      this.logger.warn(`No executor found for ${type}, using default`);
      return this.defaultExecutor;
    }
    return executor;
  }

  getActiveWorkers(): number {
    // TODO: Implement worker tracking
    return 0;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down executors');
    // Cleanup executors if needed
  }
}

// Shell Executor - Default executor that runs shell commands
class ShellExecutor extends BaseExecutor {
  private runningProcesses: Map<string, any>;

  constructor() {
    super('ShellExecutor');
    this.runningProcesses = new Map();
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // TODO: Implement shell command execution
      // This is a simplified version
      const output = `Executed: ${task.config.command || task.config.script || 'echo "No command"'}`;
      
      return this.createResult(
        0,
        output,
        Date.now() - startTime
      );
    } catch (error) {
      return this.createResult(
        1,
        '',
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async cancel(taskId: string): Promise<void> {
    const process = this.runningProcesses.get(taskId);
    if (process) {
      // TODO: Implement process cancellation
      this.runningProcesses.delete(taskId);
    }
  }

  supports(type: TaskType): boolean {
    return true; // Shell executor supports all types
  }
}

// Build Executor
class BuildExecutor extends BaseExecutor {
  constructor() {
    super('BuildExecutor');
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // Build-specific logic
      this.logger.info(`Building ${task.name}`);
      
      // TODO: Implement actual build logic
      const output = `Build completed for ${task.name}`;
      
      return this.createResult(
        0,
        output,
        Date.now() - startTime
      );
    } catch (error) {
      return this.createResult(
        1,
        '',
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Build failed'
      );
    }
  }

  async cancel(taskId: string): Promise<void> {
    this.logger.info(`Cancelling build ${taskId}`);
  }

  supports(type: TaskType): boolean {
    return type === TaskType.BUILD;
  }
}

// Test Executor
class TestExecutor extends BaseExecutor {
  constructor() {
    super('TestExecutor');
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // Test-specific logic
      this.logger.info(`Running tests for ${task.name}`);
      
      // TODO: Implement actual test execution
      const output = `Tests passed for ${task.name}`;
      
      return this.createResult(
        0,
        output,
        Date.now() - startTime
      );
    } catch (error) {
      return this.createResult(
        1,
        '',
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Tests failed'
      );
    }
  }

  async cancel(taskId: string): Promise<void> {
    this.logger.info(`Cancelling tests ${taskId}`);
  }

  supports(type: TaskType): boolean {
    return type === TaskType.TEST;
  }
}

// Lint Executor
class LintExecutor extends BaseExecutor {
  constructor() {
    super('LintExecutor');
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // Lint-specific logic
      this.logger.info(`Linting ${task.name}`);
      
      // TODO: Implement actual linting
      const output = `Linting completed for ${task.name}`;
      
      return this.createResult(
        0,
        output,
        Date.now() - startTime
      );
    } catch (error) {
      return this.createResult(
        1,
        '',
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Linting failed'
      );
    }
  }

  async cancel(taskId: string): Promise<void> {
    this.logger.info(`Cancelling lint ${taskId}`);
  }

  supports(type: TaskType): boolean {
    return type === TaskType.LINT;
  }
}

// Deploy Executor
class DeployExecutor extends BaseExecutor {
  constructor() {
    super('DeployExecutor');
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // Deploy-specific logic
      this.logger.info(`Deploying ${task.name}`);
      
      // TODO: Implement actual deployment
      const output = `Deployment completed for ${task.name}`;
      
      return this.createResult(
        0,
        output,
        Date.now() - startTime
      );
    } catch (error) {
      return this.createResult(
        1,
        '',
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Deployment failed'
      );
    }
  }

  async cancel(taskId: string): Promise<void> {
    this.logger.info(`Cancelling deployment ${taskId}`);
  }

  supports(type: TaskType): boolean {
    return type === TaskType.DEPLOY;
  }
}