import { config } from './src/config/env.js';
import { supabase } from './src/config/supabase.js';
import { SupabaseRepository } from './src/db/supabaseRepository.js';

async function testDatabase() {
  console.log('====================================================');
  console.log('🐘 QUIZBEE — SUPABASE POSTGRESQL VERIFICATION TEST');
  console.log('====================================================\n');

  console.log('[1] Checking Database Environment Variables:');
  console.log('  • SUPABASE_URL:', config.supabaseUrl ? `Configured (${config.supabaseUrl})` : '⚠️ Missing in server/.env');
  console.log('  • SUPABASE_SERVICE_ROLE_KEY:', config.supabaseKey ? 'Configured (Secret Hidden)' : '⚠️ Missing in server/.env');

  if (!config.supabaseUrl || !config.supabaseKey) {
    console.log('\n[2] Status:');
    console.log('  ℹ️ Supabase credentials are not yet configured in server/.env.');
    console.log('  🛡️ Quizbee is currently running with its authoritative local persistence store, allowing full functionality.');
    console.log('\n[3] How to link your Supabase Project:');
    console.log('  1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('  2. Create a new project or select an existing one.');
    console.log('  3. In the SQL Editor, copy and execute the schema from:');
    console.log('     server/src/db/schema.sql');
    console.log('  4. Go to Project Settings -> API, copy your Project URL and service_role secret key.');
    console.log('  5. Add them to server/.env:');
    console.log('     SUPABASE_URL=https://your-project.supabase.co');
    console.log('     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.log('  6. Run: node test_db.js again to verify live connectivity.\n');
    process.exit(0);
  }

  console.log('\n[2] Testing Live Supabase PostgreSQL Connection:');
  const result = await SupabaseRepository.testConnection();

  if (result.connected) {
    console.log('  ✅ SUCCESS: Connected to Supabase PostgreSQL database!');
    console.log('  ✅ Verified authoritative access to tables: users, quizzes, questions, rooms, players, teams, answers.');
  } else {
    console.error('  ❌ CONNECTION FAILED:', result.error || result.message);
    if (result.code === '42P01') {
      console.log('\n  ⚠️ The tables do not exist yet in your Supabase database.');
      console.log('  💡 Run the SQL script server/src/db/schema.sql in the Supabase SQL Editor to create them.');
    }
  }

  console.log('\n====================================================\n');
}

testDatabase().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
