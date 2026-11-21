import { apiClient } from '@/lib/api/axios-client';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { Store, ReviewerProfile } from '@/types/deals';
import { TtlCache } from '@/lib/utils/ttlCache';
import { buildDefaultStoreFaqs } from '@/constants/storeTemplates';

export { buildDefaultStoreFaqs };

export function extractPlainTextExcerpt(htmlOrText?: string | null, maxChars = 240): string {
  if (!htmlOrText) return '';
  const raw = String(htmlOrText).trim();
  if (!raw) return '';
  const withoutHeadings = raw
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ')
    .replace(/<\/(p|div|li|br|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  const candidate = withoutHeadings || raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!candidate) return '';
  if (candidate.length <= maxChars) return candidate;
  const sentences = candidate.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    let summary = '';
    for (const s of sentences) {
      if ((summary + ' ' + s.trim()).trim().length <= maxChars) {
        summary = (summary + ' ' + s.trim()).trim();
      } else {
        break;
      }
    }
    if (summary.length >= 60) return summary;
  }
  return candidate.slice(0, maxChars - 3).replace(/\s+\S*$/, '') + '...';
}

export function buildDefaultPopularSearches(storeName: string): string[] {
  const clean = (storeName || '').trim();
  if (!clean) return [];
  return [clean];
}

export function mapBackendStoreToStore(s: any): Store {
  const storeName = String(s.name || '').trim();
  const maxOfferNum = Number(s.maxOffer ?? 0);
  const maxOfferVal = maxOfferNum > 0 ? `Up to ${maxOfferNum}% OFF` : 'Verified Offers';
  const domain = s.displayDomain
    ? String(s.displayDomain).trim()
    : s.afWebsite
      ? String(s.afWebsite).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '')
      : (s.domain ? String(s.domain) : '');

  const rawDescription = String(s.aboutStore || s.description || '');
  const rawShort = s.socialDescription || s.metaDescription || s.shortDescription || '';
  const resolvedShortDescription =
    extractPlainTextExcerpt(rawShort, 260) ||
    extractPlainTextExcerpt(rawDescription, 240) ||
    (storeName
      ? `Discover verified ${storeName} coupon codes, exclusive promo deals, and active discounts tested daily.`
      : undefined);

  let parsedTags: string[] = [];
  if (Array.isArray(s.tags)) {
    parsedTags = s.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
  } else if (typeof s.tags === 'string' && s.tags.trim()) {
    try {
      const parsed = JSON.parse(s.tags);
      if (Array.isArray(parsed)) {
        parsedTags = parsed.map((t: unknown) => String(t).trim()).filter(Boolean);
      }
    } catch {
      parsedTags = s.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
  }
  if (parsedTags.length === 0 && storeName) {
    parsedTags = [storeName];
  }

  const rawPopularSearches = Array.isArray(s.popularSearches)
    ? s.popularSearches.map((q: unknown) => String(q).trim()).filter(Boolean)
    : [];
  const resolvedPopularSearches =
    rawPopularSearches.length > 0 ? rawPopularSearches : buildDefaultPopularSearches(storeName);

  const rawFaqs = Array.isArray(s.faqs)
    ? s.faqs.filter((f: any) => f && (String(f.question || '').trim() || String(f.answer || '').trim()))
    : [];
  const resolvedFaqs = rawFaqs.length > 0 ? rawFaqs : buildDefaultStoreFaqs(storeName);

  return {
    id: String(s.id),
    name: storeName,
    slug: String(s.slug || ''),
    logoText: storeName.substring(0, 2).toUpperCase(),
    logoBg: '#0f172a',
    logoUrl: s.logo || s.logoUrl || undefined,
    bannerUrl: s.socialCardImage || s.bannerUrl || undefined,
    categoryId: s.categoryId ? Number(s.categoryId) : undefined,
    category: String(s.categoryName || s.category || 'Uncategorized'),
    rating: Number(s.ratingScore ?? s.rating ?? 0),
    reviewCount: Number(s.ratingCount ?? s.reviewCount ?? s.reviewsCount ?? 0),
    couponsCount: Number(s.activeOffersCount ?? s.activeCoupons ?? s.couponsCount ?? 0),
    maxDiscount: s.maxDiscount ? String(s.maxDiscount) : maxOfferVal,
    maxOfferPercent: maxOfferNum > 0 ? maxOfferNum : undefined,
    description: rawDescription,
    shortDescription: resolvedShortDescription,
    popularSearches: resolvedPopularSearches,
    tags: parsedTags,
    faqs: resolvedFaqs,
    ratingBreakdown: s.ratingBreakdown && typeof s.ratingBreakdown === 'object'
      ? {
          fiveStar: Number(s.ratingBreakdown.fiveStar ?? 0),
          fourStar: Number(s.ratingBreakdown.fourStar ?? 0),
          threeStar: Number(s.ratingBreakdown.threeStar ?? 0),
          twoStar: Number(s.ratingBreakdown.twoStar ?? 0),
          oneStar: Number(s.ratingBreakdown.oneStar ?? 0),
        }
      : undefined,
    customerReviews: Array.isArray(s.customerReviews)
      ? s.customerReviews.map((r: any) => ({
          id: r.id ? Number(r.id) : undefined,
          reviewerProfileId: r.reviewerProfileId ? Number(r.reviewerProfileId) : undefined,
          reviewerName: String(r.reviewerName || ''),
          reviewerAvatar: r.reviewerAvatar ? String(r.reviewerAvatar) : undefined,
          isVerified: r.isVerified !== false,
          rating: Number(r.rating ?? 5),
          reviewDateLabel: r.reviewDateLabel ? String(r.reviewDateLabel) : '',
          comment: String(r.comment || ''),
          sortOrder: r.sortOrder !== undefined ? Number(r.sortOrder) : 0,
          isActive: r.isActive !== false,
        }))
      : [],
    affiliateUrl: `/go/${s.slug}`,
    featured: Boolean(s.isFeatured || s.featured),
    isFeatured: Boolean(s.isFeatured || s.featured),
    websiteUrl: s.afWebsite || (domain ? `https://${domain}` : ''),
    domain,
    clicks: Number(s.afVisitCount ?? s.clicks ?? 0),
    isActive: s.isActive !== false,
  };
}

class StoreService {
  private readonly publicCache = new TtlCache();
  private static readonly CACHE_TTL_MS = 30_000;

  /**
   * Fetch stores directly from backend API (PostgreSQL + Redis, with 30s client cache).
   */
  async getStores(params?: {
    category?: string;
    featured?: boolean;
    search?: string;
    size?: number;
  }): Promise<Store[]> {
    const cacheKey = `stores:list:${JSON.stringify(params ?? {})}`;
    const cached = this.publicCache.get<Store[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await apiClient.get(API_ENDPOINTS.PUBLIC.STORES, {
        params: {
          page: 0,
          size: params?.size ?? 50,
          sortBy: 'sortOrder',
          direction: 'asc',
          search: params?.search || undefined,
          category:
            params?.category && params.category.toLowerCase() !== 'all'
              ? params.category
              : undefined,
          featured: params?.featured,
        },
        timeout: 6000,
      });

      const pageData = res.data?.data;
      const list =
        pageData?.content ||
        pageData?.items ||
        (Array.isArray(pageData) ? pageData : Array.isArray(res.data) ? res.data : null);
      if (list && Array.isArray(list)) {
        const mapped = list.map(mapBackendStoreToStore);
        this.publicCache.set(cacheKey, mapped, StoreService.CACHE_TTL_MS);
        return mapped;
      }
    } catch (err) {
      console.warn('Failed to fetch public stores from backend:', err);
    }
    return [];
  }

  /**
   * Fetch paginated public stores directly from backend API.
   */
  async getPaginatedStores(params?: {
    page?: number;
    size?: number;
    search?: string;
    letter?: string;
    category?: string | string[];
    featured?: boolean;
    tag?: string | string[];
    sortBy?: string;
    direction?: string;
  }): Promise<{ content: Store[]; totalElements: number; totalPages: number; pageNumber: number }> {
    const page = params?.page ?? 0;
    const size = params?.size ?? 24;
    const cacheKey = `stores:page:${JSON.stringify({ ...params, page, size })}`;
    const cached = this.publicCache.get<{ content: Store[]; totalElements: number; totalPages: number; pageNumber: number }>(cacheKey);
    if (cached) return cached;

    try {
      const res = await apiClient.get(API_ENDPOINTS.PUBLIC.STORES, {
        params: {
          page,
          size,
          search: params?.search || undefined,
          letter: params?.letter && params.letter !== 'ALL' ? params.letter : undefined,
          category: Array.isArray(params?.category)
            ? (params.category.length > 0 ? params.category.join(',') : undefined)
            : (params?.category && params.category.toUpperCase() !== 'ALL' ? params.category : undefined),
          featured: params?.featured,
          tag: Array.isArray(params?.tag)
            ? (params.tag.length > 0 ? params.tag.join(',') : undefined)
            : (params?.tag && params.tag.toUpperCase() !== 'ALL' ? params.tag : undefined),
          sortBy: params?.sortBy ?? 'sortOrder',
          direction: params?.direction ?? 'asc',
        },
      });

      const pageData = res.data?.data;
      if (pageData && Array.isArray(pageData.content)) {
        const result = {
          content: pageData.content.map(mapBackendStoreToStore),
          totalElements: Number(pageData.totalElements ?? pageData.content.length),
          totalPages: Math.max(1, Number(pageData.totalPages ?? 1)),
          pageNumber: Number(pageData.pageNumber ?? page),
        };
        this.publicCache.set(cacheKey, result, StoreService.CACHE_TTL_MS);
        return result;
      }
    } catch (err) {
      console.warn('Backend public stores API error:', err);
    }

    return {
      content: [],
      totalElements: 0,
      totalPages: 1,
      pageNumber: page,
    };
  }

  /**
   * Get single store by slug
   */
  async getStoreBySlug(slug: string): Promise<Store | null> {
    if (!slug || !slug.trim()) return null;
    const cleanSlug = slug.trim().replace(/-store$/i, '').toLowerCase();
    const cacheKey = `stores:slug:${cleanSlug}`;
    const cached = this.publicCache.get<Store>(cacheKey);
    if (cached) return cached;

    try {
      const res = await apiClient.get(API_ENDPOINTS.PUBLIC.STORE_DETAIL(cleanSlug), {
        timeout: 6000,
      });
      const data = res.data?.data || res.data;
      if (data && data.id && data.name) {
        const mapped = mapBackendStoreToStore(data);
        this.publicCache.set(cacheKey, mapped, StoreService.CACHE_TTL_MS);
        return mapped;
      }
    } catch {
      // 404 or offline -> return null cleanly
    }

    return null;
  }

  /**
   * Get featured stores
   */
  async getFeaturedStores(size = 8): Promise<Store[]> {
    return this.getStores({ featured: true, size });
  }

  /**
   * Admin: Get all stores with pagination and search
   */
  async getAdminStores(params?: {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    categoryId?: number;
  }): Promise<{ content: any[]; totalElements: number }> {
    const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORES, {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 100,
        search: params?.search,
        status: params?.status,
        categoryId: params?.categoryId,
      },
    });
    return res.data?.data || { content: [], totalElements: 0 };
  }

  async getAdminStoreById(id: string | number): Promise<any> {
    const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORE_DETAIL(id));
    return res.data?.data || res.data;
  }

  async createStore(payload: any): Promise<any> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.STORES, payload);
    this.publicCache.clear();
    return res.data?.data || res.data;
  }

  async updateStore(id: string | number, payload: any): Promise<any> {
    const res = await apiClient.put(API_ENDPOINTS.ADMIN.STORE_DETAIL(id), payload);
    this.publicCache.clear();
    return res.data?.data || res.data;
  }

  async toggleStoreStatus(id: string | number): Promise<any> {
    const res = await apiClient.patch(API_ENDPOINTS.ADMIN.STORE_TOGGLE(id));
    this.publicCache.clear();
    return res.data?.data || res.data;
  }

  async cloneStore(id: string | number): Promise<any> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.STORE_CLONE(id));
    this.publicCache.clear();
    return res.data?.data || res.data;
  }

  async deleteStore(id: string | number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ADMIN.STORE_DETAIL(id));
    this.publicCache.clear();
  }

  async searchReviewerProfiles(search = '', signal?: AbortSignal): Promise<ReviewerProfile[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORE_REVIEWERS, {
        params: search.trim() ? { search: search.trim() } : undefined,
        signal,
      });
      const list = res.data?.data ?? res.data;
      if (Array.isArray(list)) {
        return list.map((p: any) => ({
          id: Number(p.id),
          name: String(p.name || ''),
          avatarUrl: p.avatarUrl ? String(p.avatarUrl) : undefined,
          isVerified: p.isVerified !== false,
        }));
      }
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        console.warn('Failed to search reviewer profiles:', err);
      }
    }
    return [];
  }
}

const storeService = new StoreService();
export default storeService;
