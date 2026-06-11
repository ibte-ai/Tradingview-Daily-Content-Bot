import { getSupabaseClient } from '../config/database';
import { scheduleJob } from './scheduler.service';
import { v4 as uuidv4 } from 'uuid';
import { enqueueScreenshot } from '../workers/screenshot.worker';
import { logger } from '../config/logger';

/**
 * Initialize daily automation scheduler based on database settings.
 */
export async function startCronScheduler(): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Query application settings
    const { data: settingsData, error } = await supabase.from('settings').select('*');
    if (error) {
      logger.error('Failed to load settings for cron scheduler', { error: error.message });
      return;
    }

    const settingsMap = new Map((settingsData || []).map((s: any) => [s.key, s.value]));

    // Read cron expression setting (stored as JSON string)
    const rawCron = settingsMap.get('cron_expression');
    const cronExpr = rawCron ? JSON.parse(rawCron) : '0 8 * * *';

    // Read default symbol setting (stored as JSON string)
    const rawSymbol = settingsMap.get('default_symbol');
    const defaultSymbol = rawSymbol ? JSON.parse(rawSymbol) : 'BTCUSD';

    logger.info(`Initializing daily automated post job`, { symbol: defaultSymbol, cron: cronExpr });

    const success = scheduleJob('daily-bot-job', defaultSymbol, cronExpr, async (symbol) => {
      logger.info(`Daily scheduler triggered for symbol: ${symbol}`);
      const postId = uuidv4();

      // Create new draft post
      const { error: postErr } = await supabase.from('posts').insert({
        id: postId,
        symbol: symbol.toUpperCase(),
        status: 'draft',
      });

      if (postErr) {
        logger.error('Failed to create post from cron trigger', { error: postErr.message });
        return;
      }

      // Add audit log
      await supabase.from('audit_logs').insert({
        post_id: postId,
        action: 'post_created_by_cron',
        details: { symbol, cronExpression: cronExpr },
        status: 'success',
      });

      // Enqueue capture job
      await enqueueScreenshot({ postId, symbol });
      logger.info(`Automated cron pipeline kicked off successfully`, { postId, symbol });
    });

    if (success) {
      logger.info('Daily bot cron job registered successfully');
    } else {
      logger.error('Daily bot cron job registration failed');
    }
  } catch (err) {
    logger.error('Error starting cron scheduler service', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
