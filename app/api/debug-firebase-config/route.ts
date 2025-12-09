import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';

export async function GET() {
  return NextResponse.json({
    appName: db.app.name,
    projectId: db.app.options.projectId,
    authDomain: db.app.options.authDomain,
    databaseId: (db as any)._databaseId?.database || '(default)',
    apiKey: db.app.options.apiKey ? `${db.app.options.apiKey.substring(0, 10)}...` : 'not set'
  });
}
