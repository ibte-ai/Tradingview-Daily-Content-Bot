import { generatePlatformCaptions, generateDefaultCaption } from '../../src/services/caption.service';
import { AIAnalysis } from '../../src/models/analysis.model';

const mockAnalysis: AIAnalysis = {
  market_trend: 'bullish',
  support_levels: ['$42,000', '$41,500'],
  resistance_levels: ['$44,000', '$45,000'],
  explanation: 'Bitcoin is showing a strong uptrend with higher highs and higher lows. RSI is at 65 indicating room for further upside. Volume confirms the breakout above the 50-day moving average.',
  risk_note: 'This is not financial advice. Trading involves risk.',
  caption_draft: 'Bitcoin looking strong! Breaking above key resistance with solid volume confirmation. Bulls in control for now.',
  hashtags: ['trading', 'bitcoin', 'BTC', 'crypto', 'technicalanalysis', 'chartanalysis'],
  confidence: 'high',
  timeframe: '4H',
};

describe('Caption Service', () => {
  describe('generatePlatformCaptions', () => {
    it('should generate captions for all three platforms', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.facebook).toBeDefined();
      expect(captions.instagram).toBeDefined();
      expect(captions.whatsapp).toBeDefined();
      expect(captions.facebook.length).toBeGreaterThan(0);
      expect(captions.instagram.length).toBeGreaterThan(0);
      expect(captions.whatsapp.length).toBeGreaterThan(0);
    });

    it('should include the symbol in all captions', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.facebook).toContain('BTCUSD');
      expect(captions.instagram).toContain('BTCUSD');
      expect(captions.whatsapp).toContain('BTCUSD');
    });

    it('should include trend information', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.facebook.toUpperCase()).toContain('BULLISH');
      expect(captions.instagram.toUpperCase()).toContain('BULLISH');
    });

    it('should include support and resistance levels', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.facebook).toContain('$42,000');
      expect(captions.facebook).toContain('$44,000');
    });

    it('should include hashtags in Instagram caption', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.instagram).toContain('#trading');
      expect(captions.instagram).toContain('#bitcoin');
    });

    it('should use WhatsApp markdown formatting', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      // WhatsApp uses *bold* for emphasis
      expect(captions.whatsapp).toContain('*BTCUSD*');
    });

    it('should respect Instagram character limit (2200)', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.instagram.length).toBeLessThanOrEqual(2200);
    });

    it('should respect WhatsApp caption limit (1024)', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.whatsapp.length).toBeLessThanOrEqual(1024);
    });

    it('should include risk note', () => {
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD');

      expect(captions.facebook).toContain('risk');
    });

    it('should use custom risk note when provided', () => {
      const customRisk = 'CUSTOM RISK: Do your own research!';
      const captions = generatePlatformCaptions(mockAnalysis, 'BTCUSD', customRisk);

      expect(captions.facebook).toContain(customRisk);
    });

    it('should handle bearish trend', () => {
      const bearish = { ...mockAnalysis, market_trend: 'bearish' as const };
      const captions = generatePlatformCaptions(bearish, 'ETHUSD');

      expect(captions.facebook.toUpperCase()).toContain('BEARISH');
      expect(captions.facebook).toContain('📉');
    });

    it('should handle neutral trend', () => {
      const neutral = { ...mockAnalysis, market_trend: 'neutral' as const };
      const captions = generatePlatformCaptions(neutral, 'SPXUSD');

      expect(captions.facebook.toUpperCase()).toContain('NEUTRAL');
    });
  });

  describe('generateDefaultCaption', () => {
    it('should generate default captions without AI analysis', () => {
      const captions = generateDefaultCaption('AAPL');

      expect(captions.facebook).toContain('AAPL');
      expect(captions.instagram).toContain('AAPL');
      expect(captions.whatsapp).toContain('AAPL');
    });

    it('should include hashtags in Instagram default', () => {
      const captions = generateDefaultCaption('AAPL');

      expect(captions.instagram).toContain('#trading');
    });
  });
});
