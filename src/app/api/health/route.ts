import { NextResponse } from 'next/server';
import { getDb, getDbBackendInfo } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const [info, demos] = await Promise.all([
      getDbBackendInfo(),
      db.listDemoUsers(),
    ]);
    return NextResponse.json({
      status: 'ok',
      ...info,
      demoUsersCount: demos.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Database health check failed',
      },
      { status: 500 }
    );
  }
}
