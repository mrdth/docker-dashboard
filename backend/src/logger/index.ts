/**
 * Winston logger configuration
 * Provides console output for development, JSON for production
 */

import winston from 'winston';
import { LogEntry, LogLevel } from './types';

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Custom format for console output in development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, error, ...meta }) => {
    let output = `[${timestamp}] ${level}: ${message}`;

    if (context) {
      output += ` | context: ${JSON.stringify(context)}`;
    }

    if (error) {
      output += `\n${error.stack || error.message}`;
    }

    if (Object.keys(meta).length) {
      output += ` | ${JSON.stringify(meta)}`;
    }

    return output;
  })
);

// JSON format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'iso' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const format = isDevelopment ? devFormat : prodFormat;

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format,
  defaultMeta: { service: 'docker-dashboard' },
  transports: [new winston.transports.Console()]
});

/**
 * Log a message with context
 */
export function log(level: LogLevel, message: string, context?: any): void {
  if (context && typeof context === 'object') {
    logger.log(level, message, context);
  } else {
    logger.log(level, message);
  }
}

/**
 * Log error with full details
 */
export function logError(
  message: string,
  error: Error,
  context?: any
): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };

  logger.error(message, {
    error: errorInfo,
    ...context
  });
}

/**
 * Log operation with timing
 */
export function logOperation(
  operation: string,
  level: LogLevel,
  startTime: number,
  context?: any
): void {
  const duration = Date.now() - startTime;
  logger.log(level, `Operation: ${operation}`, {
    duration,
    ...context
  });
}

/**
 * Get raw logger instance for advanced usage
 */
export function getLogger(): winston.Logger {
  return logger;
}

export default logger;
