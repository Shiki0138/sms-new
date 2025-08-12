import { CLIConfig } from '../config';
import { ApiClient } from '../api-client';
import { Logger } from '../../core/utils/Logger';
import { formatDuration, formatTimestamp } from '../utils/format';
import chalk from 'chalk';

const logger = new Logger('CLI:Run');

export async function runCommand(
  pipeline: string | undefined,
  options: CLIConfig & {
    project?: string;
    watch?: boolean;
    env?: string[];
    cache?: boolean;
    parallel?: boolean;
  }
): Promise<void> {
  const client = new ApiClient(options);

  try {
    // Parse environment variables
    const envVars: Record<string, string> = {};
    if (options.env) {
      for (const envVar of options.env) {
        const [key, value] = envVar.split('=');
        if (key && value) {
          envVars[key] = value;
        }
      }
    }

    if (!pipeline) {
      // If no pipeline specified, look for default in current directory
      pipeline = await detectPipeline();
      if (!pipeline) {
        console.error(chalk.red('No pipeline specified and no build configuration found'));
        process.exit(1);
      }
    }

    // Get pipeline details
    const pipelineData = await client.getPipeline(pipeline);
    
    console.log(chalk.blue(`Starting pipeline: ${pipelineData.name}`));
    console.log(chalk.gray(`Pipeline ID: ${pipelineData.id}`));

    // Execute pipeline
    const build = await client.executePipeline(pipelineData.id, {
      environment: envVars,
      noCache: !options.cache,
      parallel: options.parallel
    });

    console.log(chalk.green(`✓ Build started: #${build.buildNumber}`));
    console.log(chalk.gray(`Build ID: ${build.id}`));

    // Monitor build progress
    if (!options.json) {
      await monitorBuild(client, build.id);
    } else {
      console.log(JSON.stringify(build, null, 2));
    }

    // Watch mode
    if (options.watch) {
      console.log(chalk.yellow('\nWatch mode enabled. Press Ctrl+C to exit.'));
      await watchForChanges(client, pipelineData.id, options);
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

async function detectPipeline(): Promise<string | null> {
  // TODO: Look for build.yaml, build.json, etc. in current directory
  return null;
}

async function monitorBuild(client: ApiClient, buildId: string): Promise<void> {
  let lastStatus = '';
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;

  while (true) {
    const build = await client.getBuild(buildId);
    
    if (build.status !== lastStatus) {
      if (lastStatus) {
        process.stdout.write('\r\x1b[K'); // Clear line
      }
      lastStatus = build.status;
    }

    switch (build.status) {
      case 'pending':
      case 'queued':
        process.stdout.write(`\r${spinner[spinnerIndex]} Build queued...`);
        spinnerIndex = (spinnerIndex + 1) % spinner.length;
        break;
        
      case 'running':
        const progress = calculateProgress(build);
        const progressBar = renderProgressBar(progress);
        process.stdout.write(`\r${spinner[spinnerIndex]} Building ${progressBar} ${progress}%`);
        spinnerIndex = (spinnerIndex + 1) % spinner.length;
        break;
        
      case 'success':
        process.stdout.write('\r\x1b[K');
        console.log(chalk.green(`✓ Build completed successfully in ${formatDuration(build.duration)}`));
        return;
        
      case 'failed':
        process.stdout.write('\r\x1b[K');
        console.log(chalk.red(`✗ Build failed after ${formatDuration(build.duration)}`));
        
        // Show failed tasks
        const failedTasks = build.stages
          .flatMap(s => s.tasks)
          .filter(t => t.status === 'failed');
          
        for (const task of failedTasks) {
          console.log(chalk.red(`  - ${task.name}: Exit code ${task.exitCode}`));
        }
        
        process.exit(1);
        
      case 'cancelled':
        process.stdout.write('\r\x1b[K');
        console.log(chalk.yellow('⚠ Build cancelled'));
        process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function calculateProgress(build: any): number {
  if (!build.stages || build.stages.length === 0) return 0;
  
  let totalTasks = 0;
  let completedTasks = 0;
  
  for (const stage of build.stages) {
    totalTasks += stage.tasks.length;
    completedTasks += stage.tasks.filter(t => 
      ['success', 'failed', 'skipped'].includes(t.status)
    ).length;
  }
  
  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

function renderProgressBar(progress: number, width: number = 20): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return `[${chalk.green('█'.repeat(filled))}${chalk.gray('░'.repeat(empty))}]`;
}

async function watchForChanges(
  client: ApiClient,
  pipelineId: string,
  options: any
): Promise<void> {
  // TODO: Implement file watching
  // Use chokidar or similar to watch for file changes
  // Re-run pipeline when changes detected
}