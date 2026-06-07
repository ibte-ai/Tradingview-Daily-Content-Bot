// Direct PostgreSQL migration using Supabase's pooler connection
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const connectionStrings = [
    // Session mode pooler (port 5432)
    {
      connectionString: `postgresql://postgres.xotzlezvfnytwnpelcdj:Alikhan-7328@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    // Transaction mode pooler (port 6543)
    {
      connectionString: `postgresql://postgres.xotzlezvfnytwnpelcdj:Alikhan-7328@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    // Direct connection
    {
      connectionString: `postgresql://postgres:Alikhan-7328@db.xotzlezvfnytwnpelcdj.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    // US region pooler
    {
      connectionString: `postgresql://postgres.xotzlezvfnytwnpelcdj:Alikhan-7328@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    // US West
    {
      connectionString: `postgresql://postgres.xotzlezvfnytwnpelcdj:Alikhan-7328@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    // EU West  
    {
      connectionString: `postgresql://postgres.xotzlezvfnytwnpelcdj:Alikhan-7328@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
  ];

  const sqlPath = path.join(__dirname, '..', 'src', 'db', 'migrations', '001_initial.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  for (const config of connectionStrings) {
    const display = config.connectionString.replace(/:[^:@]+@/, ':***@');
    console.log(`Trying: ${display}...`);
    const client = new Client({ ...config, connectionTimeoutMillis: 8000 });
    try {
      await client.connect();
      console.log('Connected! Running migration...');
      await client.query(sql);
      console.log('✅ Migration completed successfully!');
      
      // Verify
      const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
      console.log('Tables created:', rows.map(r => r.tablename).join(', '));
      
      // Check settings
      const { rows: settings } = await client.query("SELECT key FROM settings");
      console.log('Default settings:', settings.map(r => r.key).join(', '));
      
      await client.end();
      return;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }
  
  console.log('\n❌ Could not connect to Supabase database with default password.');
  console.log('Please run the migration manually via the Supabase Dashboard:');
  console.log('1. Go to https://supabase.com/dashboard/project/xotzlezvfnytwnpelcdj/sql');
  console.log('2. Paste the SQL from: backend/src/db/migrations/001_initial.sql');
  console.log('3. Click Run');
}

run().catch(console.error);
