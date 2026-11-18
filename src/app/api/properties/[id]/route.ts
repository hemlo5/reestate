import { NextResponse } from 'next/server';
import { getDb, getSessionUser, requireRole } from '@/lib/db';
import { updatePropertySchema } from '@/lib/validation/schemas';
import { handleApiError, parseJsonBody } from '@/lib/api/route-helpers';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const property = await db.getPropertyById(id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    if (property.availability !== 'available') {
      const viewer = await getSessionUser();
      if (!viewer || viewer.id !== property.brokerId) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ property });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const broker = await requireRole('broker');
    const { id } = await context.params;
    const raw = await parseJsonBody(req);
    const parsed = updatePropertySchema.parse(raw);

    const property = await getDb().updateProperty(id, broker.id, parsed);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    return NextResponse.json({ property });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const broker = await requireRole('broker');
    const { id } = await context.params;
    const deleted = await getDb().deleteProperty(id, broker.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
