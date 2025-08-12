import { CLIConfig } from '../config';
import { ApiClient } from '../api-client';
import chalk from 'chalk';
import fs from 'fs/promises';

export async function createCommand(
  type: string,
  options: CLIConfig & {
    name?: string;
    description?: string;
    file?: string;
    template?: string;
  }
): Promise<void> {
  const client = new ApiClient(options);

  try {
    let data: any = {};

    // Load from file if provided
    if (options.file) {
      const fileContent = await fs.readFile(options.file, 'utf-8');
      data = JSON.parse(fileContent);
    } else {
      // Build from options
      if (!options.name) {
        console.error(chalk.red('Name is required when not using --file'));
        process.exit(1);
      }

      data.name = options.name;
      if (options.description) {
        data.description = options.description;
      }
    }

    let result: any;

    switch (type.toLowerCase()) {
      case 'project':
        result = await client.createProject(data);
        console.log(chalk.green(`✓ Project created: ${result.name} (${result.id})`));
        break;

      case 'pipeline':
        if (!data.projectId && !options.project) {
          console.error(chalk.red('Project ID is required for creating a pipeline'));
          process.exit(1);
        }
        data.projectId = data.projectId || options.project;
        result = await client.createPipeline(data);
        console.log(chalk.green(`✓ Pipeline created: ${result.name} (${result.id})`));
        break;

      default:
        console.error(chalk.red(`Cannot create ${type}. Supported types: project, pipeline`));
        process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
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