import { CLIConfig } from '../config';
import { ApiClient } from '../api-client';
import chalk from 'chalk';

export async function logsCommand(
  buildId: string,
  options: CLIConfig & {
    task?: string;
    follow?: boolean;
    tail?: string;
    level?: string;
    since?: string;
  }
): Promise<void> {
  const client = new ApiClient(options);

  try {
    if (options.follow) {
      await followLogs(client, buildId, options);
    } else {
      await showLogs(client, buildId, options);
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

async function showLogs(client: ApiClient, buildId: string, options: any): Promise<void> {
  const params: any = {
    taskId: options.task,
    level: options.level,
    tail: options.tail
  };

  const data = await client.getBuildLogs(buildId, params);

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(chalk.bold(`Logs for build ${buildId}\n`));

  if (data.logs.length === 0) {
    console.log(chalk.yellow('No logs found'));
    return;
  }

  data.logs.forEach((log: any) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const levelColor = getLogLevelColor(log.level);
    const level = log.level.toUpperCase().padEnd(5);
    
    console.log(
      chalk.gray(timestamp) + ' ' +
      chalk[levelColor](level) + ' ' +
      chalk.cyan(`[${log.source}]`) + ' ' +
      log.message
    );
  });

  if (data.logs.length < data.total) {
    console.log(chalk.gray(`\nShowing last ${data.logs.length} of ${data.total} log entries`));
  }
}

async function followLogs(client: ApiClient, buildId: string, options: any): Promise<void> {
  console.log(chalk.gray(`Following logs for build ${buildId}... (Ctrl+C to stop)\n`));

  // In a real implementation, this would use WebSocket for real-time logs
  // For now, we'll poll the API
  let lastTimestamp: string | undefined;

  while (true) {
    try {
      const params: any = {
        taskId: options.task,
        level: options.level,
        since: lastTimestamp
      };

      const data = await client.getBuildLogs(buildId, params);

      if (data.logs.length > 0) {
        data.logs.forEach((log: any) => {
          const timestamp = new Date(log.timestamp).toLocaleTimeString();
          const levelColor = getLogLevelColor(log.level);
          const level = log.level.toUpperCase().padEnd(5);
          
          console.log(
            chalk.gray(timestamp) + ' ' +
            chalk[levelColor](level) + ' ' +
            chalk.cyan(`[${log.source}]`) + ' ' +
            log.message
          );
        });

        lastTimestamp = data.logs[data.logs.length - 1].timestamp;
      }

      // Check if build is still running
      const build = await client.getBuild(buildId);
      if (['success', 'failed', 'cancelled'].includes(build.status)) {
        console.log(chalk.gray(`\nBuild ${build.status}. Log streaming stopped.`));
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(chalk.red(`Error streaming logs: ${(error as Error).message}`));
      break;
    }
  }
}

function getLogLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
      return 'red';
    case 'warn':
      return 'yellow';
    case 'info':
      return 'blue';
    case 'debug':
      return 'gray';
    default:
      return 'white';
  }
}