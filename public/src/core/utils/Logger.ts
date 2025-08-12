import pino from 'pino';

export interface LoggerOptions {
  level?: string;
  prettyPrint?: boolean;
  destination?: string;
}

export class Logger {
  private logger: pino.Logger;
  private context: string;

  constructor(context: string, options?: LoggerOptions) {
    this.context = context;
    
    const pinoOptions: pino.LoggerOptions = {
      name: context,
      level: options?.level || process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label };
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: ['password', 'token', 'secret', 'authorization'],
        censor: '[REDACTED]'
      }
    };

    if (options?.prettyPrint || process.env.NODE_ENV === 'development') {
      pinoOptions.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      };
    }

    this.logger = pino(pinoOptions);
  }

  debug(message: string, ...args: any[]): void {
    this.logger.debug({ context: this.context, ...args[0] }, message);
  }

  info(message: string, ...args: any[]): void {
    this.logger.info({ context: this.context, ...args[0] }, message);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn({ context: this.context, ...args[0] }, message);
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    const errorObj = error instanceof Error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : error;

    this.logger.error(
      { context: this.context, ...errorObj, ...args[0] },
      message
    );
  }

  fatal(message: string, error?: Error | any, ...args: any[]): void {
    const errorObj = error instanceof Error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : error;

    this.logger.fatal(
      { context: this.context, ...errorObj, ...args[0] },
      message
    );
  }

  child(bindings: Record<string, any>): Logger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(bindings);
    return childLogger;
  }

  setLevel(level: string): void {
    this.logger.level = level;
  }

  isLevelEnabled(level: string): boolean {
    return this.logger.isLevelEnabled(level);
  }

  static createLogger(context: string, options?: LoggerOptions): Logger {
    return new Logger(context, options);
  }

  static configureGlobal(options: LoggerOptions): void {
    if (options.level) {
      process.env.LOG_LEVEL = options.level;
    }
  }
}