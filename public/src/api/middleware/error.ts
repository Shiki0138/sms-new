import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../core/utils/Logger';

const logger = new Logger('ErrorHandler');

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err as ApiError;

  // If not operational error, log it
  if (!error.isOperational) {
    logger.error('Unexpected error occurred', error, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new ApiError(500, 'Internal Server Error', false);
  }

  // Send error response
  res.status(error.statusCode).json({
    error: {
      message: error.message,
      status: error.statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error.details
      })
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new ApiError(
    404,
    `Resource not found: ${req.method} ${req.path}`,
    true
  );
  next(error);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};