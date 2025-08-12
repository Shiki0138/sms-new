import { CLIConfig } from '../config';
import { ApiClient } from '../api-client';
import { formatDuration, formatBytes } from '../utils/format';
import chalk from 'chalk';

export async function statusCommand(
  resource: string,
  options: CLIConfig & {
    id?: string;
    follow?: boolean;
    interval?: string;
  }
): Promise<void> {
  const client = new ApiClient(options);

  try {
    if (options.follow) {
      await followStatus(client, resource, options);
    } else {
      await showStatus(client, resource, options);
    }
  } catch (error) {
    if (options.json) {
      console.error(JSON.stringify({ error: (error as Error).message }, null, 2));
    } else {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
    }
    process.exit(1);
  }
}

async function showStatus(client: ApiClient, resource: string, options: any): Promise<void> {
  switch (resource.toLowerCase()) {
    case 'system':
      await showSystemStatus(client, options);
      break;
      
    case 'build':
      if (!options.id) {
        console.error(chalk.red('Build ID is required'));
        process.exit(1);
      }
      await showBuildStatus(client, options.id, options);
      break;
      
    case 'worker':
      if (options.id) {
        await showWorkerStatus(client, options.id, options);
      } else {
        await showWorkersStatus(client, options);
      }
      break;
      
    default:
      console.error(chalk.red(`Unknown resource: ${resource}`));
      console.log('Available resources: system, build, worker');
      process.exit(1);
  }
}

async function showSystemStatus(client: ApiClient, options: any): Promise<void> {
  const health = await client.getHealth();
  const metrics = await client.getMetrics('system', { period: '1h' });
  
  if (options.json) {
    console.log(JSON.stringify({ health, metrics }, null, 2));
    return;
  }
  
  console.log(chalk.bold('System Status\n'));
  
  // Health
  const healthColor = health.status === 'healthy' ? 'green' : 'red';
  console.log(`Status: ${chalk[healthColor](health.status.toUpperCase())}`);
  console.log(`Version: ${health.version}`);
  console.log(`Uptime: ${formatDuration(health.uptime * 1000)}`);
  console.log(`Environment: ${health.environment}\n`);
  
  // Current Metrics
  const current = metrics.current;
  console.log(chalk.bold('Resources:'));
  console.log(`CPU: ${current.cpu.loadAverage[0].toFixed(2)} (1m avg)`);
  console.log(`Memory: ${formatBytes(current.memory.used)} / ${formatBytes(current.memory.total)}`);
  console.log(`Platform: ${current.platform.type} ${current.platform.release}`);
}

async function showBuildStatus(client: ApiClient, buildId: string, options: any): Promise<void> {
  const build = await client.getBuild(buildId);
  
  if (options.json) {
    console.log(JSON.stringify(build, null, 2));
    return;
  }
  
  console.log(chalk.bold(`Build #${build.buildNumber}\n`));
  
  const statusColor = getStatusColor(build.status);
  console.log(`Status: ${chalk[statusColor](build.status.toUpperCase())}`);
  console.log(`Pipeline: ${build.pipelineId}`);
  console.log(`Duration: ${formatDuration(build.duration)}`);
  console.log(`Started: ${new Date(build.startTime).toLocaleString()}`);
  
  if (build.endTime) {
    console.log(`Ended: ${new Date(build.endTime).toLocaleString()}`);
  }
  
  if (build.stages && build.stages.length > 0) {
    console.log(chalk.bold('\nStages:'));
    build.stages.forEach((stage: any) => {
      const stageColor = getStatusColor(stage.status);
      console.log(`  ${stage.name}: ${chalk[stageColor](stage.status)} (${formatDuration(stage.duration)})`);
    });
  }
}

async function showWorkerStatus(client: ApiClient, workerId: string, options: any): Promise<void> {
  const worker = await client.getWorker(workerId);
  
  if (options.json) {
    console.log(JSON.stringify(worker, null, 2));
    return;
  }
  
  console.log(chalk.bold(`Worker: ${worker.name}\n`));
  
  const statusColor = worker.status === 'online' ? 'green' : 
                     worker.status === 'busy' ? 'yellow' : 'red';
  console.log(`Status: ${chalk[statusColor](worker.status.toUpperCase())}`);
  console.log(`Type: ${worker.type}`);
  console.log(`Uptime: ${formatDuration(worker.uptime * 1000)}`);
  
  console.log(chalk.bold('\nResources:'));
  console.log(`CPU: ${worker.resources.cpu} cores (${worker.usage?.cpu?.toFixed(1) || 0}% usage)`);
  console.log(`Memory: ${formatBytes(worker.usage?.memory * 1024 * 1024 || 0)} / ${formatBytes(worker.resources.memory * 1024 * 1024)}`);
  
  console.log(chalk.bold('\nStatistics:'));
  console.log(`Tasks completed: ${worker.statistics.tasksCompleted}`);
  console.log(`Success rate: ${(worker.statistics.successRate * 100).toFixed(1)}%`);
  console.log(`Average duration: ${formatDuration(worker.statistics.averageTaskDuration)}`);
  
  if (worker.currentTasks.length > 0) {
    console.log(chalk.bold('\nCurrent Tasks:'));
    worker.currentTasks.forEach((taskId: string) => {
      console.log(`  - ${taskId}`);
    });
  }
}

async function showWorkersStatus(client: ApiClient, options: any): Promise<void> {
  const data = await client.listWorkers();
  const metrics = await client.getMetrics('workers');
  
  if (options.json) {
    console.log(JSON.stringify({ workers: data, metrics }, null, 2));
    return;
  }
  
  console.log(chalk.bold('Worker Pool Status\n'));
  
  const summary = data.summary;
  console.log(`Total: ${summary.total}`);
  console.log(`Online: ${chalk.green(summary.online)}`);
  console.log(`Busy: ${chalk.yellow(summary.busy)}`);
  console.log(`Offline: ${chalk.red(summary.offline)}`);
  
  console.log(chalk.bold('\nUtilization:'));
  console.log(`Current: ${(metrics.utilization.current * 100).toFixed(1)}%`);
  console.log(`Average: ${(metrics.utilization.average * 100).toFixed(1)}%`);
  console.log(`Peak: ${(metrics.utilization.peak * 100).toFixed(1)}%`);
}

async function followStatus(client: ApiClient, resource: string, options: any): Promise<void> {
  const interval = parseInt(options.interval || '5') * 1000;
  
  console.log(chalk.gray(`Following ${resource} status... (Ctrl+C to stop)\n`));
  
  while (true) {
    // Clear screen
    console.clear();
    
    await showStatus(client, resource, { ...options, follow: false });
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
      return 'green';
    case 'failed':
    case 'error':
      return 'red';
    case 'running':
    case 'in_progress':
      return 'yellow';
    case 'pending':
    case 'queued':
      return 'blue';
    default:
      return 'gray';
  }
}