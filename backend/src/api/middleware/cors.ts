/**
 * CORS middleware configuration
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../../logger/index';

/**
 * Create CORS middleware with configurable origin
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:5173';
  const origin = req.headers.origin;

  // Allow frontend origin
  if (origin === frontendUrl || !origin) {
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
  } else if (origin) {
    log('warn', 'CORS request from unauthorized origin', {
      service: 'api',
      operation: 'corsMiddleware',
      origin,
      allowedOrigin: frontendUrl
    });
  }

  next();
}
