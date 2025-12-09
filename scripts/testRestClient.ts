/**
 * Test REST API client
 */

import { setDocument } from '../lib/firebase/restClient';

async function test() {
  console.log('\n🧪 Testing REST Client\n');

  const testData = {
    message: 'Hello from REST client',
    timestamp: new Date(),
    number: 42,
    nested: {
      foo: 'bar',
      count: 123
    },
    array: ['one', 'two', 'three']
  };

  console.log('Writing to rest_test/doc1...');

  try {
    await setDocument('rest_test', 'doc1', testData);
    console.log('✅ SUCCESS!');
    console.log('Check Firebase: https://console.firebase.google.com/project/betanalytics-f095a/firestore/data/rest_test/doc1\n');
  } catch (error: any) {
    console.error('❌ FAILED:', error.message);
  }
}

test();
