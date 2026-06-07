import { env } from '../config/env';
import { logger } from '../config/logger';
import { withRetry } from '../utils/retry';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export interface FacebookPublishResult {
  postId: string;
  postUrl: string;
}

/**
 * Publish a photo with caption to a Facebook Page.
 * Uses /{page-id}/photos endpoint.
 */
export async function publishToFacebook(
  imageUrl: string,
  caption: string
): Promise<FacebookPublishResult> {
  if (!env.META_PAGE_ACCESS_TOKEN || !env.META_PAGE_ID) {
    throw new Error('Facebook publishing not configured. Set META_PAGE_ACCESS_TOKEN and META_PAGE_ID.');
  }

  return withRetry(
    async () => {
      logger.info('Publishing to Facebook', { pageId: env.META_PAGE_ID });

      const url = `${GRAPH_API_BASE}/${env.META_PAGE_ID}/photos`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: imageUrl,
          message: caption,
          access_token: env.META_PAGE_ACCESS_TOKEN,
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        const errorCode = data.error?.code;

        // Check for specific error codes
        if (errorCode === 190) {
          throw new Error(`Facebook token expired: ${errorMsg}`);
        }
        if (errorCode === 368) {
          throw new Error(`Facebook content blocked: ${errorMsg}`);
        }
        if (response.status === 429) {
          throw new Error(`Facebook rate limit: ${errorMsg}`);
        }

        throw new Error(`Facebook publish failed: ${errorMsg}`);
      }

      const postId = data.id || data.post_id;
      const postUrl = `https://facebook.com/${postId}`;

      logger.info('Published to Facebook', { postId, postUrl });

      return { postId, postUrl };
    },
    'facebook:publish',
    {
      maxAttempts: 2,
      baseDelayMs: 5000,
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'rate limit'],
    }
  );
}

/**
 * Verify that the Facebook Page Access Token is valid.
 */
export async function verifyFacebookToken(): Promise<boolean> {
  if (!env.META_PAGE_ACCESS_TOKEN) return false;

  try {
    const url = `${GRAPH_API_BASE}/me?access_token=${env.META_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json() as any;
    return !!data.id && !data.error;
  } catch {
    return false;
  }
}
