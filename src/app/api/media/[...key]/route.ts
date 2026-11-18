import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function GET(
  _req: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key } = await context.params;
  const joined = key.join('/');
  const file = await getStorage().readFile('public-media', joined);
  if (!file) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
