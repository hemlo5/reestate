import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/db';
import { getStorage } from '@/lib/storage';
import { handleApiError } from '@/lib/api/route-helpers';

export async function GET(
  _req: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const actor = await requireAuth();
    const { key } = await context.params;
    const joined = key.join('/');

    const ownsByKey =
      actor.brokerProfile?.verificationDocs?.govtIdFileKey === joined ||
      joined.includes(`/${actor.id}/`);

    if (!ownsByKey) {
      return NextResponse.json(
        { error: 'Verification documents are strictly private to the submitting broker.' },
        { status: 403 }
      );
    }

    const file = await getStorage().readFile('private-verification', joined);
    if (!file) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
