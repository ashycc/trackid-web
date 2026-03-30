import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing env vars. Run: source .env && node scripts/setup-db.mjs');
  process.exit(1);
}

const supabase = createClient(url, key);

// Create storage bucket
async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('rider-photos', {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error) {
    if (error.message?.includes('already exists')) {
      console.log('✓ Storage bucket "rider-photos" already exists');
    } else {
      console.error('✗ Storage bucket error:', error.message);
    }
  } else {
    console.log('✓ Storage bucket "rider-photos" created');
  }
}

// Test connection
async function testConnection() {
  const { error } = await supabase.from('submissions').select('id').limit(1);
  if (error) {
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('⚠ Table "submissions" not found — run the SQL schema manually');
      return false;
    }
    console.error('✗ Connection error:', error.message);
    return false;
  }
  console.log('✓ Table "submissions" exists and is accessible');
  return true;
}

async function main() {
  console.log('Setting up Supabase for TRACKID...\n');
  await setupStorage();
  const tableExists = await testConnection();
  if (!tableExists) {
    console.log('\n→ Please run the SQL in supabase-schema.sql via the Supabase SQL Editor:');
    console.log(`  https://supabase.com/dashboard/project/pkwvjwlwnzctwoehozbi/sql/new`);
  }
  console.log('\nDone.');
}

main();
