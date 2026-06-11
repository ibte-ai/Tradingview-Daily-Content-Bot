import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { env } from '../config/env';
import { logger } from '../config/logger';

const AUTH_PATH = path.resolve(process.cwd(), 'storage/playwright/auth.json');
const STORAGE_DIR = path.dirname(AUTH_PATH);

export async function loginTradingView(): Promise<void> {
  // Ensure storage directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const username = env.TRADINGVIEW_USERNAME;
  const password = env.TRADINGVIEW_PASSWORD;

  if (!username || !password || username === 'your-username' || password === 'your-password') {
    logger.warn('TradingView username/password not configured in environment variables');
    throw new Error('TradingView credentials not set');
  }

  logger.info('Launching browser to log in to TradingView...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    logger.info('Navigating to TradingView homepage...');
    await page.goto('https://www.tradingview.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    logger.info('Opening user menu...');
    await page.click('button.js-header-user-menu-button, button[aria-label="Open user menu"]');

    logger.info('Clicking sign-in option...');
    await page.click('button[role="menuitem"]:has-text("Sign in")');

    logger.info('Clicking Email login option...');
    await page.click('button:has-text("Email")');

    logger.info('Waiting for input fields...');
    await page.waitForSelector('input#id_username', { timeout: 10000 });

    logger.info('Entering credentials...');
    await page.fill('input#id_username', username);
    await page.fill('input#id_password', password);

    logger.info('Submitting sign-in form...');
    await page.click('form button[type="submit"], button.submitButton-FIMIWZkg');

    // Wait to allow session state to be fully updated
    logger.info('Waiting for authentication and session state to resolve...');
    await page.waitForTimeout(8000);

    // Save storage state containing cookies and localStorage
    await context.storageState({ path: AUTH_PATH });
    logger.info(`Session successfully saved to ${AUTH_PATH}`);
  } catch (error) {
    logger.error('Playwright login failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  loginTradingView()
    .then(() => {
      console.log('Login automation successfully completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Login automation failed:', err.message);
      process.exit(1);
    });
}
