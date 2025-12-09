import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

export async function GET() {
  try {
    console.log('Testing Client SDK write (same pattern as games/betting_lines)...');

    const testRef = doc(db, 'shawn', 'test-client');

    await setDoc(testRef, {
      message: 'Hello from CLIENT SDK',
      timestamp: Timestamp.now(),
      test: true
    });

    console.log('Write succeeded! Reading back...');

    const testDoc = await getDoc(testRef);

    return NextResponse.json({
      success: true,
      pattern: 'same as games/betting_lines',
      written: true,
      readBack: testDoc.exists(),
      data: testDoc.data()
    });
  } catch (error: any) {
    console.error('Write failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
}
