import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * API key authentication middleware.
 * Requires X-API-Key header or Bearer token matching API_SECRET_KEY.
 * Health endpoints are always public.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Health endpoints are always public
  if (req.path.startsWith('/api/health')) {
    return next();
  }

  // OPTIONS requests (CORS preflight) are always allowed
  if (req.method === 'OPTIONS') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;

  // Check X-API-Key header
  if (apiKey && apiKey === env.API_SECRET_KEY) {
    return next();
  }

  // Check Bearer token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === env.API_SECRET_KEY) {
      return next();
    }
  }

  logger.warn('Unauthorized request blocked', { path: req.path, method: req.method, ip: req.ip });
  res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid API key required. Pass via X-API-Key header or Bearer token.',
  });
}
