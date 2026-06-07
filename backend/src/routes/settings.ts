import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

// ─── Allowed Setting Keys (whitelist to prevent arbitrary data injection) ───
const ALLOWED_SETTING_KEYS = new Set([
  'ai_model',
  'default_risk_note',
  'auto_approve',
  'max_hashtags',
  'caption_max_length',
  'tv_session_id',
  'tv_session_id_sign',
  'risk_disclaimer',
  'default_platforms',
]);

/**
 * GET /api/settings — Get all non-secret settings.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('settings').select('*');

    if (error) throw error;

    // Filter out any sensitive keys from the response
    const safeSettings = (data || []).filter(
      (s: any) => !s.key.startsWith('tv_session') && !s.key.includes('secret')
    );

    res.json({ settings: safeSettings });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/settings — Update settings (whitelisted keys only).
 */
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Request body must be an object of key-value pairs' });
      return;
    }

    const results: Record<string, string> = {};
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      // Validate key is in whitelist
      if (!ALLOWED_SETTING_KEYS.has(key)) {
        rejected.push(key);
        results[key] = 'rejected: unknown setting key';
        continue;
      }

      const { error } = await supabase
        .from('settings')
        .upsert({
          key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString(),
        });

      results[key] = error ? 'failed' : 'updated';
    }

    // Audit
    await supabase.from('audit_logs').insert({
      post_id: null,
      action: 'settings_updated',
      details: { updatedKeys: Object.keys(updates), rejected },
      status: 'success',
    });

    if (rejected.length > 0) {
      logger.warn('Rejected unknown setting keys', { rejected });
    }

    logger.info('Settings updated', { keys: Object.keys(updates) });

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;
