import { NextResponse } from 'next/server';
import { getDb, getSessionUser } from '@/lib/db';
import { handleApiError } from '@/lib/api/route-helpers';

export async function GET() {
  try {
    const db = getDb();
    const [user, demoUsers] = await Promise.all([
      getSessionUser(),
      db.listDemoUsers(),
    ]);
    return NextResponse.json({ user, demoUsers });
  } catch (err) {
    return handleApiError(err);
  }
}
