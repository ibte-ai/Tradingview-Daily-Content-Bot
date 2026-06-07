import { env } from '../config/env';

// List of env var names that contain secrets
const SECRET_KEYS = [
  'API_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'CLOUDINARY_API_SECRET',
  'META_APP_SECRET',
  'META_PAGE_ACCESS_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
  'TV_SESSION_ID',
  'TV_SESSION_ID_SIGN',
  'DATABASE_URL',
];

/**
 * Check that no secret values appear in a given string (e.g., log output, API response).
 * Returns true if the string is safe (no secrets found), false otherwise.
 */
export function assertNoSecretsExposed(content: string): { safe: boolean; exposedKeys: string[] } {
  const exposedKeys: string[] = [];

  for (const key of SECRET_KEYS) {
    const value = process.env[key];
    if (value && value.length > 8 && content.includes(value)) {
      exposedKeys.push(key);
    }
  }

  return {
    safe: exposedKeys.length === 0,
    exposedKeys,
  };
}

/**
 * Mask a secret value for safe logging: show first 4 and last 4 chars.
 */
export function maskSecret(value: string): string {
  if (!value || value.length <= 12) return '****';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Get a safe version of env vars for diagnostic endpoints.
 */
export function getSafeEnvSummary(): Record<string, string> {
  const summary: Record<string, string> = {};

  summary['NODE_ENV'] = env.NODE_ENV;
  summary['PORT'] = String(env.PORT);
  summary['AI_PRIMARY_MODEL'] = env.AI_PRIMARY_MODEL;

  // Show configured status without values
  summary['DATABASE_URL'] = env.DATABASE_URL ? '✅ configured' : '❌ missing';
  summary['REDIS_URL'] = env.REDIS_URL ? '✅ configured' : '❌ missing';
  summary['GEMINI_API_KEY'] = env.GEMINI_API_KEY ? '✅ configured' : '❌ missing';
  summary['OPENAI_API_KEY'] = env.OPENAI_API_KEY ? '✅ configured' : '❌ missing';
  summary['CLOUDINARY_CLOUD_NAME'] = env.CLOUDINARY_CLOUD_NAME ? '✅ configured' : '❌ missing';
  summary['META_PAGE_ACCESS_TOKEN'] = env.META_PAGE_ACCESS_TOKEN ? '✅ configured' : '❌ missing';
  summary['WHATSAPP_ACCESS_TOKEN'] = env.WHATSAPP_ACCESS_TOKEN ? '✅ configured' : '❌ missing';
  summary['TV_SESSION_ID'] = env.TV_SESSION_ID ? '✅ configured' : '❌ missing';

  return summary;
}
