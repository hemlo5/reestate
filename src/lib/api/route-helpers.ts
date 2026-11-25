import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/db/errors';

export function handleApiError(err: unknown): NextResponse {
  // Next dev can load the same module through separate server bundles, so
  // `instanceof` alone is not reliable for application errors across routes.
  if (
    err instanceof AppError ||
    (typeof err === 'object' && err !== null &&
      (err as { name?: unknown }).name === 'AppError' &&
      typeof (err as { status?: unknown }).status === 'number' &&
      typeof (err as { message?: unknown }).message === 'string')
  ) {
    const appError = err as AppError;
    return NextResponse.json(
      { error: appError.message, code: appError.code || 'BAD_REQUEST' },
      { status: appError.status }
    );
  }
  if (
    err instanceof ZodError ||
    (typeof err === 'object' && err !== null &&
      (err as { name?: unknown }).name === 'ZodError' &&
      Array.isArray((err as { issues?: unknown }).issues))
  ) {
    const issues = (err as ZodError).issues;
    const firstIssue = issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message || 'Invalid request payload',
        issues,
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
