import { Router, Request, Response, NextFunction } from 'express';
import { captureScreenshot } from '../services/screenshot.service';
import { uploadImage } from '../services/cloudinary.service';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/screenshots/capture — Manual screenshot capture (bypasses queue).
 */
router.post('/capture', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { symbol, chartUrl } = req.body;

    if (!symbol) {
      res.status(400).json({ error: 'symbol is required' });
      return;
    }

    logger.info('Manual screenshot capture requested', { symbol });

    const result = await captureScreenshot({ symbol, chartUrl });
    const upload = await uploadImage(result.localPath);

    res.json({
      screenshot: {
        localPath: result.localPath,
        fileName: result.fileName,
        cloudinaryUrl: upload.secureUrl,
        capturedAt: result.capturedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
