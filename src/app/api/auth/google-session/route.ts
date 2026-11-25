import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { newSessionExpiryIso, setSessionCookie } from '@/lib/auth/session';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';
import { getValidatedSupabaseConfig } from '@/lib/db/supabase-config';

export async function POST(req: Request) {
  try {
    const body = await parseJsonBody(req) as { accessToken?: string; role?: string };
    if (!body.accessToken) return NextResponse.json({ error: 'Missing Google session token.' }, { status: 400 });
    const config = getValidatedSupabaseConfig();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!config || !anonKey) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
    const authClient = createClient(config.url, anonKey, { auth: { persistSession: false } });
    const { data: { user: identity }, error } = await authClient.auth.getUser(body.accessToken);
    if (error || !identity?.email) return NextResponse.json({ error: 'Google session is invalid or expired.' }, { status: 401 });

    const db = getDb();
    let user = await db.getUserByEmail(identity.email);
    if (!user) {
      const role = body.role === 'broker' ? 'broker' : 'seeker';
      const name = identity.user_metadata?.full_name || identity.user_metadata?.name || identity.email.split('@')[0];
      user = await db.createUser({
        name,
        email: identity.email,
        phone: identity.phone || '',
        role,
        city: 'Bengaluru',
        avatarUrl: identity.user_metadata?.avatar_url || undefined,
        authMethod: 'otp',
        password: undefined,
        ...(role === 'broker' ? { brokerProfile: {
          isIndependent: true, phone: identity.phone || '', operatingLocalities: [],
          propertyCategories: [], specializations: [], yearsExperience: 0,
          propertiesManagedCount: 0, verificationDocs: {},
        } } : {}),
      } as Parameters<typeof db.createUser>[0]);
    }
    const session = await db.createSession(user.id, newSessionExpiryIso());
    const res = NextResponse.json({ user });
    await setSessionCookie(res, session.id, user.id);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
