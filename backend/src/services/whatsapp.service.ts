import { env } from '../config/env';
import { logger } from '../config/logger';
import { withRetry } from '../utils/retry';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';

export interface WhatsAppSendResult {
  messageId: string;
  recipientPhone: string;
}

/**
 * ⚠️ IMPORTANT: WhatsApp Channel posting is NOT officially supported via the Meta API.
 *
 * This service uses the WhatsApp Business Cloud API to send messages to individual
 * contacts or groups using pre-approved message templates. This is the ONLY official
 * and safe method for sending WhatsApp messages programmatically.
 *
 * For Channel posting, the system provides a manual fallback via deep links.
 */

/**
 * Send a template message with image to a WhatsApp contact.
 * The template must be pre-approved in Meta Business Manager.
 */
export async function sendWhatsAppMessage(
  recipientPhone: string,
  imageUrl: string,
  caption: string
): Promise<WhatsAppSendResult> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error(
      'WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.'
    );
  }

  return withRetry(
    async () => {
      logger.info('Sending WhatsApp message', {
        to: recipientPhone.slice(0, 4) + '****',
      });

      const url = `${WHATSAPP_API_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      // Send image message with caption (non-template for 24hr window)
      // For proactive outreach, use template messages instead
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption,
          },
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        const errorCode = data.error?.code;

        if (response.status === 429) {
          throw new Error(`WhatsApp rate limit: ${errorMsg}`);
        }

        throw new Error(`WhatsApp send failed (code: ${errorCode}): ${errorMsg}`);
      }

      const messageId = data.messages?.[0]?.id || 'unknown';

      logger.info('WhatsApp message sent', { messageId });

      return {
        messageId,
        recipientPhone,
      };
    },
    'whatsapp:send',
    {
      maxAttempts: 2,
      baseDelayMs: 3000,
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'rate limit'],
    }
  );
}

/**
 * Send a template-based message (for proactive outreach outside 24hr window).
 */
export async function sendWhatsAppTemplate(
  recipientPhone: string,
  imageUrl: string,
  templateName?: string
): Promise<WhatsAppSendResult> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp not configured.');
  }

  const template = templateName || env.WHATSAPP_TEMPLATE_NAME;

  const url = `${WHATSAPP_API_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: imageUrl },
              },
            ],
          },
        ],
      },
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(`WhatsApp template send failed: ${data.error?.message || response.status}`);
  }

  return {
    messageId: data.messages?.[0]?.id || 'unknown',
    recipientPhone,
  };
}

/**
 * Generate a WhatsApp share deep link for manual Channel posting.
 * This is the ONLY safe way to share to WhatsApp when API posting is not available.
 */
export function generateWhatsAppShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Check if WhatsApp is properly configured.
 */
export function isWhatsAppConfigured(): boolean {
  return !!(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}
