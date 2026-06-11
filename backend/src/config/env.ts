import { z } from 'zod';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_SECRET_KEY: z.string().min(16, 'API_SECRET_KEY must be at least 16 characters'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Database — Supabase is the primary DB, DATABASE_URL is optional for raw SQL
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Redis (optional — workers disabled if not available)
  REDIS_URL: z.string().default('redis://localhost:6379'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_TLS: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),

  // TradingView
  TV_SESSION_ID: z.string().optional(),
  TV_SESSION_ID_SIGN: z.string().optional(),
  TRADINGVIEW_USERNAME: z.string().optional(),
  TRADINGVIEW_PASSWORD: z.string().optional(),

  // AI Models
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_PRIMARY_MODEL: z.enum(['gemini', 'openai']).default('gemini'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Meta (Facebook + Instagram)
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_PAGE_ID: z.string().optional(),
  META_IG_USER_ID: z.string().optional(),

  // WhatsApp
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().default('chart_update'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error('❌ Environment validation failed:');
    for (const [field, messages] of Object.entries(errors)) {
      console.error(`   ${field}: ${messages?.join(', ')}`);
    }
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // In development, provide safe defaults for the one required field
    console.warn('⚠️  Using development defaults for missing env vars');
  }

  return parsed.success ? parsed.data : envSchema.parse({
    ...process.env,
    API_SECRET_KEY: process.env.API_SECRET_KEY || 'dev-secret-key-change-me-now',
  });
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
