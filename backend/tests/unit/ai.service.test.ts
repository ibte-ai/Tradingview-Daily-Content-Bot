import { AIAnalysisSchema } from '../../src/models/analysis.model';

// This tests AI response parsing — mocks the AI response to validate the pipeline
describe('AI Service — Response Parsing', () => {
  const validResponse = {
    market_trend: 'bullish',
    support_levels: ['$42,000', '$41,500'],
    resistance_levels: ['$44,000', '$45,000'],
    explanation: 'Bitcoin is showing a strong uptrend with higher highs and lows.',
    risk_note: 'This is not financial advice. Trading involves risk.',
    caption_draft: 'Bitcoin looking strong with solid volume confirmation.',
    hashtags: ['#trading', '#bitcoin', '#crypto'],
    confidence: 'high',
    timeframe: '4H',
  };

  it('should validate a well-formed AI response', () => {
    const result = AIAnalysisSchema.safeParse(validResponse);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.market_trend).toBe('bullish');
      expect(result.data.support_levels).toHaveLength(2);
      expect(result.data.hashtags).toHaveLength(3);
    }
  });

  it('should reject response with invalid market_trend', () => {
    const invalid = { ...validResponse, market_trend: 'super-bullish' };
    const result = AIAnalysisSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('should reject response with missing required fields', () => {
    const missing = {
      market_trend: 'bullish',
      // Missing all other fields
    };
    const result = AIAnalysisSchema.safeParse(missing);

    expect(result.success).toBe(false);
  });

  it('should accept response without optional fields', () => {
    const { confidence, timeframe, ...withoutOptional } = validResponse;
    const result = AIAnalysisSchema.safeParse(withoutOptional);

    expect(result.success).toBe(true);
  });

  it('should reject response with empty explanation', () => {
    const invalid = { ...validResponse, explanation: 'Short' };
    const result = AIAnalysisSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('should reject response with empty hashtags array', () => {
    const invalid = { ...validResponse, hashtags: [] };
    const result = AIAnalysisSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('should accept all valid market trend values', () => {
    for (const trend of ['bullish', 'bearish', 'neutral', 'mixed'] as const) {
      const data = { ...validResponse, market_trend: trend };
      const result = AIAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid confidence values', () => {
    for (const conf of ['high', 'medium', 'low'] as const) {
      const data = { ...validResponse, confidence: conf };
      const result = AIAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });
});
