import { AIAnalysis, PlatformCaption } from '../models/analysis.model';
import { logger } from '../config/logger';
import { truncate, sanitizeHashtags } from '../utils/sanitize';

const DEFAULT_RISK_NOTE = '⚠️ This is not financial advice. Trading involves risk. Always do your own research.';

const PLATFORM_LIMITS = {
  facebook: { caption: 63206, hashtags: 30 },
  instagram: { caption: 2200, hashtags: 30 },
  whatsapp: { caption: 1024, hashtags: 10 },
};

/**
 * Generate platform-specific captions from AI analysis.
 */
export function generatePlatformCaptions(
  analysis: AIAnalysis,
  symbol: string,
  customRiskNote?: string
): PlatformCaption {
  const riskNote = customRiskNote || analysis.risk_note || DEFAULT_RISK_NOTE;
  const hashtags = sanitizeHashtags(analysis.hashtags);

  const facebook = generateFacebookCaption(analysis, symbol, riskNote, hashtags);
  const instagram = generateInstagramCaption(analysis, symbol, riskNote, hashtags);
  const whatsapp = generateWhatsAppCaption(analysis, symbol, riskNote, hashtags);

  logger.info('Platform captions generated', {
    symbol,
    fbLength: facebook.length,
    igLength: instagram.length,
    waLength: whatsapp.length,
  });

  return { facebook, instagram, whatsapp };
}

function generateFacebookCaption(
  analysis: AIAnalysis,
  symbol: string,
  riskNote: string,
  hashtags: string[]
): string {
  const trendEmoji = getTrendEmoji(analysis.market_trend);
  const lines = [
    `${trendEmoji} ${symbol} Chart Analysis`,
    '',
    analysis.caption_draft,
    '',
    `📊 Trend: ${analysis.market_trend.toUpperCase()}`,
  ];

  if (analysis.support_levels.length > 0) {
    lines.push(`🟢 Support: ${analysis.support_levels.join(', ')}`);
  }
  if (analysis.resistance_levels.length > 0) {
    lines.push(`🔴 Resistance: ${analysis.resistance_levels.join(', ')}`);
  }

  if (analysis.timeframe) {
    lines.push(`⏰ Timeframe: ${analysis.timeframe}`);
  }

  lines.push('', analysis.explanation, '', riskNote, '');
  lines.push(hashtags.slice(0, PLATFORM_LIMITS.facebook.hashtags).join(' '));

  return truncate(lines.join('\n'), PLATFORM_LIMITS.facebook.caption);
}

function generateInstagramCaption(
  analysis: AIAnalysis,
  symbol: string,
  riskNote: string,
  hashtags: string[]
): string {
  const trendEmoji = getTrendEmoji(analysis.market_trend);
  const lines = [
    `${trendEmoji} ${symbol} — ${analysis.market_trend.toUpperCase()} ${trendEmoji}`,
    '',
    analysis.caption_draft,
    '',
    `📈 Key Levels:`,
  ];

  if (analysis.support_levels.length > 0) {
    lines.push(`  🟢 Support: ${analysis.support_levels.join(' | ')}`);
  }
  if (analysis.resistance_levels.length > 0) {
    lines.push(`  🔴 Resistance: ${analysis.resistance_levels.join(' | ')}`);
  }

  lines.push('', riskNote, '', '·', '·', '·', '');
  lines.push(hashtags.slice(0, PLATFORM_LIMITS.instagram.hashtags).join(' '));

  return truncate(lines.join('\n'), PLATFORM_LIMITS.instagram.caption);
}

function generateWhatsAppCaption(
  analysis: AIAnalysis,
  symbol: string,
  riskNote: string,
  hashtags: string[]
): string {
  const trendEmoji = getTrendEmoji(analysis.market_trend);
  const lines = [
    `${trendEmoji} *${symbol}* — ${analysis.market_trend.toUpperCase()}`,
    '',
    analysis.caption_draft,
  ];

  if (analysis.support_levels.length > 0) {
    lines.push(`🟢 Support: ${analysis.support_levels.join(', ')}`);
  }
  if (analysis.resistance_levels.length > 0) {
    lines.push(`🔴 Resistance: ${analysis.resistance_levels.join(', ')}`);
  }

  lines.push('', `_${riskNote}_`);

  return truncate(lines.join('\n'), PLATFORM_LIMITS.whatsapp.caption);
}

function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'bullish': return '🟢📈';
    case 'bearish': return '🔴📉';
    case 'neutral': return '🟡➡️';
    case 'mixed': return '🔄';
    default: return '📊';
  }
}

/**
 * Generate a default caption when AI analysis is not available.
 */
export function generateDefaultCaption(symbol: string): PlatformCaption {
  const base = `📊 ${symbol} Chart Update\n\nCheck out the latest chart analysis for ${symbol}.\n\n${DEFAULT_RISK_NOTE}`;
  return {
    facebook: base,
    instagram: base + '\n\n#trading #technicalanalysis #chartanalysis',
    whatsapp: `📊 *${symbol}* Chart Update\n\nCheck out the latest chart.`,
  };
}
