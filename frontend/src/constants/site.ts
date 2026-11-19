/**
 * Canonical public origin of the site (no trailing slash).
 * Configure via NEXT_PUBLIC_SITE_URL; falls back to local dev.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME ||
  (SITE_URL.toLowerCase().includes('heyworthly') || SITE_URL.includes(':81') ? 'HeyWorthly' : 'HeyGoodly');

export const SITE_SLUG = SITE_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'heygoodly';
export const SITE_DOMAIN = `${SITE_SLUG}.com`;
export const SITE_2FA_ISSUER = `${SITE_NAME}ProCMS`;

/** Build an absolute URL from a site-relative path (e.g. ROUTES.PUBLIC.POST_DETAIL(slug)). */
export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
