/**
 * Custom error classes for Docker API operations
 */

export class DockerDaemonError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'DOCKER_DAEMON_ERROR') {
    super(message);
    this.name = 'DockerDaemonError';
    this.code = code;
    this.statusCode = 503;
    Object.setPrototypeOf(this, DockerDaemonError.prototype);
  }
}

export class ContainerNotFoundError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly containerId: string;

  constructor(containerId: string) {
    super(`Container not found: ${containerId}`);
    this.name = 'ContainerNotFoundError';
    this.code = 'CONTAINER_NOT_FOUND';
    this.statusCode = 404;
    this.containerId = containerId;
    Object.setPrototypeOf(this, ContainerNotFoundError.prototype);
  }
}

export class MetricsUnavailableError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly containerId: string;

  constructor(containerId: string, reason = 'Metrics unavailable') {
    super(`${reason}: ${containerId}`);
    this.name = 'MetricsUnavailableError';
    this.code = 'METRICS_UNAVAILABLE';
    this.statusCode = 503;
    this.containerId = containerId;
    Object.setPrototypeOf(this, MetricsUnavailableError.prototype);
  }
}

export class ValidationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
    this.fields = fields;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = 'UNAUTHORIZED';
    this.statusCode = 401;
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Type guard to check if error is a known custom error
 */
export function isCustomError(
  error: unknown
): error is DockerDaemonError | ContainerNotFoundError | MetricsUnavailableError | ValidationError | UnauthorizedError {
  return (
    error instanceof DockerDaemonError ||
    error instanceof ContainerNotFoundError ||
    error instanceof MetricsUnavailableError ||
    error instanceof ValidationError ||
    error instanceof UnauthorizedError
  );
}

/**
 * Get HTTP status code for error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isCustomError(error)) {
    return error.statusCode;
  }
  if (error instanceof Error) {
    return 500;
  }
  return 500;
}
