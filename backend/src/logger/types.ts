/**
 * Logger type definitions
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly';

export interface LogContext {
  service?: string;
  operation?: string;
  containerId?: string;
  userId?: string;
  traceId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number; // milliseconds
  [key: string]: unknown;
}
