import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnectionOpts } from '../config/redis';
import { logger } from '../config/logger';
import { analyzeChart } from '../services/ai.service';
import { generatePlatformCaptions } from '../services/caption.service';
import { getSupabaseClient } from '../config/database';

const QUEUE_NAME = 'analysis-queue';

let queue: Queue | null = null;

export function getAnalysisQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnectionOpts() as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
  }
  return queue;
}

export interface AnalysisJobData {
  postId: string;
  symbol: string;
  screenshotPath: string;
  screenshotUrl: string;
}

/**
 * Add an AI analysis job to the queue.
 */
export async function enqueueAnalysis(data: AnalysisJobData): Promise<string> {
  const q = getAnalysisQueue();
  const job = await q.add('analyze', data, {
    jobId: `analysis-${data.postId}`,
  });
  logger.info('Analysis job enqueued', { jobId: job.id, postId: data.postId });
  return job.id!;
}

/**
 * Start the analysis worker.
 */
export function startAnalysisWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<AnalysisJobData>) => {
      const { postId, symbol, screenshotPath } = job.data;
      logger.info('Processing analysis job', { jobId: job.id, postId, symbol });

      const supabase = getSupabaseClient();

      // Update status
      await supabase.from('posts').update({ status: 'analyzing' }).eq('id', postId);

      // Run AI analysis
      const analysis = await analyzeChart(screenshotPath);

      // Generate platform-specific captions
      const captions = generatePlatformCaptions(analysis, symbol);

      // Default to the Instagram caption as the primary (most concise)
      const primaryCaption = captions.instagram;

      // Update post with analysis results
      await supabase
        .from('posts')
        .update({
          ai_analysis: analysis,
          caption: primaryCaption,
          hashtags: analysis.hashtags,
          risk_note: analysis.risk_note,
          status: 'pending_review',
        })
        .eq('id', postId);

      // Audit log
      await supabase.from('audit_logs').insert({
        post_id: postId,
        action: 'ai_analyzed',
        details: {
          model: process.env.AI_PRIMARY_MODEL || 'gemini',
          trend: analysis.market_trend,
          confidence: analysis.confidence,
          captionLengths: {
            facebook: captions.facebook.length,
            instagram: captions.instagram.length,
            whatsapp: captions.whatsapp.length,
          },
        },
        status: 'success',
      });

      logger.info('Analysis job completed', {
        postId,
        trend: analysis.market_trend,
      });

      return { postId, analysis, captions };
    },
    {
      connection: getRedisConnectionOpts() as any,
      concurrency: 1, // AI calls are expensive, limit concurrency
    }
  );

  worker.on('failed', async (job, err) => {
    logger.error('Analysis job failed', {
      jobId: job?.id,
      postId: job?.data?.postId,
      error: err.message,
    });

    if (job?.data?.postId) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('posts')
          .update({ status: 'failed', error_log: { analysis: err.message } })
          .eq('id', job.data.postId);

        await supabase.from('audit_logs').insert({
          post_id: job.data.postId,
          action: 'ai_analysis_failed',
          status: 'failure',
          error_message: err.message,
        });
      } catch {}
    }
  });

  logger.info('Analysis worker started');
  return worker;
}
