import { getSupabaseClient } from '../config/database';
import * as fs from 'fs';
import { logger } from '../config/logger';

/**
 * Upload a local screenshot file to Supabase Storage in the 'screenshots' bucket.
 * Automatically creates the bucket if it doesn't exist (if the service key has permissions).
 */
export async function uploadScreenshotToSupabase(localPath: string, fileName: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found at path: ${localPath}`);
  }

  const fileBuffer = fs.readFileSync(localPath);

  logger.info(`Uploading file to Supabase Storage screenshots bucket`, { fileName });

  // Verify and upload file
  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    logger.error('Failed to upload file to Supabase Storage', { error: error.message });
    throw error;
  }

  // Retrieve public URL
  const { data: urlData } = supabase.storage
    .from('screenshots')
    .getPublicUrl(fileName);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage');
  }

  logger.info('Screenshot uploaded to Supabase Storage successfully', { publicUrl: urlData.publicUrl });
  return urlData.publicUrl;
}
