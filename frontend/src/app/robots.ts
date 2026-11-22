import { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_BASE =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080').replace(/\/api\/v1\/?$/, '');

function resolveOrigin(canonicalUrl?: string): string {
  const candidate = (canonicalUrl || '').trim().replace(/\/+$/, '');
  if (candidate && /^https?:\/\/[^/\s]+/i.test(candidate)) {
    return candidate;
  }
  return SITE_URL;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  let noIndex = false;
  let origin = SITE_URL;

  try {
    const res = await fetch(`${BACKEND_BASE}/api/v1/settings/public`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const map = json?.data?.settings || json?.data || {};
      noIndex = map?.no_index === 'true';
      origin = resolveOrigin(map?.canonical_url);
    }
  } catch {
    // Use standard crawl rules if settings fetch fails
  }

  if (noIndex) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
      sitemap: `${origin}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/go/',
          '/out/',
          '/api/',
          '/login',
          '/verify-2fa',
          '/search',
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
