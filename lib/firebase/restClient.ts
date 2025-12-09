/**
 * Firebase Firestore REST API Client
 * Direct REST API implementation - bypasses broken JS SDK
 */

import * as https from 'https';

// Load env vars
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  try {
    const { loadEnvFile } = require('./loadEnv');
    loadEnvFile();
  } catch (error) {
    console.error('Failed to load .env.local:', error);
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
  throw new Error('Missing Firebase credentials');
}

console.log(`✅ Firebase REST Client initialized: ${PROJECT_ID}`);

/**
 * Convert JavaScript value to Firestore REST API format
 */
function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    };
  }

  if (typeof value === 'object') {
    const fields: any = {};
    for (const [key, val] of Object.entries(value)) {
      fields[key] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }

  return { stringValue: String(value) };
}

/**
 * Convert data object to Firestore document format
 */
function toFirestoreDocument(data: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

/**
 * Write document to Firestore (creates new document)
 */
export async function setDocument(
  collection: string,
  documentId: string,
  data: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const document = toFirestoreDocument(data);
    const body = JSON.stringify(document);

    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?documentId=${documentId}&key=${API_KEY}`;

    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Firebase write failed (${res.statusCode}): ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Update document in Firestore (overwrites existing document)
 */
export async function updateDocument(
  collection: string,
  documentId: string,
  data: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const document = toFirestoreDocument(data);
    const body = JSON.stringify(document);

    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${documentId}?key=${API_KEY}`;

    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Firebase update failed (${res.statusCode}): ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Upsert document (create or update)
 */
export async function upsertDocument(
  collection: string,
  documentId: string,
  data: any
): Promise<void> {
  try {
    await setDocument(collection, documentId, data);
  } catch (error: any) {
    if (error.message.includes('409') || error.message.includes('ALREADY_EXISTS')) {
      await updateDocument(collection, documentId, data);
    } else {
      throw error;
    }
  }
}

/**
 * Batch write multiple documents
 */
export async function batchWrite(writes: Array<{
  collection: string;
  documentId: string;
  data: any;
}>): Promise<void> {
  // For simplicity, write sequentially
  // Could optimize with Firebase batch API later if needed
  for (const write of writes) {
    await setDocument(write.collection, write.documentId, write.data);
  }
}
