import { logger } from '../config/logger';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Retry a function with exponential backoff and jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (options.retryableErrors && options.retryableErrors.length > 0) {
        const isRetryable = options.retryableErrors.some(
          (re) => lastError.message.includes(re) || lastError.name.includes(re)
        );
        if (!isRetryable) {
          logger.error(`[${label}] Non-retryable error on attempt ${attempt}`, {
            error: lastError.message,
          });
          throw lastError;
        }
      }

      if (attempt === maxAttempts) {
        logger.error(`[${label}] All ${maxAttempts} attempts failed`, {
          error: lastError.message,
        });
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = delay * 0.1 * Math.random();
      const totalDelay = delay + jitter;

      logger.warn(`[${label}] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(totalDelay)}ms`, {
        error: lastError.message,
      });

      options.onRetry?.(attempt, lastError);

      await sleep(totalDelay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
