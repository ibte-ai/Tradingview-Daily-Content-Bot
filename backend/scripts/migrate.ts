// Run database migration against Supabase
// Usage: npx tsx scripts/migrate.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xotzlezvfnytwnpelcdj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigration() {
  console.log('🗃️  Running database migration...');
  
  const sqlPath = path.join(__dirname, '..', 'src', 'db', 'migrations', '001_initial.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements`);

  // Try using the rpc method first, otherwise try individual table creation
  // via the Supabase client
  
  // First, check if tables already exist
  const { data: existingTables, error: checkError } = await supabase
    .from('settings')
    .select('key')
    .limit(1);

  if (!checkError) {
    console.log('✅ Tables already exist! Migration has been applied.');
    
    // Check and seed default settings if needed
    const { data: settings } = await supabase.from('settings').select('key');
    if (!settings || settings.length === 0) {
      console.log('📝 Seeding default settings...');
      const { error: seedError } = await supabase.from('settings').upsert([
        { key: 'ai_model', value: JSON.stringify('gemini') },
        { key: 'default_risk_note', value: JSON.stringify('⚠️ This is not financial advice. Trading involves risk. Always do your own research.') },
        { key: 'auto_approve', value: JSON.stringify(false) },
        { key: 'max_hashtags', value: JSON.stringify(15) },
        { key: 'caption_max_length', value: JSON.stringify(2200) },
      ]);
      if (seedError) {
        console.error('❌ Failed to seed settings:', seedError.message);
      } else {
        console.log('✅ Default settings seeded');
      }
    } else {
      console.log(`✅ Settings table has ${settings.length} entries`);
    }
    return;
  }

  // Tables don't exist yet — need to create them
  console.log('⚠️  Tables not found. You need to run the SQL migration manually.');
  console.log('');
  console.log('Option 1: Supabase Dashboard SQL Editor');
  console.log('  1. Go to https://supabase.com/dashboard/project/xotzlezvfnytwnpelcdj/sql');
  console.log('  2. Paste the contents of: backend/src/db/migrations/001_initial.sql');
  console.log('  3. Click "Run"');
  console.log('');
  console.log('Option 2: Use psql (if you have the database password)');
  console.log('  psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f backend/src/db/migrations/001_initial.sql');
  
  process.exit(1);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
