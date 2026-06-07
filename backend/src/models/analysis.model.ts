import { z } from 'zod';

// ─── AI Analysis Output ───
export const AIAnalysisSchema = z.object({
  market_trend: z.enum(['bullish', 'bearish', 'neutral', 'mixed']),
  support_levels: z.array(z.string()),
  resistance_levels: z.array(z.string()),
  explanation: z.string().min(10),
  risk_note: z.string(),
  caption_draft: z.string().min(10),
  hashtags: z.array(z.string()).min(1),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  timeframe: z.string().optional(),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// ─── Platform-Specific Caption ───
export interface PlatformCaption {
  facebook: string;
  instagram: string;
  whatsapp: string;
}
