/**
 * Test writing directly via Firebase REST API to verify credentials
 */

import * as https from 'https';

// Load env
import { loadEnvFile } from '../lib/firebase/loadEnv';
loadEnvFile();

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

console.log('\n🧪 Testing DIRECT Firebase REST API write\n');
console.log(`Project ID: ${projectId}`);
console.log(`API Key: ${apiKey?.substring(0, 10)}...\n`);

const data = JSON.stringify({
  fields: {
    message: { stringValue: "Hello from REST API" },
    timestamp: { timestampValue: new Date().toISOString() },
    number: { integerValue: "999" }
  }
});

const options = {
  hostname: 'firestore.googleapis.com',
  port: 443,
  path: `/v1/projects/${projectId}/databases/(default)/documents/direct_api_test?documentId=test1&key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS! Document created via REST API');
      console.log('Check: https://console.firebase.google.com/project/betanalytics-f095a/firestore/data/direct_api_test/test1');
    } else {
      console.log('❌ FAILED');
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(data);
req.end();
