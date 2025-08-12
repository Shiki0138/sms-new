import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export interface CLIConfig {
  apiUrl: string;
  token?: string;
  project?: string;
  json: boolean;
  verbose: boolean;
}

const configSchema = z.object({
  apiUrl: z.string().url().optional(),
  token: z.string().optional(),
  project: z.string().uuid().optional(),
  defaultEnvironment: z.string().optional(),
  defaults: z.object({
    parallelExecution: z.boolean().optional(),
    cacheEnabled: z.boolean().optional(),
    timeout: z.number().optional()
  }).optional()
});

export async function loadConfig(options: any): Promise<CLIConfig> {
  let fileConfig: any = {};

  // Try to load config file
  if (options.config) {
    try {
      const configPath = path.resolve(options.config);
      const configContent = await fs.readFile(configPath, 'utf-8');
      fileConfig = JSON.parse(configContent);
    } catch (error) {
      // Config file is optional
    }
  }

  // Merge configurations (CLI options override file config)
  const config: CLIConfig = {
    apiUrl: options.apiUrl || fileConfig.apiUrl || 'http://localhost:3000',
    token: options.token || fileConfig.token || process.env.BUILD_SYSTEM_TOKEN,
    project: options.project || fileConfig.project,
    json: options.json || false,
    verbose: options.verbose || false
  };

  return config;
}

export async function saveConfig(config: any, configPath: string): Promise<void> {
  const validated = configSchema.parse(config);
  await fs.writeFile(
    configPath,
    JSON.stringify(validated, null, 2),
    'utf-8'
  );
}