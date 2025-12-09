import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export async function GET() {
  try {
    console.log('Client SDK DB type:', typeof db);
    console.log('Client SDK DB app:', db.app?.name);

    // Try to list some collections by querying them
    const collections = ['standings_cache', 'standingsCache', 'betting_lines', 'games', 'predictions'];
    const results: any = {};

    for (const collName of collections) {
      try {
        const q = query(collection(db, collName), limit(5));
        const snapshot = await getDocs(q);
        results[collName] = {
          exists: true,
          docCount: snapshot.size,
          docs: snapshot.docs.map(d => d.id)
        };
      } catch (error: any) {
        results[collName] = {
          exists: false,
          error: error.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      dbApp: db.app?.name,
      collections: results
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
