import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { isRedisAvailable } from './config/redis';

// Routes
import healthRoutes from './routes/health';
import postRoutes from './routes/posts';
import screenshotRoutes from './routes/screenshots';
import logRoutes from './routes/logs';
import settingsRoutes from './routes/settings';

const app = express();

// ─── Middleware Stack ───
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short', {
  stream: { write: (msg: string) => logger.info(msg.trim()) },
}));
app.use(apiLimiter);
app.use(authMiddleware);

// ─── Routes ───
app.use('/api/health', healthRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);

// ─── 404 Handler ───
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist.' });
});

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 ChartPost API running on port ${PORT}`, {
    env: env.NODE_ENV,
    port: PORT,
  });

  // Log service availability
  logger.info('Service status:', {
    supabase: !!env.SUPABASE_URL ? '✅ configured' : '❌ missing',
    gemini: !!env.GEMINI_API_KEY ? '✅ configured' : '❌ missing',
    openai: !!env.OPENAI_API_KEY ? '✅ configured' : '❌ missing',
    cloudinary: !!env.CLOUDINARY_CLOUD_NAME ? '⚠️ placeholder' : '❌ missing',
    meta: !!env.META_PAGE_ACCESS_TOKEN ? '⚠️ placeholder' : '❌ missing',
  });

  // Start workers (only if Redis is potentially available)
  startWorkersIfPossible();
});

async function startWorkersIfPossible() {
  try {
    // Wait 1.5s for Redis lazy/background connection check to resolve
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!isRedisAvailable()) {
      logger.warn('⚠️ Redis is offline or not configured. API server is active, but background job queues (screenshot, analysis, publish workers) are disabled.');
      return;
    }

    // Dynamic imports to avoid crashing if Redis is not available
    const { startScreenshotWorker } = await import('./workers/screenshot.worker');
    const { startAnalysisWorker } = await import('./workers/analysis.worker');
    const { startPublishWorker } = await import('./workers/publish.worker');

    startScreenshotWorker();
    startAnalysisWorker();
    startPublishWorker();
    logger.info('✅ All workers started (Redis connected)');
  } catch (err) {
    logger.warn('⚠️ Workers could not start — Redis may not be available. API will still work but job queues are disabled.', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Graceful Shutdown ───
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
