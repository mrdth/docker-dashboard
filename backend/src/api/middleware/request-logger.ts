/**
 * Request logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../../logger/index';

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const originalSend = res.send;

  // Intercept response to log status code
  res.send = function (data) {
    const duration = Date.now() - startTime;

    log('info', `${req.method} ${req.path}`, {
      service: 'api',
      operation: 'request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });

    return originalSend.call(this, data);
  };

  next();
}
