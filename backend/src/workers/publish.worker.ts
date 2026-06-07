import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnectionOpts } from '../config/redis';
import { logger } from '../config/logger';
import { publishToFacebook } from '../services/facebook.service';
import { publishToInstagram } from '../services/instagram.service';
import { sendWhatsAppMessage, generateWhatsAppShareLink } from '../services/whatsapp.service';
import { generatePlatformCaptions } from '../services/caption.service';
import { getSupabaseClient } from '../config/database';

const QUEUE_NAME = 'publish-queue';

let queue: Queue | null = null;

export function getPublishQueue(): Queue {
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

export interface PublishJobData {
  postId: string;
  platform: 'facebook' | 'instagram' | 'whatsapp';
  imageUrl: string;
  caption: string;
  symbol: string;
  whatsappRecipient?: string;
}

/**
 * Add a publishing job to the queue.
 */
export async function enqueuePublish(data: PublishJobData): Promise<string> {
  const q = getPublishQueue();
  const job = await q.add(`publish-${data.platform}`, data, {
    jobId: `publish-${data.platform}-${data.postId}`,
  });
  logger.info('Publish job enqueued', { jobId: job.id, platform: data.platform, postId: data.postId });
  return job.id!;
}

/**
 * Start the publishing worker.
 */
export function startPublishWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<PublishJobData>) => {
      const { postId, platform, imageUrl, caption, symbol, whatsappRecipient } = job.data;
      logger.info('Processing publish job', { jobId: job.id, postId, platform });

      const supabase = getSupabaseClient();

      // Update status to publishing
      await supabase.from('posts').update({ status: 'publishing' }).eq('id', postId);

      let result: Record<string, unknown> = {};

      switch (platform) {
        case 'facebook': {
          const fbResult = await publishToFacebook(imageUrl, caption);
          result = {
            platform: 'facebook',
            status: 'success',
            postId: fbResult.postId,
            postUrl: fbResult.postUrl,
            publishedAt: new Date().toISOString(),
          };
          break;
        }

        case 'instagram': {
          const igResult = await publishToInstagram(imageUrl, caption);
          result = {
            platform: 'instagram',
            status: 'success',
            postId: igResult.postId,
            postUrl: igResult.postUrl,
            publishedAt: new Date().toISOString(),
          };
          break;
        }

        case 'whatsapp': {
          if (whatsappRecipient) {
            const waResult = await sendWhatsAppMessage(whatsappRecipient, imageUrl, caption);
            result = {
              platform: 'whatsapp',
              status: 'success',
              messageId: waResult.messageId,
              publishedAt: new Date().toISOString(),
            };
          } else {
            // Generate share link as fallback
            const shareLink = generateWhatsAppShareLink(caption);
            result = {
              platform: 'whatsapp',
              status: 'success',
              shareLink,
              note: 'WhatsApp Channel posting is not supported via API. Share link generated for manual posting.',
              publishedAt: new Date().toISOString(),
            };
          }
          break;
        }
      }

      // Update the published_platforms JSONB
      const { data: post } = await supabase
        .from('posts')
        .select('published_platforms')
        .eq('id', postId)
        .single();

      const publishedPlatforms = (post?.published_platforms as Record<string, unknown>) || {};
      publishedPlatforms[platform] = result;

      // Determine overall status
      const allPlatforms = Object.values(publishedPlatforms);
      const allSuccess = allPlatforms.every((p: any) => p.status === 'success');
      const someSuccess = allPlatforms.some((p: any) => p.status === 'success');

      const newStatus = allSuccess ? 'published' : someSuccess ? 'partially_published' : 'publishing';

      await supabase
        .from('posts')
        .update({
          published_platforms: publishedPlatforms,
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null,
        })
        .eq('id', postId);

      // Audit log
      await supabase.from('audit_logs').insert({
        post_id: postId,
        action: `published_${platform}` as any,
        details: result,
        status: 'success',
      });

      logger.info(`Published to ${platform}`, { postId, result });
      return result;
    },
    {
      connection: getRedisConnectionOpts() as any,
      concurrency: 3,
    }
  );

  worker.on('failed', async (job, err) => {
    const platform = job?.data?.platform;
    const postId = job?.data?.postId;

    logger.error(`Publish to ${platform} failed`, {
      jobId: job?.id,
      postId,
      error: err.message,
    });

    if (postId && platform) {
      try {
        const supabase = getSupabaseClient();

        // Update published_platforms with failure
        const { data: post } = await supabase
          .from('posts')
          .select('published_platforms')
          .eq('id', postId)
          .single();

        const publishedPlatforms = (post?.published_platforms as Record<string, unknown>) || {};
        publishedPlatforms[platform] = {
          platform,
          status: 'failed',
          errorMessage: err.message,
        };

        await supabase
          .from('posts')
          .update({
            published_platforms: publishedPlatforms,
            status: 'partially_published',
          })
          .eq('id', postId);

        await supabase.from('audit_logs').insert({
          post_id: postId,
          action: `publish_failed_${platform}` as any,
          status: 'failure',
          error_message: err.message,
        });
      } catch {}
    }
  });

  logger.info('Publish worker started');
  return worker;
}
