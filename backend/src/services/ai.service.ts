import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import * as fs from 'fs';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { withRetry } from '../utils/retry';
import { AIAnalysis, AIAnalysisSchema } from '../models/analysis.model';

// ─── Initialize AI Clients ───
let geminiModel: GenerativeModel | null = null;
let openaiClient: OpenAI | null = null;

if (env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  logger.info('Gemini AI model initialized');
}

if (env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  logger.info('OpenAI client initialized');
}

// ─── Analysis Prompt ───
const ANALYSIS_PROMPT = `You are an expert financial chart analyst. Analyze the provided TradingView chart screenshot and return a structured JSON response.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation outside the JSON.

Required JSON structure:
{
  "market_trend": "bullish" | "bearish" | "neutral" | "mixed",
  "support_levels": ["$X.XX", "$Y.YY"],
  "resistance_levels": ["$X.XX", "$Y.YY"],
  "explanation": "A clear, concise explanation of what the chart shows (2-4 sentences). Include key patterns, indicators, and price action.",
  "risk_note": "A brief risk disclaimer appropriate for social media (1 sentence).",
  "caption_draft": "An engaging social media caption about this chart analysis (2-3 sentences). Professional but accessible tone. Do NOT include hashtags here.",
  "hashtags": ["#trading", "#technicalanalysis", "#stocks", ...],
  "confidence": "high" | "medium" | "low",
  "timeframe": "The chart's timeframe if visible (e.g., '1H', '4H', '1D', 'Weekly')"
}

Guidelines:
- Be accurate and specific about price levels you can see
- If you cannot determine exact values, provide approximate ranges
- Keep the caption professional but engaging for social media
- Include 5-10 relevant hashtags
- Always include a risk disclaimer
- If the chart is unclear or you cannot analyze it, set confidence to "low" and explain in the explanation field`;

/**
 * Analyze a chart screenshot using the configured AI model.
 */
export async function analyzeChart(imagePath: string): Promise<AIAnalysis> {
  const primary = env.AI_PRIMARY_MODEL;

  try {
    if (primary === 'gemini' && geminiModel) {
      return await analyzeWithGemini(imagePath);
    } else if (primary === 'openai' && openaiClient) {
      return await analyzeWithOpenAI(imagePath);
    }

    // Fallback
    if (geminiModel) return await analyzeWithGemini(imagePath);
    if (openaiClient) return await analyzeWithOpenAI(imagePath);

    throw new Error('No AI model configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
  } catch (error) {
    // Try fallback model if primary fails
    logger.warn(`Primary AI (${primary}) failed, trying fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      if (primary === 'gemini' && openaiClient) {
        return await analyzeWithOpenAI(imagePath);
      } else if (primary === 'openai' && geminiModel) {
        return await analyzeWithGemini(imagePath);
      }
    } catch (fallbackError) {
      logger.error('Both AI models failed', {
        primaryError: error instanceof Error ? error.message : String(error),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }

    throw error;
  }
}

/**
 * Analyze using Google Gemini.
 */
async function analyzeWithGemini(imagePath: string): Promise<AIAnalysis> {
  if (!geminiModel) throw new Error('Gemini model not initialized');

  return withRetry(
    async () => {
      logger.info('Analyzing chart with Gemini');

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const result = await geminiModel!.generateContent([
        ANALYSIS_PROMPT,
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image,
          },
        },
      ]);

      const text = result.response.text();
      const parsed = parseAIResponse(text);

      logger.info('Gemini analysis complete', { trend: parsed.market_trend });
      return parsed;
    },
    'ai:gemini',
    { maxAttempts: 2, baseDelayMs: 3000 }
  );
}

/**
 * Analyze using OpenAI GPT-4o.
 */
async function analyzeWithOpenAI(imagePath: string): Promise<AIAnalysis> {
  if (!openaiClient) throw new Error('OpenAI client not initialized');

  return withRetry(
    async () => {
      logger.info('Analyzing chart with OpenAI GPT-4o');

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await openaiClient!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ANALYSIS_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const text = response.choices[0]?.message?.content || '';
      const parsed = parseAIResponse(text);

      logger.info('OpenAI analysis complete', { trend: parsed.market_trend });
      return parsed;
    },
    'ai:openai',
    { maxAttempts: 2, baseDelayMs: 3000 }
  );
}

/**
 * Parse and validate AI response JSON.
 */
function parseAIResponse(raw: string): AIAnalysis {
  // Strip markdown code blocks if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error('Failed to parse AI response as JSON', { raw: cleaned.slice(0, 500) });
    throw new Error('AI returned invalid JSON response');
  }

  // Validate with Zod
  const result = AIAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    logger.error('AI response failed schema validation', {
      errors: result.error.flatten().fieldErrors,
    });
    throw new Error(`AI response schema validation failed: ${result.error.message}`);
  }

  return result.data;
}
