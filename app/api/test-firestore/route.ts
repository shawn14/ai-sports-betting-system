import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    console.log('Testing Firestore connection...');
    console.log('DB instance:', typeof db);

    const cacheId = '2025-w15';
    console.log(`Attempting to read: standings_cache/${cacheId}`);

    const cacheRef = doc(db, 'standings_cache', cacheId);
    console.log('Document reference created:', cacheRef.path);

    const cacheDoc = await getDoc(cacheRef);
    console.log('Document exists:', cacheDoc.exists());

    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      return NextResponse.json({
        success: true,
        exists: true,
        docId: cacheDoc.id,
        dataKeys: Object.keys(data),
        teamCount: data.standings?.length || 0,
        season: data.season,
        week: data.week
      });
    } else {
      return NextResponse.json({
        success: false,
        exists: false,
        message: 'Document does not exist'
      });
    }
  } catch (error) {
    console.error('Firestore test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: (error as any)?.code
    }, { status: 500 });
  }
}
