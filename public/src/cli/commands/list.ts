import { CLIConfig } from '../config';
import { ApiClient } from '../api-client';
import { formatTimestamp } from '../utils/format';
import chalk from 'chalk';

export async function listCommand(
  type: string,
  options: CLIConfig & {
    project?: string;
    status?: string;
    limit?: string;
    sort?: string;
    order?: string;
  }
): Promise<void> {
  const client = new ApiClient(options);

  try {
    const params = {
      projectId: options.project,
      status: options.status,
      limit: options.limit || '20',
      sort: options.sort,
      order: options.order
    };

    let data: any;
    let items: any[] = [];

    switch (type.toLowerCase()) {
      case 'projects':
        data = await client.listProjects(params);
        items = data.data;
        break;
        
      case 'pipelines':
        data = await client.listPipelines(params);
        items = data.data;
        break;
        
      case 'builds':
        data = await client.listBuilds(params);
        items = data.data;
        break;
        
      case 'tasks':
        data = await client.listTasks(params);
        items = data.data;
        break;
        
      case 'workers':
        data = await client.listWorkers(params);
        items = data.data;
        break;
        
      default:
        console.error(chalk.red(`Unknown type: ${type}`));
        console.log('Available types: projects, pipelines, builds, tasks, workers');
        process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      displayItems(type, items);
      
      if (data.pagination) {
        console.log(chalk.gray(`\nShowing ${items.length} of ${data.pagination.total} items`));
      }
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

function displayItems(type: string, items: any[]): void {
  if (items.length === 0) {
    console.log(chalk.yellow(`No ${type} found`));
    return;
  }

  switch (type.toLowerCase()) {
    case 'projects':
      console.log(chalk.bold('Projects:'));
      items.forEach(project => {
        console.log(`\n${chalk.blue(project.name)} (${project.id})`);
        if (project.description) {
          console.log(`  ${project.description}`);
        }
        console.log(`  Pipelines: ${project.pipelineCount || 0}`);
        console.log(`  Created: ${formatTimestamp(project.createdAt)}`);
      });
      break;

    case 'pipelines':
      console.log(chalk.bold('Pipelines:'));
      items.forEach(pipeline => {
        const statusColor = pipeline.status === 'idle' ? 'gray' : 'yellow';
        console.log(`\n${chalk.blue(pipeline.name)} (${pipeline.id})`);
        console.log(`  Status: ${chalk[statusColor](pipeline.status)}`);
        console.log(`  Stages: ${pipeline.stages || 0}`);
        console.log(`  Last run: ${pipeline.lastRun ? formatTimestamp(pipeline.lastRun) : 'Never'}`);
      });
      break;

    case 'builds':
      console.log(chalk.bold('Builds:'));
      items.forEach(build => {
        const statusColor = getStatusColor(build.status);
        console.log(`\n#${build.buildNumber} - ${chalk[statusColor](build.status.toUpperCase())}`);
        console.log(`  Pipeline: ${build.pipelineId}`);
        console.log(`  Duration: ${formatDuration(build.duration)}`);
        console.log(`  Started: ${formatTimestamp(build.startTime || build.createdAt)}`);
      });
      break;

    case 'tasks':
      console.log(chalk.bold('Tasks:'));
      items.forEach(task => {
        const statusColor = getStatusColor(task.status);
        console.log(`\n${chalk.blue(task.name)} (${task.id})`);
        console.log(`  Status: ${chalk[statusColor](task.status.toUpperCase())}`);
        console.log(`  Type: ${task.type}`);
        console.log(`  Duration: ${formatDuration(task.duration)}`);
      });
      break;

    case 'workers':
      console.log(chalk.bold('Workers:'));
      items.forEach(worker => {
        const statusColor = worker.status === 'online' ? 'green' : 
                          worker.status === 'busy' ? 'yellow' : 'red';
        console.log(`\n${chalk.blue(worker.name)} (${worker.id})`);
        console.log(`  Status: ${chalk[statusColor](worker.status.toUpperCase())}`);
        console.log(`  Type: ${worker.type}`);
        console.log(`  Tasks: ${worker.currentTasks.length} active, ${worker.tasksCompleted || 0} completed`);
      });
      break;
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'success':
    case 'online':
      return 'green';
    case 'failed':
    case 'error':
    case 'offline':
      return 'red';
    case 'running':
    case 'busy':
    case 'pending':
      return 'yellow';
    default:
      return 'gray';
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}