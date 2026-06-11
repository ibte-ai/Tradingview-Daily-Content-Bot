import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../config/logger';

const WA_AUTH_PATH = path.resolve(process.cwd(), 'storage/playwright/whatsapp-auth.json');
const STORAGE_DIR = path.dirname(WA_AUTH_PATH);

export async function publishToWhatsAppWeb(recipientPhone: string, imagePath: string, caption: string): Promise<void> {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  logger.info(`Launching browser to post to WhatsApp Web recipient: ${recipientPhone}`);
  
  // WhatsApp Web requires specific browser options to avoid blocking
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let context;
  if (fs.existsSync(WA_AUTH_PATH)) {
    logger.info(`Loading WhatsApp session state from ${WA_AUTH_PATH}`);
    context = await browser.newContext({
      storageState: WA_AUTH_PATH,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });
  } else {
    logger.warn('WhatsApp session state file not found. Scan will be required.');
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });
  }

  const page = await context.newPage();

  try {
    const sendUrl = `https://web.whatsapp.com/send?phone=${encodeURIComponent(recipientPhone)}&text=${encodeURIComponent(caption)}`;
    logger.info(`Navigating to WhatsApp Web send URL: ${sendUrl}`);
    await page.goto(sendUrl, { waitUntil: 'load', timeout: 60000 });

    logger.info('Waiting for WhatsApp Web interface or QR code...');
    const qrSelector = 'canvas[aria-label="Scan me!"]';
    const mainChatSelector = '#main, [contenteditable="true"]';

    const loginPromise = page.waitForSelector(mainChatSelector, { timeout: 45000 });
    const qrPromise = page.waitForSelector(qrSelector, { timeout: 15000 }).then(async () => {
      logger.warn('⚠️ WhatsApp Web QR Code scan required! Run non-headless or scan code from screenshot.');
      // Wait for login to be scanned
      return page.waitForSelector(mainChatSelector, { timeout: 120000 });
    }).catch(() => {
      return loginPromise;
    });

    await Promise.race([loginPromise, qrPromise]);
    logger.info('WhatsApp Web interface loaded successfully.');

    // Save state for future executions
    await context.storageState({ path: WA_AUTH_PATH });
    logger.info(`WhatsApp session state updated at ${WA_AUTH_PATH}`);

    // Click attach button
    logger.info('Opening attachments menu...');
    await page.click('span[data-icon="plus"], span[data-icon="clip"]');
    
    // Attach the chart screenshot
    const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 5000 });
    await fileInput.setInputFiles(imagePath);

    // Wait for file preview upload modal
    await page.waitForSelector('span[data-icon="send"]', { timeout: 10000 });
    
    // Send message
    logger.info('Clicking send...');
    await page.click('span[data-icon="send"]');
    
    // Wait for the send action to finalize
    await page.waitForTimeout(5000);
    logger.info('Post sent successfully via WhatsApp Web.');
  } catch (error) {
    logger.error('WhatsApp Web posting failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    await browser.close();
  }
}
