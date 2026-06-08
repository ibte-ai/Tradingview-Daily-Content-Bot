// Smoke test to check health of backend configurations and connections
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runSmokeTest() {
  console.log('🧪 Starting Backend Smoke Test...');
  let hasErrors = false;

  // 1. Check Env variables
  console.log('\n--- 1. Environment Verification ---');
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'API_SECRET_KEY'];
  required.forEach(key => {
    if (!process.env[key]) {
      console.error(`❌ MISSING ENV VAR: ${key}`);
      hasErrors = true;
    } else {
      console.log(`✅ FOUND: ${key}`);
    }
  });

  // 2. Supabase Connection Test
  console.log('\n--- 2. Supabase Connection Test (Primary DB) ---');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    try {
      const { data, error } = await supabase.from('settings').select('key').limit(1);
      if (error) {
        throw error;
      }
      console.log('✅ Connected to Supabase PostgREST client successfully');
    } catch (err) {
      console.error(`❌ Supabase database connection failed: ${err.message}`);
      hasErrors = true;
    }
  } else {
    console.error('❌ Supabase URL/Key missing, skipping check.');
    hasErrors = true;
  }

  // 2b. Optional Local Postgres connection check
  console.log('\n--- 2b. Optional Local Postgres Connection Test ---');
  if (process.env.DATABASE_URL) {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('supabase') && !process.env.DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : undefined,
    });
    try {
      await client.connect();
      console.log('✅ Connected to local database successfully via pg');
      await client.end();
    } catch (err) {
      console.log(`⚠️  Optional local Postgres connection failed: ${err.message}. (Normal if local Docker pg is not running)`);
    }
  } else {
    console.log('⚠️  DATABASE_URL not set. Skipping optional local Postgres check.');
  }

  // 3. AI Service status
  console.log('\n--- 3. AI Model Configurations ---');
  const primaryModel = process.env.AI_PRIMARY_MODEL || 'gemini';
  console.log(`Primary Model: ${primaryModel}`);
  if (primaryModel === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ AI_PRIMARY_MODEL is set to gemini but GEMINI_API_KEY is missing');
      hasErrors = true;
    } else {
      console.log('✅ Gemini API Key is configured');
    }
  } else if (primaryModel === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ AI_PRIMARY_MODEL is set to openai but OPENAI_API_KEY is missing');
      hasErrors = true;
    } else {
      console.log('✅ OpenAI API Key is configured');
    }
  }

  // 4. Redis status
  console.log('\n--- 4. Redis Queue Connection ---');
  const Redis = require('ioredis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
    console.log('✅ Connected to Redis queue server successfully');
    redis.disconnect();
  } catch (err) {
    console.log(`⚠️  Could not connect to Redis: ${err.message}. (Normal if Redis is not running; background queues will fallback to sync API mode)`);
  }

  console.log('\n======================================');
  if (hasErrors) {
    console.error('❌ SMOKE TEST FAILED: Please fix configuration issues.');
    process.exit(1);
  } else {
    console.log('✅ SMOKE TEST PASSED: All primary services verified successfully.');
    process.exit(0);
  }
}

runSmokeTest().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
