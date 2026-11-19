import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/constants/site';

const REDIRECT_HEADERS_BASE = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
} as const;

function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080').replace(/\/api\/v1\/?$/, '')
  ).replace(/\/+$/, '');
}

/**
 * Resolves the external public origin from forwarded proxy headers so redirects
 * inside containerized `0.0.0.0:3000` Node servers never leak the internal bind host.
 */
export function resolvePublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostHeader = request.headers.get('host')?.split(',')[0]?.trim();
  const candidateHost = forwardedHost || hostHeader;

  if (candidateHost && !candidateHost.startsWith('0.0.0.0')) {
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto = forwardedProto || (request.url.startsWith('https://') ? 'https' : 'http');
    return `${proto}://${candidateHost}`;
  }

  return SITE_URL;
}

export function buildNoIndexRedirect(location: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: location,
      ...REDIRECT_HEADERS_BASE,
    },
  });
}

/**
 * Proxies an affiliate cloaked redirect (`/go/{slug}` or `/out/{id}`) to the backend
 * while forwarding client tracking headers and falling back safely to `fallbackPath`.
 */
export async function resolveAffiliateRedirect(
  request: NextRequest,
  backendPath: string,
  fallbackPath: string
): Promise<NextResponse> {
  const publicOrigin = resolvePublicOrigin(request);
  const incomingUrl = new URL(request.url);
  const backendUrl = `${getBackendBaseUrl()}${backendPath}${incomingUrl.search}`;

  const forwardHeaders = new Headers();
  for (const headerName of ['x-forwarded-for', 'x-real-ip', 'user-agent', 'referer']) {
    const value = request.headers.get(headerName);
    if (value) {
      forwardHeaders.set(headerName, value);
    }
  }

  let destination: string | null = null;
  try {
    const backendRes = await fetch(backendUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'manual',
      cache: 'no-store',
    });

    if (backendRes.status >= 300 && backendRes.status < 400) {
      const location = backendRes.headers.get('location');
      if (location) {
        destination = location;
      }
    }
  } catch {
    // Fall back to the local public route if backend redirect fails
  }

  if (!destination) {
    const fallbackUrl = new URL(fallbackPath, publicOrigin);
    return buildNoIndexRedirect(fallbackUrl.toString());
  }

  const targetUrl = new URL(destination, publicOrigin);
  incomingUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  return buildNoIndexRedirect(targetUrl.toString());
}
