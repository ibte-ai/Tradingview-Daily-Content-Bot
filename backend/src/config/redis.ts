import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redisClient: Redis | null = null;
let redisAvailable = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  if (env.REDIS_HOST) {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      username: env.REDIS_USERNAME || 'default',
      tls: env.REDIS_TLS ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true, // Don't connect immediately — connect on first use
      retryStrategy(times: number) {
        if (times > 5) {
          logger.warn('Redis: max retries reached, stopping reconnection');
          redisAvailable = false;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 500, 5000);
        logger.warn(`Redis connection retry #${times}, waiting ${delay}ms`);
        return delay;
      },
    });
  } else {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: true,
      lazyConnect: true, // Don't connect immediately — connect on first use
      retryStrategy(times: number) {
        if (times > 5) {
          logger.warn('Redis: max retries reached, stopping reconnection');
          redisAvailable = false;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 500, 5000);
        logger.warn(`Redis connection retry #${times}, waiting ${delay}ms`);
        return delay;
      },
    });
  }

  redisClient.on('connect', () => {
    redisAvailable = true;
    logger.info('Redis connected');
  });

  redisClient.on('ready', () => {
    redisAvailable = true;
    logger.info('Redis ready');
  });

  redisClient.on('error', (err) => {
    redisAvailable = false;
    logger.error('Redis connection error', { error: err.message });
  });

  redisClient.on('close', () => {
    redisAvailable = false;
    logger.warn('Redis connection closed');
  });

  // Attempt connection but don't crash if it fails
  redisClient.connect().catch((err) => {
    redisAvailable = false;
    logger.warn('Redis unavailable — workers will be disabled', { error: err.message });
  });

  return redisClient;
}

/**
 * Get connection options for BullMQ (avoids ioredis type conflicts).
 * BullMQ manages its own ioredis instances internally.
 */
export function getRedisConnectionOpts() {
  if (env.REDIS_HOST) {
    return {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      username: env.REDIS_USERNAME || 'default',
      tls: env.REDIS_TLS ? {} : undefined,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: true,
      retryStrategy(times: number) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 1000, 3000);
      }
    };
  }
  return {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return Math.min(times * 1000, 3000);
    }
  };
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisAvailable = false;
    logger.info('Redis connection closed gracefully');
  }
}

// Export the singleton redis client for general use (e.g. queues)
export const redis = getRedisClient();
