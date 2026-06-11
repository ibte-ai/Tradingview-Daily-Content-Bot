import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { withRetry } from '../utils/retry';

export interface ScreenshotOptions {
  symbol: string;
  chartUrl?: string;
  viewport?: { width: number; height: number };
  waitTime?: number;
  fullPage?: boolean;
}

export interface ScreenshotResult {
  localPath: string;
  fileName: string;
  symbol: string;
  capturedAt: string;
}

const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Build TradingView chart URL from a symbol.
 */
function buildChartUrl(symbol: string): string {
  // TradingView advanced chart URL format
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}

/**
 * Capture a screenshot of a TradingView chart.
 */
export async function captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
  const {
    symbol,
    chartUrl,
    viewport = { width: 1920, height: 1080 },
    waitTime = 8000,
    fullPage = false,
  } = options;

  const url = chartUrl || buildChartUrl(symbol);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${symbol}_${timestamp}.png`;
  const localPath = path.join(SCREENSHOTS_DIR, fileName);

  logger.info(`Capturing screenshot for ${symbol}`, { url, viewport });

  return withRetry(
    async () => {
      let browser: Browser | null = null;

      try {
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
          ],
        });

        const authPath = path.resolve(process.cwd(), 'storage/playwright/auth.json');
        const contextOptions: any = {
          viewport,
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          locale: 'en-US',
        };

        if (fs.existsSync(authPath)) {
          contextOptions.storageState = authPath;
          logger.info(`Reusing saved TradingView session state from ${authPath}`);
        }

        const context: BrowserContext = await browser.newContext(contextOptions);

        // Inject TradingView session cookies if available and not using auth state
        if (!contextOptions.storageState && env.TV_SESSION_ID && env.TV_SESSION_ID_SIGN) {
          await context.addCookies([
            {
              name: 'sessionid',
              value: env.TV_SESSION_ID,
              domain: '.tradingview.com',
              path: '/',
            },
            {
              name: 'sessionid_sign',
              value: env.TV_SESSION_ID_SIGN,
              domain: '.tradingview.com',
              path: '/',
            },
          ]);
          logger.debug('TradingView session cookies injected');
        } else if (!contextOptions.storageState) {
          logger.warn('TradingView session credentials not configured — using public access (may show delayed data)');
        }

        const page: Page = await context.newPage();

        // Navigate to chart
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        // Wait for chart to render
        // TradingView charts use canvas elements, wait for them to appear
        try {
          await page.waitForSelector('canvas', { timeout: 15000 });
          logger.debug('Chart canvas detected');
        } catch {
          logger.warn('Canvas element not found within timeout — proceeding with screenshot');
        }

        // Additional wait for data to load and indicators to render
        await page.waitForTimeout(waitTime);

        // Close any popups/dialogs that might obstruct the chart
        try {
          // TradingView cookie consent
          const cookieBtn = await page.$('[class*="acceptAll"]');
          if (cookieBtn) await cookieBtn.click();

          // Close any modal dialogs
          const closeBtn = await page.$('[data-dialog-name] button[aria-label="Close"]');
          if (closeBtn) await closeBtn.click();
        } catch {
          // Popups are optional, don't fail if they're not present
        }

        // Take screenshot
        await page.screenshot({
          path: localPath,
          fullPage,
          type: 'png',
        });

        logger.info(`Screenshot saved: ${localPath}`);

        await context.close();

        return {
          localPath,
          fileName,
          symbol,
          capturedAt: new Date().toISOString(),
        };
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    },
    `screenshot:${symbol}`,
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      retryableErrors: ['Navigation timeout', 'net::ERR', 'Target closed'],
    }
  );
}
