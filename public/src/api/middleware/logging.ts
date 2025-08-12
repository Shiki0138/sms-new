import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../core/utils/Logger';

const logger = new Logger('RequestLogger');

export interface RequestLog {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  requestId: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

export const requestLogger = (
  req: Request & { id?: string; startTime?: number },
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID
  req.id = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.startTime = Date.now();

  const requestLog: RequestLog = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    requestId: req.id
  };

  // Log request
  logger.info('Incoming request', requestLog);

  // Capture response details
  const originalSend = res.send;
  res.send = function(data: any): Response {
    res.send = originalSend;
    
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const responseLog = {
      ...requestLog,
      duration,
      statusCode: res.statusCode,
      userId: (req as any).user?.id
    };

    if (res.statusCode >= 400) {
      logger.warn('Request failed', responseLog);
    } else {
      logger.info('Request completed', responseLog);
    }

    return res.send(data);
  };

  next();
};

export const errorLogger = (
  err: Error,
  req: Request & { id?: string },
  _res: Response,
  next: NextFunction
): void => {
  const errorLog = {
    requestId: req.id,
    method: req.method,
    url: req.url,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
  };

  logger.error('Request error', err, errorLog);
  next(err);
};