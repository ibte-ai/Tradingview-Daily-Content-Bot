import express from 'express';
import request from 'supertest';
import draftRouter from '../../src/routes/draft';
import { getSupabaseClient } from '../../src/config/database';
import { captureScreenshot } from '../../src/services/screenshot.service';
import { uploadImage } from '../../src/services/cloudinary.service';
import { analyzeChart } from '../../src/services/ai.service';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('../../src/services/screenshot.service', () => ({
  captureScreenshot: jest.fn(),
}));

jest.mock('../../src/services/cloudinary.service', () => ({
  uploadImage: jest.fn(),
}));

jest.mock('../../src/services/ai.service', () => ({
  analyzeChart: jest.fn(),
}));

jest.mock('../../src/services/caption.service', () => ({
  generatePlatformCaptions: jest.fn().mockReturnValue({
    facebook: 'fb caption',
    instagram: 'ig caption',
    whatsapp: 'wa caption',
  }),
  generateDefaultCaption: jest.fn().mockReturnValue({
    facebook: 'default fb',
    instagram: 'default ig',
    whatsapp: 'default wa',
  }),
}));

describe('Draft Router — Process Endpoint', () => {
  let app: express.Application;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/draft', draftRouter);

    // Setup default supabase mock chain
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should successfully process a draft post', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'draft',
      screenshot_url: null,
    };

    // Mock fetches
    mockSupabase.single
      // First call: Fetch the post
      .mockResolvedValueOnce({ data: mockPost, error: null })
      // Second call: Fetch the updated post at the end
      .mockResolvedValueOnce({
        data: {
          ...mockPost,
          screenshot_url: 'https://cloudinary.com/test.png',
          status: 'pending_review',
          ai_analysis: { market_trend: 'bullish' },
        },
        error: null,
      });

    mockSupabase.update.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockPost,
              screenshot_url: 'https://cloudinary.com/test.png',
              status: 'pending_review',
              ai_analysis: { market_trend: 'bullish' },
            },
            error: null,
          }),
        }),
      }),
    });

    (captureScreenshot as jest.Mock).mockResolvedValue({
      localPath: '/tmp/test.png',
      fileName: 'test.png',
    });

    (uploadImage as jest.Mock).mockResolvedValue({
      secureUrl: 'https://cloudinary.com/test.png',
    });

    (analyzeChart as jest.Mock).mockResolvedValue({
      market_trend: 'bullish',
      confidence: 'high',
      support_levels: ['$40,000'],
      resistance_levels: ['$45,000'],
      explanation: 'Uptrend confirmed.',
    });

    const response = await request(app)
      .post('/api/draft/test-post-id/process')
      .send({ chartUrl: 'https://tradingview.com/chart/abc' });

    expect(response.status).toBe(200);
    expect(response.body.post.status).toBe('pending_review');
    expect(response.body.post.screenshot_url).toBe('https://cloudinary.com/test.png');
    expect(response.body.captions).toEqual({
      facebook: 'fb caption',
      instagram: 'ig caption',
      whatsapp: 'wa caption',
    });

    expect(captureScreenshot).toHaveBeenCalledWith({ symbol: 'BTCUSD', chartUrl: 'https://tradingview.com/chart/abc' });
    expect(uploadImage).toHaveBeenCalledWith('/tmp/test.png');
    expect(analyzeChart).toHaveBeenCalledWith('/tmp/test.png');
  });

  it('should return 404 if post does not exist', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Not found') });

    const response = await request(app)
      .post('/api/draft/invalid-id/process')
      .send();

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Post not found');
  });

  it('should return 400 if post is already processed', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'published',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: mockPost, error: null });

    const response = await request(app)
      .post('/api/draft/test-post-id/process')
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Post already processed');
  });

  it('should handle screenshot failure and return 500', async () => {
    const mockPost = {
      id: 'test-post-id',
      symbol: 'BTCUSD',
      status: 'draft',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: mockPost, error: null });
    (captureScreenshot as jest.Mock).mockRejectedValue(new Error('Browser crash'));

    const response = await request(app)
      .post('/api/draft/test-post-id/process')
      .send();

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Screenshot capture failed');
    expect(response.body.message).toBe('Browser crash');
  });
});
