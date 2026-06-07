import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { withRetry } from '../utils/retry';

// Initialize Cloudinary
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info('Cloudinary configured');
} else {
  logger.warn('Cloudinary not configured — file uploads will be local only');
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a local file to Cloudinary.
 */
export async function uploadImage(
  localPath: string,
  folder: string = 'chartpost/screenshots'
): Promise<UploadResult> {
  if (!fs.existsSync(localPath)) {
    throw new Error(`File not found: ${localPath}`);
  }

  if (!env.CLOUDINARY_CLOUD_NAME) {
    logger.warn('Cloudinary not configured, returning local path as URL');
    return {
      url: `file://${localPath}`,
      secureUrl: `file://${localPath}`,
      publicId: localPath,
      width: 0,
      height: 0,
      format: 'png',
      bytes: fs.statSync(localPath).size,
    };
  }

  return withRetry(
    async () => {
      logger.info(`Uploading to Cloudinary: ${localPath}`);

      const result: UploadApiResponse = await cloudinary.uploader.upload(localPath, {
        folder,
        resource_type: 'image',
        quality: 'auto:good',
        fetch_format: 'auto',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' },
        ],
      });

      logger.info(`Uploaded to Cloudinary: ${result.secure_url}`, {
        publicId: result.public_id,
        bytes: result.bytes,
      });

      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    },
    'cloudinary:upload',
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'Server Error'],
    }
  );
}

/**
 * Delete an image from Cloudinary.
 */
export async function deleteImage(publicId: string): Promise<void> {
  if (!env.CLOUDINARY_CLOUD_NAME) return;

  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error('Failed to delete from Cloudinary', {
      publicId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Generate a social-media-optimized URL for an image.
 */
export function getOptimizedUrl(publicId: string, platform: 'facebook' | 'instagram' | 'whatsapp'): string {
  if (!env.CLOUDINARY_CLOUD_NAME) return '';

  const transformations: Record<string, object[]> = {
    facebook: [{ width: 1200, height: 630, crop: 'fill', gravity: 'center' }],
    instagram: [{ width: 1080, height: 1080, crop: 'fill', gravity: 'center' }],
    whatsapp: [{ width: 800, height: 800, crop: 'limit', quality: 80 }],
  };

  return cloudinary.url(publicId, {
    transformation: transformations[platform],
    secure: true,
    fetch_format: 'jpg',
    quality: 'auto:good',
  });
}
