#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../../package.json';
import { Logger } from '../core/utils/Logger';
import { CLIConfig, loadConfig } from './config';
import { runCommand } from './commands/run';
import { listCommand } from './commands/list';
import { createCommand } from './commands/create';
import { statusCommand } from './commands/status';
import { logsCommand } from './commands/logs';
import { deployCommand } from './commands/deploy';

const logger = new Logger('CLI');

const program = new Command();

program
  .name('build-system')
  .description('Modern Build System CLI - Cloud-native build automation')
  .version(version);

// Global options
program
  .option('-c, --config <path>', 'Path to configuration file', './build.config.json')
  .option('--api-url <url>', 'API server URL', process.env.BUILD_SYSTEM_API || 'http://localhost:3000')
  .option('--token <token>', 'Authentication token', process.env.BUILD_SYSTEM_TOKEN)
  .option('--json', 'Output in JSON format', false)
  .option('--verbose', 'Enable verbose logging', false);

// Run command
program
  .command('run [pipeline]')
  .description('Execute a pipeline or task')
  .option('-p, --project <id>', 'Project ID')
  .option('-w, --watch', 'Watch for file changes')
  .option('-e, --env <vars...>', 'Environment variables (KEY=VALUE)')
  .option('--no-cache', 'Disable caching')
  .option('--parallel', 'Run tasks in parallel when possible')
  .action(async (pipeline, options) => {
    try {
      const config = await loadConfig(program.opts());
      await runCommand(pipeline, { ...options, ...config });
    } catch (error) {
      logger.error('Run command failed', error as Error);
      process.exit(1);
    }
  });

// List command
program
  .command('list <type>')
  .description('List pipelines, builds, tasks, or projects')
  .option('-p, --project <id>', 'Filter by project ID')
  .option('-s, --status <status>', 'Filter by status')
  .option('-l, --limit <number>', 'Limit results', '20')
  .option('--sort <field>', 'Sort by field')
  .option('--order <direction>', 'Sort order (asc/desc)', 'desc')
  .action(async (type, options) => {
    try {
      const config = await loadConfig(program.opts());
      await listCommand(type, { ...options, ...config });
    } catch (error) {
      logger.error('List command failed', error as Error);
      process.exit(1);
    }
  });

// Create command
program
  .command('create <type>')
  .description('Create a new pipeline, project, or task')
  .option('-n, --name <name>', 'Resource name')
  .option('-d, --description <desc>', 'Resource description')
  .option('-f, --file <path>', 'Load from file')
  .option('--template <name>', 'Use template')
  .action(async (type, options) => {
    try {
      const config = await loadConfig(program.opts());
      await createCommand(type, { ...options, ...config });
    } catch (error) {
      logger.error('Create command failed', error as Error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status [resource]')
  .description('Show status of builds, workers, or system')
  .option('-i, --id <id>', 'Resource ID')
  .option('-f, --follow', 'Follow status updates')
  .option('--interval <seconds>', 'Update interval', '5')
  .action(async (resource, options) => {
    try {
      const config = await loadConfig(program.opts());
      await statusCommand(resource || 'system', { ...options, ...config });
    } catch (error) {
      logger.error('Status command failed', error as Error);
      process.exit(1);
    }
  });

// Logs command
program
  .command('logs <buildId>')
  .description('View build or task logs')
  .option('-t, --task <id>', 'Filter by task ID')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --tail <lines>', 'Number of lines to show', '100')
  .option('--level <level>', 'Filter by log level')
  .option('--since <time>', 'Show logs since timestamp')
  .action(async (buildId, options) => {
    try {
      const config = await loadConfig(program.opts());
      await logsCommand(buildId, { ...options, ...config });
    } catch (error) {
      logger.error('Logs command failed', error as Error);
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy <environment>')
  .description('Deploy to an environment')
  .option('-p, --pipeline <id>', 'Pipeline to deploy')
  .option('-b, --build <id>', 'Specific build to deploy')
  .option('--dry-run', 'Perform a dry run')
  .option('--force', 'Force deployment')
  .action(async (environment, options) => {
    try {
      const config = await loadConfig(program.opts());
      await deployCommand(environment, { ...options, ...config });
    } catch (error) {
      logger.error('Deploy command failed', error as Error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage CLI configuration')
  .option('--init', 'Initialize configuration')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set configuration value')
  .action(async (options) => {
    try {
      if (options.init) {
        console.log('Configuration initialized at ./build.config.json');
      } else if (options.show) {
        const config = await loadConfig(program.opts());
        console.log(JSON.stringify(config, null, 2));
      } else if (options.set) {
        console.log('Configuration updated');
      } else {
        program.help();
      }
    } catch (error) {
      logger.error('Config command failed', error as Error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}