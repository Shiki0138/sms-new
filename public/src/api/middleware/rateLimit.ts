import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiError } from './error';

// Default rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response) => {
    throw new ApiError(
      429,
      'Too many requests from this IP, please try again later',
      true
    );
  },
  skip: (_req: Request) => {
    // Skip rate limiting for health checks
    return _req.path === '/health';
  }
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response) => {
    throw new ApiError(
      429,
      'Too many authentication attempts, please try again later',
      true
    );
  }
});

// API rate limiter with higher limits
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response) => {
    throw new ApiError(
      429,
      'API rate limit exceeded, please slow down',
      true
    );
  }
});

// Create custom rate limiter
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, _res: Response) => {
      throw new ApiError(
        429,
        options.message || 'Rate limit exceeded',
        true
      );
    }
  });
};