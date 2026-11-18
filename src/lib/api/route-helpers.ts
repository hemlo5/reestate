import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/db/errors';

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message || 'Invalid request payload',
        issues: err.issues,
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }
  console.error('[API Error]', err);
  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

export async function parseJsonBody<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError('Invalid JSON request body', 400, 'INVALID_JSON');
  }
}
