export interface Task {
  id: string;
  name: string;
  type: TaskType;
  config: TaskConfig;
  dependencies: string[];
  status: TaskStatus;
  result?: TaskResult;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskType {
  BUILD = 'build',
  TEST = 'test',
  LINT = 'lint',
  DEPLOY = 'deploy',
  CUSTOM = 'custom'
}

export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

export interface TaskConfig {
  command?: string;
  script?: string;
  env?: Record<string, string>;
  workingDir?: string;
  timeout?: number;
  retries?: number;
  cache?: CacheConfig;
  resources?: ResourceConfig;
}

export interface TaskResult {
  exitCode: number;
  output: string;
  error?: string;
  duration: number;
  artifacts?: Artifact[];
  metrics?: Record<string, number>;
}

export interface TaskMetadata {
  projectId: string;
  pipelineId: string;
  buildNumber: number;
  triggeredBy: string;
  commit?: CommitInfo;
  labels: Record<string, string>;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  stages: Stage[];
  triggers: Trigger[];
  config: PipelineConfig;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stage {
  id: string;
  name: string;
  tasks: Task[];
  condition?: StageCondition;
  parallel: boolean;
  continueOnError: boolean;
}

export interface Trigger {
  type: TriggerType;
  config: Record<string, any>;
  enabled: boolean;
}

export enum TriggerType {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  GIT_PUSH = 'git_push',
  PULL_REQUEST = 'pull_request'
}

export interface PipelineConfig {
  timeout: number;
  maxRetries: number;
  notifications: NotificationConfig[];
  environment: Record<string, string>;
}

export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Build {
  id: string;
  pipelineId: string;
  buildNumber: number;
  status: BuildStatus;
  stages: StageExecution[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  trigger: TriggerInfo;
  commit?: CommitInfo;
  artifacts: Artifact[];
  logs: LogEntry[];
}

export enum BuildStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface StageExecution {
  stageId: string;
  status: TaskStatus;
  tasks: TaskExecution[];
  startTime: Date;
  endTime?: Date;
}

export interface TaskExecution {
  taskId: string;
  status: TaskStatus;
  result?: TaskResult;
  startTime: Date;
  endTime?: Date;
  attempts: number;
  workerId?: string;
}

export interface Worker {
  id: string;
  name: string;
  type: WorkerType;
  status: WorkerStatus;
  capabilities: string[];
  resources: WorkerResources;
  currentTasks: string[];
  lastHeartbeat: Date;
  metadata: Record<string, any>;
}

export enum WorkerType {
  LOCAL = 'local',
  REMOTE = 'remote',
  CONTAINER = 'container',
  KUBERNETES = 'kubernetes'
}

export enum WorkerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  DRAINING = 'draining',
  ERROR = 'error'
}

export interface WorkerResources {
  cpu: number;
  memory: number;
  disk: number;
  network: NetworkInfo;
}

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  path: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export enum ArtifactType {
  FILE = 'file',
  DIRECTORY = 'directory',
  DOCKER_IMAGE = 'docker_image',
  PACKAGE = 'package',
  REPORT = 'report'
}

export interface CacheConfig {
  key: string;
  paths: string[];
  restore: boolean;
  save: boolean;
  ttl?: number;
}

export interface ResourceConfig {
  cpu?: string;
  memory?: string;
  disk?: string;
  gpu?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  branch: string;
  tags?: string[];
}

export interface TriggerInfo {
  type: TriggerType;
  source: string;
  user?: string;
  data?: Record<string, any>;
}

export interface NotificationConfig {
  type: NotificationType;
  events: NotificationEvent[];
  config: Record<string, any>;
}

export enum NotificationType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms'
}

export enum NotificationEvent {
  BUILD_START = 'build_start',
  BUILD_SUCCESS = 'build_success',
  BUILD_FAILED = 'build_failed',
  STAGE_FAILED = 'stage_failed'
}

export interface StageCondition {
  type: ConditionType;
  expression: string;
}

export enum ConditionType {
  ALWAYS = 'always',
  SUCCESS = 'success',
  FAILURE = 'failure',
  EXPRESSION = 'expression'
}

export interface NetworkInfo {
  bandwidth: number;
  latency: number;
  region: string;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface Plugin {
  name: string;
  version: string;
  author: string;
  description: string;
  type: PluginType;
  capabilities: PluginCapability[];
  config?: Record<string, any>;
}

export enum PluginType {
  EXECUTOR = 'executor',
  NOTIFIER = 'notifier',
  REPORTER = 'reporter',
  SECURITY = 'security',
  INTEGRATION = 'integration'
}

export interface PluginCapability {
  name: string;
  version: string;
  features: string[];
}