import { NextResponse } from 'next/server';
import { getDb, requireAuth } from '@/lib/db';
import { AppError } from '@/lib/db/errors';
import { setWorkspaceCookie } from '@/lib/auth/session';
import { updateProfileSchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'seeker' || user.brokerProfile) {
      throw new AppError('This account already has a broker workspace.', 409, 'BROKER_ALREADY_REGISTERED');
    }

    const parsed = updateProfileSchema.parse(await parseJsonBody(req));
    if (!parsed.name || !parsed.phone || !parsed.city || !parsed.brokerProfile) {
      throw new AppError('Complete your personal and broker profile details first.', 400, 'BROKER_PROFILE_REQUIRED');
    }

    const broker = await getDb().registerAsBroker(user.id, {
      name: parsed.name,
      phone: parsed.phone,
      city: parsed.city,
      avatarUrl: parsed.avatarUrl,
      brokerProfile: parsed.brokerProfile,
    });
    if (!broker) {
      throw new AppError('This account could not be registered as a broker.', 409, 'BROKER_REGISTRATION_CONFLICT');
    }

    const res = NextResponse.json({ user: broker });
    setWorkspaceCookie(res, 'broker');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
