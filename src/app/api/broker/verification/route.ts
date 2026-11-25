import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, requireRole } from '@/lib/db';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

const submissionSchema = z.object({
  reraId: z.string().trim().min(3).max(120),
  verificationDocs: z.object({
    reraAuthority: z.string().trim().min(2).max(100),
    govtIdType: z.string().trim().min(2).max(80),
    govtIdNumber: z.string().trim().min(2).max(80),
    govtIdFileName: z.string().trim().max(200).optional(),
    govtIdFileKey: z.string().trim().max(500).optional(),
    submittedAt: z.string().optional(),
  }),
});

export async function POST(req: Request) {
  try {
    const broker = await requireRole('broker');
    const submission = submissionSchema.parse(await parseJsonBody(req));
    const updated = await getDb().updateUserProfile(broker.id, {
      brokerProfile: {
        reraId: submission.reraId,
        verificationDocs: { ...submission.verificationDocs, submittedAt: new Date().toISOString() },
      },
    });
    if (!updated) return NextResponse.json({ error: 'Broker profile not found.' }, { status: 404 });
    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
