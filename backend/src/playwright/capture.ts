import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../config/logger';

const AUTH_PATH = path.resolve(process.cwd(), 'storage/playwright/auth.json');
const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');

export async function captureChart(symbol: string = 'BTCUSD'): Promise<string> {
  // Ensure directories exist
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${symbol}_${timestamp}.png`);

  logger.info(`Launching browser to capture chart for ${symbol}`);
  const browser = await chromium.launch({ headless: true });

  let context;
  if (fs.existsSync(AUTH_PATH)) {
    logger.info(`Loading auth state from ${AUTH_PATH}`);
    context = await browser.newContext({
      storageState: AUTH_PATH,
      viewport: { width: 1920, height: 1080 },
    });
  } else {
    logger.warn(`Auth state not found at ${AUTH_PATH}, using unauthenticated context`);
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
  }

  const page = await context.newPage();

  try {
    const chartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
    logger.info(`Navigating to TradingView chart: ${chartUrl}`);
    await page.goto(chartUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    logger.info('Waiting for chart canvas element...');
    await page.waitForSelector('canvas', { timeout: 15000 });
    
    // Additional wait for indicators/price data to render
    await page.waitForTimeout(8000);

    // Close any cookie popup or standard modals
    try {
      const cookieBtn = await page.$('[class*="acceptAll"]');
      if (cookieBtn) await cookieBtn.click();
      const closeBtn = await page.$('[data-dialog-name] button[aria-label="Close"]');
      if (closeBtn) await closeBtn.click();
    } catch {}

    logger.info(`Taking screenshot of page and saving to ${screenshotPath}`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });

    logger.info('Chart capture successful');
    return screenshotPath;
  } catch (error) {
    logger.error('Playwright capture failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const symbol = process.argv[2] || 'BTCUSD';
  captureChart(symbol)
    .then((filePath) => {
      console.log(`Success: screenshot saved to ${filePath}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Capture failed:', err.message);
      process.exit(1);
    });
}
