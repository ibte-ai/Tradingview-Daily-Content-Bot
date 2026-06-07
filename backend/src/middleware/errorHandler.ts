import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { assertNoSecretsExposed } from '../utils/secrets';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log error
  if (isServerError) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Build error response
  const errorResponse: Record<string, unknown> = {
    error: isServerError ? 'Internal Server Error' : err.message,
    code: err.code || 'UNKNOWN_ERROR',
  };

  // Include details only in non-production
  if (process.env.NODE_ENV !== 'production' && err.details) {
    errorResponse.details = err.details;
  }

  // Safety check: ensure no secrets in error response
  const responseStr = JSON.stringify(errorResponse);
  const secretCheck = assertNoSecretsExposed(responseStr);
  if (!secretCheck.safe) {
    logger.error('SECRET LEAK PREVENTED in error response', {
      exposedKeys: secretCheck.exposedKeys,
    });
    res.status(500).json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    return;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Create a typed application error with status code.
 */
export function createError(message: string, statusCode: number, code?: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
