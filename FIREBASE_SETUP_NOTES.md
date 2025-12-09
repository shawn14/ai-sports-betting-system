# Firebase Setup Notes

## CRITICAL: Use REST API, Not Firebase JS SDK

**Date:** December 9, 2025

### Problem
The Firebase JavaScript SDK (from `firebase/firestore` package) was **NOT** writing data to the actual Firebase project, despite:
- Correct credentials
- Correct project ID
- Security rules set to allow all reads/writes
- No errors reported (writes appeared successful but data never appeared in Firebase Console)

### Root Cause
Unknown issue with Firebase JS SDK client - writes were either going to a local cache, emulator, or being silently dropped. Multiple attempts to fix the SDK configuration all failed.

### Solution: Direct REST API Implementation
Created custom REST API client at `/lib/firebase/restClient.ts` that bypasses the Firebase SDK entirely and makes direct HTTPS requests to Firestore REST API.

**Key Functions:**
- `setDocument(collection, documentId, data)` - Write a document
- `batchWrite(writes)` - Write multiple documents

### Evidence
1. **Firebase SDK**: Reported success but data never appeared in Firebase Console
2. **REST API**: Immediately worked - data visible in Console within seconds

See screenshot showing successful data upload (betting_lines, standings_cache, etc. all populated).

### Implementation Files

**REST Client:**
- `/lib/firebase/restClient.ts` - Core REST API client

**Working Upload Scripts:**
- `/scripts/uploadStandingsREST.ts` - Successfully uploaded 33 standings files
- `/scripts/testRestClient.ts` - Test script
- `/scripts/testDirectAPI.ts` - Initial proof-of-concept

**Broken (Don't Use):**
- `/lib/firebase/config.ts` - Firebase JS SDK config (broken)
- Any script using `import { db } from '../lib/firebase/config'`
- Any script using `setDoc()`, `addDoc()`, etc. from `firebase/firestore`

### Going Forward

**For all scripts that need to write to Firebase:**
```typescript
// ✅ CORRECT - Use REST API
import { setDocument } from '../lib/firebase/restClient';

await setDocument('collection_name', 'document_id', data);
```

```typescript
// ❌ WRONG - Don't use Firebase SDK
import { db } from '../lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';

await setDoc(doc(db, 'collection', 'doc_id'), data); // This won't work!
```

### Results
- ✅ **33 standings files** uploaded successfully to `standings_cache` collection
- ✅ All data visible in Firebase Console
- ✅ REST API is reliable and working perfectly

### Next Steps
- Register models using REST API
- Update any existing scripts to use REST API instead of SDK
- Consider keeping SDK for **reads only** if needed, but use REST API for all writes
