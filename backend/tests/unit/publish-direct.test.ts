import express from 'express';
import request from 'supertest';
import postsRouter from '../../src/routes/posts';
import { getSupabaseClient } from '../../src/config/database';
import { publishToFacebook } from '../../src/services/facebook.service';
import { publishToInstagram } from '../../src/services/instagram.service';
import { sendWhatsAppMessage, generateWhatsAppShareLink } from '../../src/services/whatsapp.service';

// Mock database config
jest.mock('../../src/config/database', () => ({
  getSupabaseClient: jest.fn(),
}));

// Mock workers to avoid worker connection issues
jest.mock('../../src/workers/screenshot.worker', () => ({
  enqueueScreenshot: jest.fn(),
}));
jest.mock('../../src/workers/analysis.worker', () => ({
  enqueueAnalysis: jest.fn(),
}));
jest.mock('../../src/workers/publish.worker', () => ({
  enqueuePublish: jest.fn(),
}));

// Mock platform services
jest.mock('../../src/services/facebook.service', () => ({
  publishToFacebook: jest.fn(),
}));
jest.mock('../../src/services/instagram.service', () => ({
  publishToInstagram: jest.fn(),
}));
jest.mock('../../src/services/whatsapp.service', () => ({
  sendWhatsAppMessage: jest.fn(),
  generateWhatsAppShareLink: jest.fn(),
}));

describe('Posts Router — Publish Direct Endpoint', () => {
  let app: express.Application;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/posts', postsRouter);

    // Setup supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should successfully publish to Facebook and Instagram synchronously', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'approved',
      screenshot_url: 'https://cloudinary.com/chart.png',
      caption: 'Original Caption',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: mockPost, error: null });

    (publishToFacebook as jest.Mock).mockResolvedValue({
      postId: 'fb-123',
      postUrl: 'https://facebook.com/fb-123',
    });

    (publishToInstagram as jest.Mock).mockResolvedValue({
      postId: 'ig-456',
      postUrl: 'https://instagram.com/ig-456',
    });

    const response = await request(app)
      .post('/api/posts/test-post-id/publish-direct')
      .send({
        platforms: ['facebook', 'instagram'],
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('published');
    expect(response.body.results.facebook.status).toBe('success');
    expect(response.body.results.instagram.status).toBe('success');

    expect(publishToFacebook).toHaveBeenCalledWith('https://cloudinary.com/chart.png', 'Original Caption');
    expect(publishToInstagram).toHaveBeenCalledWith('https://cloudinary.com/chart.png', 'Original Caption');
  });

  it('should return WhatsApp share link when recipient is not specified', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'approved',
      screenshot_url: 'https://cloudinary.com/chart.png',
      caption: 'Original Caption',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: mockPost, error: null });
    (generateWhatsAppShareLink as jest.Mock).mockReturnValue('https://wa.me/share-link');

    const response = await request(app)
      .post('/api/posts/test-post-id/publish-direct')
      .send({
        platforms: ['whatsapp'],
      });

    expect(response.status).toBe(200);
    expect(response.body.results.whatsapp.status).toBe('success');
    expect(response.body.results.whatsapp.shareLink).toBe('https://wa.me/share-link');
    expect(generateWhatsAppShareLink).toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it('should send direct WhatsApp message when recipient is specified', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'approved',
      screenshot_url: 'https://cloudinary.com/chart.png',
      caption: 'Original Caption',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: mockPost, error: null });
    (sendWhatsAppMessage as jest.Mock).mockResolvedValue({
      messageId: 'wa-msg-789',
    });

    const response = await request(app)
      .post('/api/posts/test-post-id/publish-direct')
      .send({
        platforms: ['whatsapp'],
        whatsappRecipient: '+1234567890',
      });

    expect(response.status).toBe(200);
    expect(response.body.results.whatsapp.status).toBe('success');
    expect(response.body.results.whatsapp.messageId).toBe('wa-msg-789');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith('+1234567890', 'https://cloudinary.com/chart.png', 'Original Caption');
  });

  it('should handle partial failures and mark post as partially_published', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'approved',
      screenshot_url: 'https://cloudinary.com/chart.png',
      caption: 'Original Caption',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: mockPost, error: null });

    (publishToFacebook as jest.Mock).mockResolvedValue({
      postId: 'fb-123',
      postUrl: 'https://facebook.com/fb-123',
    });

    (publishToInstagram as jest.Mock).mockRejectedValue(new Error('Instagram rate limit'));

    const response = await request(app)
      .post('/api/posts/test-post-id/publish-direct')
      .send({
        platforms: ['facebook', 'instagram'],
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('partially_published');
    expect(response.body.results.facebook.status).toBe('success');
    expect(response.body.results.instagram.status).toBe('failed');
    expect(response.body.results.instagram.errorMessage).toBe('Instagram rate limit');
  });
});
