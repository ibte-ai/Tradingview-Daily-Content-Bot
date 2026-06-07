import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnectionOpts } from '../config/redis';
import { logger } from '../config/logger';
import { captureScreenshot } from '../services/screenshot.service';
import { uploadImage } from '../services/cloudinary.service';
import { getSupabaseClient } from '../config/database';

const QUEUE_NAME = 'screenshot-queue';

let queue: Queue | null = null;

export function getScreenshotQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnectionOpts() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { age: 24 * 3600 }, // Keep completed jobs for 24h
        removeOnFail: { age: 7 * 24 * 3600 }, // Keep failed jobs for 7d
      },
    });
  }
  return queue;
}

export interface ScreenshotJobData {
  postId: string;
  symbol: string;
  chartUrl?: string;
}

/**
 * Add a screenshot capture job to the queue.
 */
export async function enqueueScreenshot(data: ScreenshotJobData): Promise<string> {
  const q = getScreenshotQueue();
  const job = await q.add('capture', data, {
    jobId: `screenshot-${data.postId}`,
  });
  logger.info('Screenshot job enqueued', { jobId: job.id, postId: data.postId });
  return job.id!;
}

/**
 * Start the screenshot worker.
 */
export function startScreenshotWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<ScreenshotJobData>) => {
      const { postId, symbol, chartUrl } = job.data;
      logger.info(`Processing screenshot job`, { jobId: job.id, postId, symbol });

      const supabase = getSupabaseClient();

      // Update post status to "capturing"
      await supabase.from('posts').update({ status: 'capturing' }).eq('id', postId);

      // Capture screenshot
      const result = await captureScreenshot({ symbol, chartUrl });

      // Upload to Cloudinary
      const uploadResult = await uploadImage(result.localPath);

      // Update post with screenshot details
      await supabase
        .from('posts')
        .update({
          screenshot_url: uploadResult.secureUrl,
          screenshot_local_path: result.localPath,
          status: 'analyzing',
        })
        .eq('id', postId);

      // Log audit entry
      await supabase.from('audit_logs').insert({
        post_id: postId,
        action: 'screenshot_captured',
        details: {
          fileName: result.fileName,
          cloudinaryUrl: uploadResult.secureUrl,
          publicId: uploadResult.publicId,
        },
        status: 'success',
      });

      logger.info('Screenshot job completed', { postId, url: uploadResult.secureUrl });

      return { postId, screenshotUrl: uploadResult.secureUrl };
    },
    {
      connection: getRedisConnectionOpts() as any,
      concurrency: 2,
    }
  );

  worker.on('failed', async (job, err) => {
    logger.error('Screenshot job failed', {
      jobId: job?.id,
      postId: job?.data?.postId,
      error: err.message,
    });

    if (job?.data?.postId) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('posts')
          .update({ status: 'failed', error_log: { screenshot: err.message } })
          .eq('id', job.data.postId);

        await supabase.from('audit_logs').insert({
          post_id: job.data.postId,
          action: 'screenshot_failed',
          status: 'failure',
          error_message: err.message,
        });
      } catch (dbErr) {
        logger.error('Failed to update post status after screenshot failure', {
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }
    }
  });

  worker.on('completed', (job) => {
    logger.info('Screenshot job completed', { jobId: job.id });
  });

  logger.info('Screenshot worker started');
  return worker;
}
