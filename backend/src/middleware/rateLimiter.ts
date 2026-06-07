import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for publishing actions
export const publishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: env.NODE_ENV === 'production' ? 30 : 100,
  message: {
    error: 'Publishing rate limit exceeded',
    message: 'Too many publish requests. Please try again later.',
    code: 'PUBLISH_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
