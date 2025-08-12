import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './error';
import { Logger } from '../../core/utils/Logger';

const logger = new Logger('AuthMiddleware');

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

export const authMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  // Skip auth for public endpoints
  const publicPaths = [
    '/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/docs',
    '/graphql' // GraphQL has its own auth
  ];

  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided', true);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret-change-me';

    // Verify token
    const decoded = jwt.verify(token, secret) as any;

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles || []
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token', true));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired', true));
    } else {
      next(error);
    }
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', true));
    }

    const hasRole = roles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      return next(
        new ApiError(
          403,
          `Forbidden: requires one of roles [${roles.join(', ')}]`,
          true
        )
      );
    }

    next();
  };
};

export const optionalAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret-change-me';
    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles || []
    };
  } catch (error) {
    // Ignore token errors for optional auth
    logger.debug('Optional auth token invalid', { error });
  }

  next();
};