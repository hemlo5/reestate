export function parseValidHttpUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function getValidatedSupabaseConfig(): {
  url: string;
  serviceKey: string;
  projectId: string | null;
} | null {
  const url = parseValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  let projectId: string | null = null;
  try {
    projectId = new URL(url).hostname.split('.')[0] || null;
  } catch {
    projectId = null;
  }

  return { url, serviceKey, projectId };
}
