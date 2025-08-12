import { EventEmitter } from 'events';
import { Plugin, PluginType, PluginCapability } from '../core/types';
import { Logger } from '../core/utils/Logger';

export interface PluginContext {
  logger: Logger;
  config: Record<string, any>;
  emit: (event: string, data: any) => void;
}

export interface PluginInstance {
  plugin: Plugin;
  instance: any;
  loaded: boolean;
  error?: Error;
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance>;
  private logger: Logger;
  private pluginDirectory: string;

  constructor(pluginDirectory: string = './plugins') {
    super();
    this.plugins = new Map();
    this.logger = new Logger('PluginManager');
    this.pluginDirectory = pluginDirectory;
  }

  async loadPlugins(): Promise<void> {
    this.logger.info('Loading plugins...');
    
    // In a real implementation, this would scan the plugin directory
    // and load plugins dynamically
    
    // Load built-in plugins
    await this.loadBuiltInPlugins();
    
    this.logger.info(`Loaded ${this.plugins.size} plugins`);
  }

  private async loadBuiltInPlugins(): Promise<void> {
    // Register built-in plugins
    const builtInPlugins: Plugin[] = [
      {
        name: 'docker-executor',
        version: '1.0.0',
        author: 'Build System Team',
        description: 'Docker-based task executor',
        type: PluginType.EXECUTOR,
        capabilities: [
          {
            name: 'docker',
            version: '1.0.0',
            features: ['build', 'run', 'push']
          }
        ]
      },
      {
        name: 'slack-notifier',
        version: '1.0.0',
        author: 'Build System Team',
        description: 'Slack notification plugin',
        type: PluginType.NOTIFIER,
        capabilities: [
          {
            name: 'slack',
            version: '1.0.0',
            features: ['message', 'channel', 'webhook']
          }
        ]
      },
      {
        name: 'junit-reporter',
        version: '1.0.0',
        author: 'Build System Team',
        description: 'JUnit test report generator',
        type: PluginType.REPORTER,
        capabilities: [
          {
            name: 'junit',
            version: '1.0.0',
            features: ['xml', 'html']
          }
        ]
      }
    ];

    for (const plugin of builtInPlugins) {
      await this.register(plugin);
    }
  }

  async register(plugin: Plugin): Promise<void> {
    try {
      // Create plugin context
      const context: PluginContext = {
        logger: new Logger(`Plugin:${plugin.name}`),
        config: plugin.config || {},
        emit: (event: string, data: any) => {
          this.emit(`plugin:${plugin.name}:${event}`, data);
        }
      };

      // Create plugin instance
      const instance = await this.createPluginInstance(plugin, context);

      this.plugins.set(plugin.name, {
        plugin,
        instance,
        loaded: true
      });

      this.logger.info(`Registered plugin: ${plugin.name} v${plugin.version}`);
      this.emit('plugin:registered', plugin);
    } catch (error) {
      this.logger.error(`Failed to register plugin: ${plugin.name}`, error);
      
      this.plugins.set(plugin.name, {
        plugin,
        instance: null,
        loaded: false,
        error: error as Error
      });

      this.emit('plugin:error', { plugin, error });
    }
  }

  private async createPluginInstance(
    plugin: Plugin,
    context: PluginContext
  ): Promise<any> {
    // In a real implementation, this would dynamically load and instantiate
    // the plugin based on its type and configuration
    
    switch (plugin.type) {
      case PluginType.EXECUTOR:
        return new ExecutorPlugin(context);
      case PluginType.NOTIFIER:
        return new NotifierPlugin(context);
      case PluginType.REPORTER:
        return new ReporterPlugin(context);
      case PluginType.SECURITY:
        return new SecurityPlugin(context);
      case PluginType.INTEGRATION:
        return new IntegrationPlugin(context);
      default:
        throw new Error(`Unknown plugin type: ${plugin.type}`);
    }
  }

  async unregister(pluginName: string): Promise<void> {
    const pluginInstance = this.plugins.get(pluginName);
    if (!pluginInstance) {
      return;
    }

    try {
      // Call cleanup method if available
      if (pluginInstance.instance && typeof pluginInstance.instance.cleanup === 'function') {
        await pluginInstance.instance.cleanup();
      }

      this.plugins.delete(pluginName);
      this.logger.info(`Unregistered plugin: ${pluginName}`);
      this.emit('plugin:unregistered', pluginInstance.plugin);
    } catch (error) {
      this.logger.error(`Failed to unregister plugin: ${pluginName}`, error);
      throw error;
    }
  }

  getPlugin(name: string): PluginInstance | undefined {
    return this.plugins.get(name);
  }

  getPluginsByType(type: PluginType): PluginInstance[] {
    const plugins: PluginInstance[] = [];
    
    for (const instance of this.plugins.values()) {
      if (instance.plugin.type === type && instance.loaded) {
        plugins.push(instance);
      }
    }
    
    return plugins;
  }

  getPluginsWithCapability(capability: string): PluginInstance[] {
    const plugins: PluginInstance[] = [];
    
    for (const instance of this.plugins.values()) {
      if (instance.loaded && 
          instance.plugin.capabilities.some(cap => cap.name === capability)) {
        plugins.push(instance);
      }
    }
    
    return plugins;
  }

  async executeHook(hookName: string, data: any): Promise<any[]> {
    const results: any[] = [];
    
    for (const instance of this.plugins.values()) {
      if (!instance.loaded || !instance.instance) {
        continue;
      }

      // Check if plugin implements the hook
      if (typeof instance.instance[hookName] === 'function') {
        try {
          const result = await instance.instance[hookName](data);
          results.push(result);
        } catch (error) {
          this.logger.error(
            `Plugin ${instance.plugin.name} failed to execute hook ${hookName}`,
            error
          );
        }
      }
    }
    
    return results;
  }

  getLoadedPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(instance => instance.loaded)
      .map(instance => instance.plugin);
  }

  getFailedPlugins(): { plugin: Plugin; error: Error }[] {
    return Array.from(this.plugins.values())
      .filter(instance => !instance.loaded && instance.error)
      .map(instance => ({ 
        plugin: instance.plugin, 
        error: instance.error! 
      }));
  }
}

// Base plugin classes for different plugin types
class ExecutorPlugin {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async execute(task: any): Promise<any> {
    this.context.logger.info('Executing task with plugin');
    // Implementation would go here
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up executor plugin');
  }
}

class NotifierPlugin {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async notify(event: string, data: any): Promise<void> {
    this.context.logger.info(`Sending notification for ${event}`);
    // Implementation would go here
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up notifier plugin');
  }
}

class ReporterPlugin {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async generateReport(data: any): Promise<any> {
    this.context.logger.info('Generating report');
    // Implementation would go here
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up reporter plugin');
  }
}

class SecurityPlugin {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async scan(target: any): Promise<any> {
    this.context.logger.info('Running security scan');
    // Implementation would go here
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up security plugin');
  }
}

class IntegrationPlugin {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async integrate(service: string, config: any): Promise<void> {
    this.context.logger.info(`Integrating with ${service}`);
    // Implementation would go here
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up integration plugin');
  }
}