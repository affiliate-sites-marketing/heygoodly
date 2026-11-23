import { SITE_DOMAIN, SITE_NAME, SITE_URL } from '@/constants/site';

export const BACKEND_INTERNAL_BASE = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8080'
).replace(/\/api\/v1\/?$/, '');

export async function fetchBackendData<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_INTERNAL_BASE}${path}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function fetchPublicSettings(): Promise<Record<string, string>> {
  const data = await fetchBackendData<{ settings?: Record<string, string> } & Record<string, string>>(
    '/api/v1/settings/public'
  );
  if (!data) return {};
  return data.settings || data;
}

export function resolveSiteOrigin(settings?: Record<string, string>): string {
  const canonical = (settings?.canonical_url || '').trim().replace(/\/+$/, '');
  if (canonical && /^https?:\/\/[^/\s]+/i.test(canonical)) {
    return canonical;
  }
  return SITE_URL;
}

export function resolveSiteName(settings?: Record<string, string>): string {
  return (settings?.site_name || '').trim() || SITE_NAME;
}

export function resolveSiteDomain(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./, '');
  } catch {
    return SITE_DOMAIN;
  }
}

export function stripHtmlToText(html?: string | null, maxLength = 160): string {
  if (!html) return '';
  const clean = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Fetch an image URL and convert it to a base64 data URI compatible with next/og (Satori).
 * Only PNG, JPEG, and GIF are returned because Satori does not natively decode WebP/AVIF.
 * Falls back gracefully to null if unreachable or unsupported.
 */
export async function fetchOgCompatibleImage(
  rawUrl?: string | null,
  origin?: string
): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/png') || trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/jpg')) {
    return trimmed;
  }

  let fetchUrl = trimmed;
  if (fetchUrl.startsWith('/')) {
    fetchUrl = `${origin || SITE_URL}${fetchUrl}`;
  }

  // Inside Docker, rewrite /media/<bucket>/<key> to internal shared-minio when available
  const internalMinio = process.env.MINIO_INTERNAL_URL || process.env.MINIO_ENDPOINT;
  const mediaMatch = fetchUrl.match(/\/media\/(.+)$/i);
  const candidates: string[] = [];
  if (mediaMatch && internalMinio) {
    candidates.push(`${internalMinio.replace(/\/+$/, '')}/${mediaMatch[1]}`);
  }
  candidates.push(fetchUrl);

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const contentType = (res.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/gif'].includes(contentType)) {
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      // Guard against huge files (> 3.5MB) slowing down OG rendering
      if (buf.byteLength === 0 || buf.byteLength > 3_500_000) continue;

      const mime = contentType === 'image/jpg' ? 'image/jpeg' : contentType;
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      continue;
    }
  }

  return null;
}
