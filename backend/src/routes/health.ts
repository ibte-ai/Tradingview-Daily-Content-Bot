import { Router, Request, Response } from 'express';
import { getRedisClient } from '../config/redis';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { getSafeEnvSummary } from '../utils/secrets';
import { verifyFacebookToken } from '../services/facebook.service';
import { verifyInstagramToken } from '../services/instagram.service';
import { isWhatsAppConfigured } from '../services/whatsapp.service';

const router = Router();

/**
 * GET /api/health — Basic health check
 */
router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {
    api: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Check Redis
  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = 'ok';
  } catch (err) {
    checks.redis = 'error';
  }

  // Check Database
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('settings').select('key').limit(1);
    checks.database = error ? 'error' : 'ok';
  } catch {
    checks.database = 'error';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok' || v.match(/^\d/));

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
  });
});

/**
 * GET /api/health/ready — Readiness probe (for Kubernetes / load balancers)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const redis = getRedisClient();
    await redis.ping();

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('settings').select('key').limit(1);

    if (error) throw error;

    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

/**
 * GET /api/health/config — Show safe environment config summary
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    config: getSafeEnvSummary(),
  });
});

/**
 * GET /api/health/platforms — Check platform connection status
 */
router.get('/platforms', async (_req: Request, res: Response) => {
  const platforms: Record<string, unknown> = {};

  platforms.facebook = {
    configured: !!process.env.META_PAGE_ACCESS_TOKEN,
    tokenValid: await verifyFacebookToken(),
  };

  platforms.instagram = {
    configured: !!process.env.META_IG_USER_ID,
    tokenValid: await verifyInstagramToken(),
  };

  platforms.whatsapp = {
    configured: isWhatsAppConfigured(),
    note: 'WhatsApp Channel posting is NOT supported via official API. Uses Business Cloud API for direct messages.',
  };

  platforms.ai = {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    primary: process.env.AI_PRIMARY_MODEL || 'gemini',
  };

  platforms.cloudinary = {
    configured: !!process.env.CLOUDINARY_CLOUD_NAME,
  };

  res.json({ platforms });
});

export default router;
