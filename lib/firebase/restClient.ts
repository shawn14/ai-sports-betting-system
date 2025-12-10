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
 * Convert Firestore value to JavaScript value
 */
function fromFirestoreValue(value: any): any {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if ('nullValue' in value) {
    return null;
  }

  if ('stringValue' in value) {
    return value.stringValue;
  }

  if ('integerValue' in value) {
    return parseInt(value.integerValue, 10);
  }

  if ('doubleValue' in value) {
    return value.doubleValue;
  }

  if ('booleanValue' in value) {
    return value.booleanValue;
  }

  if ('timestampValue' in value) {
    return value.timestampValue;
  }

  if ('arrayValue' in value) {
    const values = value.arrayValue.values || [];
    return values.map(fromFirestoreValue);
  }

  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    return fromFirestoreDocument(fields);
  }

  return null;
}

/**
 * Convert Firestore document fields to JavaScript object
 */
function fromFirestoreDocument(fields: any): any {
  if (!fields || typeof fields !== 'object') {
    return null;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(value);
  }
  return result;
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

/**
 * Query documents from Firestore with filters
 */
export async function getDocuments(
  collection: string,
  filters?: Array<{ field: string; operator: string; value: any }>
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // Build structured query
    const structuredQuery: any = {
      from: [{ collectionId: collection }]
    };

    // Add filters if provided
    if (filters && filters.length > 0) {
      const fieldFilters = filters.map(filter => ({
        fieldFilter: {
          field: { fieldPath: filter.field },
          op: filter.operator.toUpperCase().replace('==', 'EQUAL'),
          value: toFirestoreValue(filter.value)
        }
      }));

      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters: fieldFilters
        }
      };
    }

    const body = JSON.stringify({ structuredQuery });
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;

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
          try {
            // Handle empty results
            if (!responseData || responseData.trim() === '' || responseData.trim() === '[]') {
              resolve([]);
              return;
            }

            // Try parsing as array first
            try {
              const jsonArray = JSON.parse(responseData);
              if (Array.isArray(jsonArray)) {
                const documents = jsonArray
                  .map(result => {
                    if (result.document && result.document.fields) {
                      return fromFirestoreDocument(result.document.fields);
                    }
                    return null;
                  })
                  .filter(doc => doc !== null);
                console.log(`✅ Parsed ${documents.length} documents from query`);
                resolve(documents);
                return;
              }
            } catch (e) {
              // Not a JSON array, try newline-delimited
            }

            // Parse as newline-delimited JSON
            const lines = responseData.trim().split('\n');
            const documents = lines
              .map(line => {
                try {
                  const result = JSON.parse(line);
                  if (result.document && result.document.fields) {
                    return fromFirestoreDocument(result.document.fields);
                  }
                  return null;
                } catch (e) {
                  return null;
                }
              })
              .filter(doc => doc !== null);

            console.log(`✅ Parsed ${documents.length} documents from query`);
            resolve(documents);
          } catch (parseError) {
            console.error('Parse error:', parseError);
            reject(new Error(`Failed to parse query response: ${parseError}`));
          }
        } else {
          reject(new Error(`Firebase query failed (${res.statusCode}): ${responseData}`));
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
