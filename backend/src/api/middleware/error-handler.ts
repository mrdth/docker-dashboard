/**
 * Global error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logError } from '../../logger/index';
import {
  isCustomError,
  getErrorStatusCode,
  DockerDaemonError,
  ContainerNotFoundError,
  MetricsUnavailableError,
  ValidationError
} from '../../models/errors';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = getErrorStatusCode(error);

  // Log the error
  if (error instanceof Error) {
    logError('Request error', error, {
      service: 'api',
      method: req.method,
      path: req.path,
      statusCode
    });
  }

  // Build error response
  let response: any = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  if (isCustomError(error)) {
    if (error instanceof DockerDaemonError) {
      response = {
        error: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    } else if (error instanceof ContainerNotFoundError) {
      response = {
        error: error.code,
        message: error.message,
        containerId: error.containerId,
        timestamp: new Date().toISOString()
      };
    } else if (error instanceof MetricsUnavailableError) {
      response = {
        error: error.code,
        message: error.message,
        containerId: error.containerId,
        retryAfter: 5,
        timestamp: new Date().toISOString()
      };
    } else if (error instanceof ValidationError) {
      response = {
        error: error.code,
        message: error.message,
        fields: error.fields,
        timestamp: new Date().toISOString()
      };
    }
  } else if (error instanceof Error) {
    response = {
      error: 'Error',
      message: error.message,
      timestamp: new Date().toISOString()
    };

    // Don't expose internal error details in production
    if (process.env.NODE_ENV !== 'production') {
      response.stack = error.stack;
    }
  }

  res.status(statusCode).json(response);
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
