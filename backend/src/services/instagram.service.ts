import { env } from '../config/env';
import { logger } from '../config/logger';
import { withRetry } from '../utils/retry';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export interface InstagramPublishResult {
  postId: string;
  postUrl: string;
}

/**
 * Publish a photo with caption to Instagram.
 * Uses the two-step container process:
 * 1. Create media container: POST /{ig-user-id}/media
 * 2. Publish container: POST /{ig-user-id}/media_publish
 */
export async function publishToInstagram(
  imageUrl: string,
  caption: string
): Promise<InstagramPublishResult> {
  if (!env.META_PAGE_ACCESS_TOKEN || !env.META_IG_USER_ID) {
    throw new Error('Instagram publishing not configured. Set META_PAGE_ACCESS_TOKEN and META_IG_USER_ID.');
  }

  return withRetry(
    async () => {
      logger.info('Publishing to Instagram', { igUserId: env.META_IG_USER_ID });

      // Step 1: Create media container
      const containerId = await createMediaContainer(imageUrl, caption);
      logger.debug('Instagram container created', { containerId });

      // Wait for container to be ready (async processing)
      await waitForContainerReady(containerId);

      // Step 2: Publish the container
      const postId = await publishMediaContainer(containerId);
      const postUrl = `https://www.instagram.com/p/${postId}/`;

      logger.info('Published to Instagram', { postId, postUrl });

      return { postId, postUrl };
    },
    'instagram:publish',
    {
      maxAttempts: 2,
      baseDelayMs: 5000,
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'rate limit'],
    }
  );
}

/**
 * Step 1: Create a media container on Instagram.
 */
async function createMediaContainer(imageUrl: string, caption: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${env.META_IG_USER_ID}/media`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: env.META_PAGE_ACCESS_TOKEN,
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(`Instagram container creation failed: ${data.error?.message || response.status}`);
  }

  if (!data.id) {
    throw new Error('Instagram container creation returned no ID');
  }

  return data.id;
}

/**
 * Wait for the Instagram media container to finish processing.
 * Polls the container status up to 10 times with 3-second intervals.
 */
async function waitForContainerReady(containerId: string): Promise<void> {
  const maxAttempts = 10;
  const pollInterval = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${env.META_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json() as any;

    const status = data.status_code;

    if (status === 'FINISHED') {
      logger.debug('Instagram container ready', { containerId, attempt });
      return;
    }

    if (status === 'ERROR') {
      throw new Error(`Instagram container processing failed: ${data.status || 'Unknown error'}`);
    }

    logger.debug(`Instagram container status: ${status}, waiting...`, { attempt });
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Instagram container processing timed out after 30 seconds');
}

/**
 * Step 2: Publish the processed container.
 */
async function publishMediaContainer(containerId: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${env.META_IG_USER_ID}/media_publish`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: env.META_PAGE_ACCESS_TOKEN,
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(`Instagram publish failed: ${data.error?.message || response.status}`);
  }

  return data.id;
}

/**
 * Verify that the Instagram user ID and token are valid.
 */
export async function verifyInstagramToken(): Promise<boolean> {
  if (!env.META_PAGE_ACCESS_TOKEN || !env.META_IG_USER_ID) return false;

  try {
    const url = `${GRAPH_API_BASE}/${env.META_IG_USER_ID}?fields=id,username&access_token=${env.META_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json() as any;
    return !!data.id && !data.error;
  } catch {
    return false;
  }
}
