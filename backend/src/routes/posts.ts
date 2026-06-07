import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { validateBody } from '../middleware/validator';
import { publishLimiter } from '../middleware/rateLimiter';
import { CreatePostSchema, UpdatePostSchema, PublishRequestSchema } from '../models/post.model';
import { enqueueScreenshot } from '../workers/screenshot.worker';
import { enqueueAnalysis } from '../workers/analysis.worker';
import { enqueuePublish } from '../workers/publish.worker';
import { generatePlatformCaptions } from '../services/caption.service';

const router = Router();

/**
 * GET /api/posts — List all posts with optional filtering.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { status, symbol, limit = '50', offset = '0' } = req.query;

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    if (symbol && typeof symbol === 'string') {
      query = query.eq('symbol', symbol.toUpperCase());
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      posts: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/posts/:id — Get single post with audit trail.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Get audit trail
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    res.json({
      post,
      auditTrail: auditLogs || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts — Create a new post and start the pipeline.
 */
router.post('/', validateBody(CreatePostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { symbol, chartUrl, autoAnalyze } = req.body;
    const postId = uuidv4();

    // Create post record
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        id: postId,
        symbol,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      post_id: postId,
      action: 'post_created',
      details: { symbol, chartUrl, autoAnalyze },
      status: 'success',
    });

    // Enqueue screenshot capture
    await enqueueScreenshot({ postId, symbol, chartUrl });

    logger.info('Post created and screenshot queued', { postId, symbol });

    res.status(201).json({
      post,
      message: 'Post created. Screenshot capture has been queued.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/posts/:id — Edit caption, hashtags, or risk note.
 */
router.patch('/:id', validateBody(UpdatePostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      post_id: id,
      action: 'caption_edited',
      details: { updatedFields: Object.keys(updates) },
      status: 'success',
    });

    res.json({ post: data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/approve — Approve a post for publishing.
 */
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('posts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('status', ['pending_review', 'failed', 'partially_published'])
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({
        error: 'Cannot approve this post',
        message: 'Post must be in pending_review, failed, or partially_published status.',
      });
      return;
    }

    await supabase.from('audit_logs').insert({
      post_id: id,
      action: 'post_approved',
      status: 'success',
    });

    res.json({ post: data, message: 'Post approved' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/posts/:id/publish — Publish approved post to selected platforms.
 */
router.post(
  '/:id/publish',
  publishLimiter,
  validateBody(PublishRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supabase = getSupabaseClient();
      const { id } = req.params;
      const { platforms } = req.body;

      // Fetch post
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (!['approved', 'partially_published'].includes(post.status)) {
        res.status(400).json({
          error: 'Post must be approved before publishing',
          currentStatus: post.status,
        });
        return;
      }

      if (!post.screenshot_url) {
        res.status(400).json({ error: 'Post has no screenshot. Cannot publish.' });
        return;
      }

      // Generate platform captions if AI analysis is available
      let captions = { facebook: post.caption, instagram: post.caption, whatsapp: post.caption };
      if (post.ai_analysis) {
        captions = generatePlatformCaptions(post.ai_analysis, post.symbol, post.risk_note);
      }

      // Enqueue publish jobs for each platform
      const jobs: string[] = [];
      for (const platform of platforms) {
        const jobId = await enqueuePublish({
          postId: id as string,
          platform,
          imageUrl: post.screenshot_url,
          caption: (captions as any)[platform] || post.caption || '',
          symbol: post.symbol,
          whatsappRecipient: req.body.whatsappRecipient,
        });
        jobs.push(jobId);
      }

      await supabase.from('audit_logs').insert({
        post_id: id,
        action: 'publish_started',
        details: { platforms, jobIds: jobs },
        status: 'success',
      });

      res.json({
        message: `Publishing queued for: ${platforms.join(', ')}`,
        jobIds: jobs,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/posts/:id/retry — Retry a failed post.
 */
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Reset to draft and re-trigger pipeline
    await supabase
      .from('posts')
      .update({ status: 'draft', error_log: null })
      .eq('id', id);

    await enqueueScreenshot({ postId: id as string, symbol: post.symbol });

    await supabase.from('audit_logs').insert({
      post_id: id,
      action: 'post_retried',
      status: 'success',
    });

    res.json({ message: 'Post retry initiated' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/posts/:id — Soft-delete a post.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { error } = await supabase
      .from('posts')
      .update({ status: 'failed' })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      post_id: id,
      action: 'post_deleted',
      status: 'success',
    });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
