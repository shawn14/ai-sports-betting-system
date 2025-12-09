/**
 * Test the weekly refresh cron job manually
 */

import { loadEnvFile } from '../lib/firebase/loadEnv';
loadEnvFile();

async function testCron() {
  console.log('\n🧪 Testing Weekly Refresh Cron Job\n');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('❌ CRON_SECRET not found in environment');
    return;
  }

  // Test against local dev server
  const url = 'http://localhost:3000/api/cron/weekly-refresh';

  console.log(`📍 URL: ${url}`);
  console.log(`🔑 Auth: Bearer ${cronSecret.substring(0, 10)}...\n`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Cron job executed successfully!');
    } else {
      console.log('\n⚠️  Cron job completed with errors');
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  }
}

console.log('⚠️  Make sure dev server is running (npm run dev)');
setTimeout(testCron, 1000);
