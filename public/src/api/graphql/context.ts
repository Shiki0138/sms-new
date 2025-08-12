import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../../core/utils/Logger';

const logger = new Logger('GraphQLContext');

export interface GraphQLContext {
  req: Request;
  res: Response;
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  dataSources?: any;
}

export const createContext = async ({ req, res }: { req: Request; res: Response }): Promise<GraphQLContext> => {
  const context: GraphQLContext = { req, res };

  // Extract user from JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret-change-me'
      ) as any;

      context.user = {
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles || []
      };
    } catch (error) {
      logger.debug('Invalid auth token in GraphQL context', { error });
    }
  }

  // TODO: Add data sources
  // context.dataSources = {
  //   pipelineAPI: new PipelineAPI(),
  //   buildAPI: new BuildAPI()
  // };

  return context;
};