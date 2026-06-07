import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../config/database';

const router = Router();

/**
 * GET /api/logs — Query audit logs with filtering.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const {
      post_id,
      action,
      status,
      limit = '100',
      offset = '0',
    } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (post_id && typeof post_id === 'string') {
      query = query.eq('post_id', post_id);
    }
    if (action && typeof action === 'string') {
      query = query.eq('action', action);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      logs: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
