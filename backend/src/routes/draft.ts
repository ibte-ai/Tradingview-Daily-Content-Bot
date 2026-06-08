import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { captureScreenshot } from '../services/screenshot.service';
import { uploadImage } from '../services/cloudinary.service';
import { analyzeChart } from '../services/ai.service';
import { generatePlatformCaptions, generateDefaultCaption } from '../services/caption.service';

const router = Router();

/**
 * POST /api/draft/:id/process — Synchronous draft processing.
 *
 * Runs the entire capture→upload→analyze→caption pipeline in one request,
 * bypassing the BullMQ/Redis queue. Returns the fully-processed draft post.
 *
 * Steps:
 *   1. Capture TradingView screenshot via Playwright
 *   2. Upload to Cloudinary
 *   3. Run AI analysis (Gemini/OpenAI)
 *   4. Generate platform-specific captions
 *   5. Update the post in Supabase
 *   6. Return the complete draft
 */
router.post('/:id/process', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const supabase = getSupabaseClient();

    // ── Fetch the post ──
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Only process draft or failed posts
    if (!['draft', 'failed'].includes(post.status)) {
      res.status(400).json({
        error: 'Post already processed',
        message: `Post is in "${post.status}" status. Only draft or failed posts can be processed.`,
        post,
      });
      return;
    }

    const symbol: string = post.symbol;
    const chartUrl: string | undefined = req.body.chartUrl;

    // ── Step 1: Capture Screenshot ──
    logger.info('[DraftProcess] Step 1: Capturing screenshot', { id, symbol });

    await supabase.from('posts').update({ status: 'capturing' }).eq('id', id);

    let screenshotUrl: string;
    let screenshotLocalPath: string;

    try {
      const screenshotResult = await captureScreenshot({ symbol, chartUrl });
      const uploadResult = await uploadImage(screenshotResult.localPath);

      screenshotUrl = uploadResult.secureUrl;
      screenshotLocalPath = screenshotResult.localPath;

      await supabase.from('posts').update({
        screenshot_url: screenshotUrl,
        screenshot_local_path: screenshotLocalPath,
        status: 'analyzing',
      }).eq('id', id);

      await supabase.from('audit_logs').insert({
        post_id: id,
        action: 'screenshot_captured',
        details: {
          fileName: screenshotResult.fileName,
          cloudinaryUrl: screenshotUrl,
        },
        status: 'success',
      });

      logger.info('[DraftProcess] Screenshot captured', { id, screenshotUrl });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('[DraftProcess] Screenshot capture failed', { id, error: errorMsg });

      await supabase.from('posts').update({
        status: 'failed',
        error_log: { screenshot: errorMsg },
      }).eq('id', id);

      await supabase.from('audit_logs').insert({
        post_id: id,
        action: 'screenshot_failed',
        status: 'failure',
        error_message: errorMsg,
      });

      res.status(500).json({
        error: 'Screenshot capture failed',
        message: errorMsg,
        step: 'screenshot',
      });
      return;
    }

    // ── Step 2: AI Analysis ──
    logger.info('[DraftProcess] Step 2: Running AI analysis', { id, symbol });

    let aiAnalysis: any = null;
    let captions = generateDefaultCaption(symbol);
    let hashtags: string[] = ['#trading', '#technicalanalysis', '#chartanalysis'];

    try {
      aiAnalysis = await analyzeChart(screenshotLocalPath);
      captions = generatePlatformCaptions(aiAnalysis, symbol);
      hashtags = aiAnalysis.hashtags || hashtags;

      await supabase.from('audit_logs').insert({
        post_id: id,
        action: 'ai_analyzed',
        details: {
          model: process.env.AI_PRIMARY_MODEL || 'gemini',
          trend: aiAnalysis.market_trend,
          confidence: aiAnalysis.confidence,
        },
        status: 'success',
      });

      logger.info('[DraftProcess] AI analysis complete', { id, trend: aiAnalysis.market_trend });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn('[DraftProcess] AI analysis failed, using default captions', { id, error: errorMsg });

      await supabase.from('audit_logs').insert({
        post_id: id,
        action: 'ai_analysis_failed',
        status: 'failure',
        error_message: errorMsg,
      });

      // Continue with default captions — AI failure is non-fatal
    }

    // ── Step 3: Update Post with Results ──
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        ai_analysis: aiAnalysis,
        caption: captions.instagram,
        hashtags,
        risk_note: aiAnalysis?.risk_note || '⚠️ This is not financial advice. Trading involves risk. Always do your own research.',
        status: 'pending_review',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info('[DraftProcess] Draft processing complete', { id });

    res.json({
      post: updatedPost,
      captions: {
        facebook: captions.facebook,
        instagram: captions.instagram,
        whatsapp: captions.whatsapp,
      },
      message: 'Draft processed successfully. Ready for review.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
