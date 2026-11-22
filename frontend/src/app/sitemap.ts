import { MetadataRoute } from 'next';
import { ROUTES } from '@/constants/routes';
import { SITE_URL } from '@/constants/site';
import { resolvePublicPageHref } from '@/services/pageService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_BASE =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080').replace(/\/api\/v1\/?$/, '');

interface PagedResponse<T> {
  content?: T[];
  items?: T[];
  totalPages?: number;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}${path}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

function unwrapList<T>(data: PagedResponse<T> | T[] | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

async function fetchAllPaged<T>(basePath: string, maxPages = 20): Promise<T[]> {
  const sep = basePath.includes('?') ? '&' : '?';
  const first = await fetchJson<PagedResponse<T> | T[]>(`${basePath}${sep}page=0&size=500`);
  const items = [...unwrapList(first)];
  if (!first || Array.isArray(first)) return items;

  const totalPages = Math.min(Math.max(1, Number(first.totalPages ?? 1)), maxPages);
  if (totalPages <= 1) return items;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchJson<PagedResponse<T> | T[]>(`${basePath}${sep}page=${i + 1}&size=500`)
    )
  );
  for (const page of rest) {
    items.push(...unwrapList(page));
  }
  return items;
}

function safeDate(value: string | undefined | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function resolveOrigin(canonicalUrl?: string): string {
  const candidate = (canonicalUrl || '').trim().replace(/\/+$/, '');
  if (candidate && /^https?:\/\/[^/\s]+/i.test(candidate)) {
    return candidate;
  }
  return SITE_URL;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [settingsRaw, stores, posts, categoriesRaw, pagesRaw, tagsRaw] = await Promise.all([
    fetchJson<{ settings?: Record<string, string> } & Record<string, string>>('/api/v1/settings/public'),
    fetchAllPaged<{ slug: string; updatedAt?: string }>('/api/v1/public/stores'),
    fetchAllPaged<{ slug: string; updatedAt?: string; publishedAt?: string }>('/api/v1/public/posts'),
    fetchJson<PagedResponse<{ slug: string; updatedAt?: string }> | Array<{ slug: string; updatedAt?: string }>>(
      '/api/v1/public/categories?type=post&page=0&size=500'
    ),
    fetchJson<
      PagedResponse<{ slug: string; updatedAt?: string; isActive?: boolean }> | Array<{ slug: string; updatedAt?: string; isActive?: boolean }>
    >('/api/v1/pages'),
    fetchJson<
      PagedResponse<{ slug: string; updatedAt?: string; isActive?: boolean; totalUsageCount?: number; postsCount?: number; storesCount?: number }> |
      Array<{ slug: string; updatedAt?: string; isActive?: boolean; totalUsageCount?: number; postsCount?: number; storesCount?: number }>
    >('/api/v1/public/tags'),
  ]);

  const settingsMap = settingsRaw?.settings || settingsRaw || {};
  const origin = resolveOrigin(settingsMap.canonical_url);
  const toUrl = (path: string) => `${origin}${path.startsWith('/') ? path : `/${path}`}`;

  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: toUrl(ROUTES.PUBLIC.HOME),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: toUrl(ROUTES.PUBLIC.STORES),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: toUrl(ROUTES.PUBLIC.POSTS),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: toUrl(ROUTES.PUBLIC.CATEGORIES),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: toUrl(ROUTES.PUBLIC.CONTACT_US),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const pageRoutes: MetadataRoute.Sitemap = unwrapList(pagesRaw)
    .filter((p) => Boolean(p?.slug) && p.isActive !== false)
    .map((p) => ({
      url: toUrl(resolvePublicPageHref(p.slug)),
      lastModified: safeDate(p.updatedAt, now),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }));

  const storeRoutes: MetadataRoute.Sitemap = stores
    .filter((store) => Boolean(store?.slug))
    .map((store) => ({
      url: toUrl(ROUTES.PUBLIC.STORE_DETAIL(store.slug)),
      lastModified: safeDate(store.updatedAt, now),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }));

  const articleRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => Boolean(post?.slug))
    .map((post) => ({
      url: toUrl(ROUTES.PUBLIC.POST_DETAIL(post.slug)),
      lastModified: safeDate(post.updatedAt || post.publishedAt, now),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = unwrapList(categoriesRaw)
    .filter((cat) => Boolean(cat?.slug))
    .map((cat) => ({
      url: toUrl(ROUTES.PUBLIC.CATEGORY_DETAIL(cat.slug)),
      lastModified: safeDate(cat.updatedAt, now),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

  const tagRoutes: MetadataRoute.Sitemap = unwrapList(tagsRaw)
    .filter((tag) => {
      if (!tag?.slug || tag.isActive === false) return false;
      const usage =
        Number(tag.totalUsageCount ?? 0) +
        Number(tag.postsCount ?? 0) +
        Number(tag.storesCount ?? 0);
      return usage > 0;
    })
    .map((tag) => ({
      url: toUrl(ROUTES.PUBLIC.TAG_DETAIL(tag.slug)),
      lastModified: safeDate(tag.updatedAt, now),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  const seen = new Set<string>();
  return [
    ...coreRoutes,
    ...storeRoutes,
    ...articleRoutes,
    ...categoryRoutes,
    ...tagRoutes,
    ...pageRoutes,
  ].filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
