import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import {
  ALLOWED_PRIVATE_DOC_MIMES,
  ALLOWED_PUBLIC_IMAGE_MIMES,
  getStorage,
} from '@/lib/storage';
import { handleApiError } from '@/lib/api/route-helpers';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB server ceiling

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`upload:${ip}`, 40, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Upload limit exceeded. Retry in ${rl.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const purpose = String(formData.get('purpose') || 'property');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File must be smaller than 5 MB.' },
        { status: 400 }
      );
    }

    const mime = file.type.toLowerCase();
    let ownerId = 'pending';

    if (purpose === 'property') {
      const broker = await requireRole('broker');
      ownerId = broker.id;
      if (!ALLOWED_PUBLIC_IMAGE_MIMES.has(mime)) {
        return NextResponse.json(
          { error: 'Property photos must be JPG, PNG, or WebP.' },
          { status: 400 }
        );
      }
    } else if (purpose === 'avatar') {
      const user = await getSessionUser();
      ownerId = user?.id ?? 'onboarding';
      if (!ALLOWED_PUBLIC_IMAGE_MIMES.has(mime)) {
        return NextResponse.json(
          { error: 'Profile photo must be JPG, PNG, or WebP.' },
          { status: 400 }
        );
      }
    } else if (purpose === 'verification') {
      const user = await getSessionUser();
      ownerId = user?.id ?? 'onboarding';
      if (!ALLOWED_PRIVATE_DOC_MIMES.has(mime)) {
        return NextResponse.json(
          { error: 'Verification document must be JPG, PNG, WebP, or PDF.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Invalid upload purpose' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket =
      purpose === 'verification' ? 'private-verification' : 'public-media';
    const result = await getStorage().saveFile({
      bucket,
      folder: purpose,
      buffer,
      contentType: mime,
      ownerId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
