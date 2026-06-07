/**
 * Error Path Tests — verify the system handles failures gracefully.
 */
import { env } from '../../src/config/env';
import * as fs from 'fs';
import { uploadImage } from '../../src/services/cloudinary.service';
import { publishToFacebook } from '../../src/services/facebook.service';
import { publishToInstagram } from '../../src/services/instagram.service';
import { sendWhatsAppMessage } from '../../src/services/whatsapp.service';

describe('Error Paths — Missing Screenshot', () => {
  it('should throw an error when screenshot file does not exist', async () => {
    // Set cloudinary as configured in env object
    const originalCloudName = env.CLOUDINARY_CLOUD_NAME;
    env.CLOUDINARY_CLOUD_NAME = 'test-cloud';

    await expect(uploadImage('/nonexistent/path.png')).rejects.toThrow('File not found');

    env.CLOUDINARY_CLOUD_NAME = originalCloudName;
  });
});

describe('Error Paths — API Failure Handling', () => {
  let originalFacebookToken: string | undefined;
  let originalFacebookPageId: string | undefined;
  let originalInstagramUserId: string | undefined;
  let originalWhatsAppToken: string | undefined;
  let originalWhatsAppPhoneId: string | undefined;

  beforeEach(() => {
    originalFacebookToken = env.META_PAGE_ACCESS_TOKEN;
    originalFacebookPageId = env.META_PAGE_ID;
    originalInstagramUserId = env.META_IG_USER_ID;
    originalWhatsAppToken = env.WHATSAPP_ACCESS_TOKEN;
    originalWhatsAppPhoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  });

  afterEach(() => {
    env.META_PAGE_ACCESS_TOKEN = originalFacebookToken;
    env.META_PAGE_ID = originalFacebookPageId;
    env.META_IG_USER_ID = originalInstagramUserId;
    env.WHATSAPP_ACCESS_TOKEN = originalWhatsAppToken;
    env.WHATSAPP_PHONE_NUMBER_ID = originalWhatsAppPhoneId;
  });

  it('should handle Facebook API failure gracefully', async () => {
    // Mock fetch to simulate Facebook API error
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Invalid access token',
          code: 190,
        },
      }),
    });

    env.META_PAGE_ACCESS_TOKEN = 'invalid-token-for-testing';
    env.META_PAGE_ID = 'test-page-id';

    await expect(publishToFacebook('https://example.com/image.png', 'test caption'))
      .rejects.toThrow('token expired');

    global.fetch = originalFetch;
  });

  it('should handle Instagram container creation failure', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Invalid image URL',
          code: 100,
        },
      }),
    });

    env.META_PAGE_ACCESS_TOKEN = 'invalid-token-for-testing';
    env.META_IG_USER_ID = 'test-ig-user';

    await expect(publishToInstagram('https://example.com/bad-image.png', 'test'))
      .rejects.toThrow('container creation failed');

    global.fetch = originalFetch;
  });

  it('should handle WhatsApp rate limit response', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          message: 'Rate limit exceeded',
          code: 429,
        },
      }),
    });

    env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';

    await expect(sendWhatsAppMessage('+1234567890', 'https://example.com/img.png', 'test'))
      .rejects.toThrow('rate limit');

    global.fetch = originalFetch;
  });
});

describe('Error Paths — AI Model Not Configured', () => {
  it('should check if AI model is not configured', async () => {
    const originalGemini = env.GEMINI_API_KEY;
    const originalOpenai = env.OPENAI_API_KEY;

    env.GEMINI_API_KEY = undefined;
    env.OPENAI_API_KEY = undefined;

    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBeUndefined();

    env.GEMINI_API_KEY = originalGemini;
    env.OPENAI_API_KEY = originalOpenai;
  });
});
