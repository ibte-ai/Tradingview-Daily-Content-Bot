import cron from 'node-cron';
import { logger } from '../config/logger';

interface ScheduledTask {
  id: string;
  symbol: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

const activeTasks: Map<string, ScheduledTask> = new Map();

/**
 * Start a scheduled job that triggers a screenshot + analysis pipeline.
 */
export function scheduleJob(
  id: string,
  symbol: string,
  cronExpression: string,
  onTrigger: (symbol: string) => Promise<void>
): boolean {
  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression}`, { id, symbol });
    return false;
  }

  // Stop existing task if running
  stopJob(id);

  const task = cron.schedule(cronExpression, async () => {
    logger.info(`Scheduled job triggered`, { id, symbol, cronExpression });
    try {
      await onTrigger(symbol);
    } catch (error) {
      logger.error(`Scheduled job failed`, {
        id,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  activeTasks.set(id, { id, symbol, cronExpression, task });
  logger.info(`Scheduled job registered`, { id, symbol, cronExpression });
  return true;
}

/**
 * Stop a scheduled job.
 */
export function stopJob(id: string): void {
  const existing = activeTasks.get(id);
  if (existing) {
    existing.task.stop();
    activeTasks.delete(id);
    logger.info(`Scheduled job stopped`, { id });
  }
}

/**
 * Stop all scheduled jobs.
 */
export function stopAllJobs(): void {
  for (const [id] of activeTasks) {
    stopJob(id);
  }
  logger.info('All scheduled jobs stopped');
}

/**
 * List all active scheduled jobs.
 */
export function listJobs(): Array<{ id: string; symbol: string; cronExpression: string }> {
  return Array.from(activeTasks.values()).map(({ id, symbol, cronExpression }) => ({
    id,
    symbol,
    cronExpression,
  }));
}
