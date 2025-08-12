import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSchema } from './graphql/schema';
import { createContext } from './graphql/context';
import { restRouter } from './rest/router';
import { websocketHandler } from './websocket/handler';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestLogger } from './middleware/logging';
import { rateLimiter } from './middleware/rateLimit';
import { Logger } from '../core/utils/Logger';

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  enableGraphQL: boolean;
  enableREST: boolean;
  enableWebSocket: boolean;
}

export class BuildSystemServer {
  private app: express.Application;
  private httpServer: any;
  private wsServer?: WebSocketServer;
  private apolloServer?: ApolloServer;
  private logger: Logger;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.app = express();
    this.logger = new Logger('Server');
  }

  async start(): Promise<void> {
    // Setup middleware
    this.setupMiddleware();

    // Setup health check first (no auth)
    this.setupHealthCheck();

    // Setup APIs
    if (this.config.enableREST) {
      await this.setupREST();
    }

    if (this.config.enableGraphQL) {
      await this.setupGraphQL();
    }

    // 404 handler
    this.app.use(notFoundHandler);

    // Error handling (must be last)
    this.app.use(errorHandler);

    // Create HTTP server
    this.httpServer = createServer(this.app);

    // Setup WebSocket after server is created
    if (this.config.enableWebSocket) {
      this.setupWebSocket();
    }
    
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, this.config.host, () => {
        this.logger.info(
          `Server started on http://${this.config.host}:${this.config.port}`
        );
        resolve();
      });
    });
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || this.config.corsOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use(rateLimiter);

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', true);
  }

  private setupHealthCheck(): void {
    // Basic health check (no auth required)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    this.logger.info('Health check enabled at /health');
  }

  private async setupREST(): Promise<void> {
    this.app.use('/api/v1', restRouter);
    this.logger.info('REST API enabled at /api/v1');
  }

  private async setupGraphQL(): Promise<void> {
    const schema = await buildSchema();
    
    this.apolloServer = new ApolloServer({
      schema,
      includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development',
      introspection: process.env.NODE_ENV === 'development',
      plugins: [
        {
          async requestDidStart() {
            return {
              async willSendResponse(requestContext) {
                // Add custom headers, logging, etc.
                const { response, contextValue } = requestContext;
                if (response.http) {
                  response.http.headers.set('X-Request-ID', (contextValue as any).req?.id || 'unknown');
                }
              }
            };
          }
        }
      ]
    });

    await this.apolloServer.start();

    this.app.use(
      '/graphql',
      express.json(),
      expressMiddleware(this.apolloServer, {
        context: createContext
      })
    );

    this.logger.info('GraphQL API enabled at /graphql');
  }

  private setupWebSocket(): void {
    this.wsServer = new WebSocketServer({
      server: this.httpServer,
      path: '/ws',
      verifyClient: (info, cb) => {
        // Optional: Verify WebSocket connections
        cb(true);
      }
    });

    this.wsServer.on('connection', websocketHandler);
    this.logger.info('WebSocket enabled at /ws');
  }

  async stop(): Promise<void> {
    if (this.apolloServer) {
      await this.apolloServer.stop();
    }

    if (this.wsServer) {
      this.wsServer.close();
    }

    return new Promise((resolve) => {
      this.httpServer.close(() => {
        this.logger.info('Server stopped');
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  getHttpServer(): any {
    return this.httpServer;
  }
}