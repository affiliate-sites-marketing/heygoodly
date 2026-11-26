'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SITE_NAME } from '@/constants/site';
import Image from 'next/image';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import AdminDevicePreviewFrame from '@/components/admin/AdminDevicePreviewFrame';
import StoreLogoFrame from '@/components/store/StoreLogoFrame';
import {
  Edit2,
  Eye,
  Clock,
  Calendar,
  CalendarClock,
  ChevronRight,
  ShieldCheck,
  Star,
  FileText,
  CheckCircle2,
  Store as StoreIcon,
  Tag,
  Hash,
  ExternalLink,
  Plus,
  X,
  BookOpen,
  Sparkles,
  PanelRight,
  Search,
  AlertCircle,
  Newspaper,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { tagService, type TagItem } from '@/services/tagService';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import AdminFormPage, {
  FormErrorBanner,
  FormLoading,
  FormNotFound,
  FormQuickGuide,
  FormSection,
  inputClass,
  labelClass,
  scrollToFormField,
  toValidSlug,
} from '@/components/admin/AdminFormPage';
import CopyPublicLinkButton from '@/components/admin/CopyPublicLinkButton';
import AiPostWriterModal from './AiPostWriterModal';
import type { AiGeneratedPostResult } from '@/services/aiService';
import { ROUTES } from '@/constants/routes';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { STORAGE_KEYS } from '@/constants/ui-constants';
import { AI_STORAGE_KEYS } from '@/constants/ai';
import { apiClient } from '@/lib/api/axios-client';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import {
  type AdminArticle,
  type CategoryOption,
} from '../_lib/data';

interface PostFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  categoryId?: number;
  authorName: string;
  authorRole: string;
  readTime: string;
  rating: string;
  status: AdminArticle['status'];
  publishedAt: string;
  scheduledAt: string;
  imageUrl: string;
  featured: boolean;
  isHero: boolean;
  sortOrder: number;
  tags: string;
  storeSlug: string;
  storeName: string;
  showBrandCard: boolean;
  showStoreCoupons: boolean;
  showStoreReviews: boolean;
  showRelatedReviews: boolean;
  showGuaranteeCard: boolean;
  ctaText: string;
  ctaUrl: string;
  brandDescription: string;
  brandHighlights: string;
  guaranteeTitle: string;
  guaranteeText: string;
  showNewsBanner: boolean;
  newsBannerImage: string;
  newsBannerUrl: string;
  newsBannerAlt: string;
  leftBannerImage: string;
  leftBannerUrl: string;
  leftBannerAlt: string;
  rightBannerImage: string;
  rightBannerUrl: string;
  rightBannerAlt: string;
}

const FORM_ID = 'post-form';

function generateSlug(text: string) {
  return toValidSlug(text);
}

function extractExcerptFromHtml(html?: string | null, maxChars = 240): string {
  if (!html) return '';
  const withoutHeadings = html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ');
  const rawSource = withoutHeadings.replace(/<[^>]+>/g, ' ').trim() ? withoutHeadings : html;
  const plain = rawSource
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s*\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain || plain.includes('Provide a detailed introduction to the product review')) return '';
  if (plain.length <= maxChars) return plain;
  const sliced = plain.slice(0, maxChars);
  const lastPeriod = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '), sliced.lastIndexOf('? '));
  if (lastPeriod >= Math.floor(maxChars * 0.5)) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trim() + '...';
}

const POST_FIELD_LABELS: Record<string, string> = {
  title: 'Headline / Title',
  slug: 'Article URL Slug',
  content: 'Article Body Content',
  categoryId: 'Editorial Category',
  rating: 'Score & Rating',
  scheduledAt: 'Scheduled Publish Time',
};

function getDefaultScheduledTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = tomorrow.getFullYear();
  const mm = pad(tomorrow.getMonth() + 1);
  const dd = pad(tomorrow.getDate());
  const hh = pad(tomorrow.getHours());
  const min = pad(tomorrow.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function PostForm({ id }: { id?: string }) {
  return (
    <Suspense fallback={<FormLoading />}>
      <PostFormContent id={id} />
    </Suspense>
  );
}

function PostFormContent({ id }: { id?: string }) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const isEdit = id !== undefined;

  const [postData, setPostData] = useState<AdminArticle | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let mounted = true;
    setLoading(true);

    apiClient
      .get(API_ENDPOINTS.ADMIN.POST_DETAIL(id))
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data;
        if (data && (data.id || data.title)) {
          const now = Date.now();
          const pubTime = data.publishedAt ? new Date(data.publishedAt).getTime() : 0;
          const isFuture = pubTime > now;
          let status: AdminArticle['status'] = 'DRAFT';
          if (data.status === 'PUBLISHED' || data.status === 'SCHEDULED' || data.status === 'DRAFT') {
            status = data.status;
          } else if (data.isActive) {
            status = isFuture ? 'SCHEDULED' : 'PUBLISHED';
          }

          let scheduledAt = getDefaultScheduledTime();
          if (data.publishedAt && isFuture) {
            const pubDate = new Date(data.publishedAt);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const yyyy = pubDate.getFullYear();
            const mm = pad(pubDate.getMonth() + 1);
            const dd = pad(pubDate.getDate());
            const hh = pad(pubDate.getHours());
            const min = pad(pubDate.getMinutes());
            scheduledAt = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
          }

          const parsedTags: string[] = Array.isArray(data.tags) && data.tags.length > 0
            ? data.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
            : data.metaKeywords
              ? String(data.metaKeywords)
                  .split(',')
                  .map((k: string) => k.trim())
                  .filter(Boolean)
              : [];

          const mapped: AdminArticle = {
            id: String(data.id),
            title: data.title || '',
            slug: data.slug || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            category: data.categoryName || 'General',
            categoryId: data.categoryId ? Number(data.categoryId) : undefined,
            author: {
              name: data.authorName || `${SITE_NAME} Editorial`,
              role: data.authorRole || 'Editorial Reviewer',
              avatar: data.authorAvatar || '',
            },
            readTime: data.readTime || '5 min read',
            rating: data.rating !== null && data.rating !== undefined ? String(data.rating) : '',
            views: Number(data.viewCount || data.views || 0),
            status,
            publishedAt: data.publishedAt
              ? new Date(data.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Today',
            scheduledAt,
            imageUrl: data.image || '',
            featured: Boolean(data.isFeatured),
            isHero: Boolean(data.isHero),
            sortOrder: Number(data.sortOrder ?? 0),
            tags: parsedTags,
            storeSlug: data.storeSlug || '',
            storeName: data.storeName || '',
            sidebarConfig:
              data.sidebarConfig && typeof data.sidebarConfig === 'object'
                ? data.sidebarConfig
                : undefined,
          };
          setPostData(mapped);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to fetch article detail from backend:', err);
        setNotFound(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, isEdit]);

  if (isEdit && loading) return <FormLoading />;
  if (isEdit && (notFound || !postData)) return <FormNotFound backHref={ROUTES.ADMIN.POSTS} entity="Article" />;

  const existing = postData || undefined;
  const resolvedContent = existing?.content || '';

  const initial: PostFormState = existing
    ? {
        title: existing.title,
        slug: existing.slug,
        excerpt: existing.excerpt,
        content: resolvedContent,
        category: existing.category,
        categoryId: existing.categoryId,
        authorName: existing.author.name,
        authorRole: existing.author.role,
        readTime: existing.readTime,
        rating: existing.rating,
        status: existing.status,
        publishedAt: existing.publishedAt || 'Today',
        scheduledAt: existing.scheduledAt || getDefaultScheduledTime(),
        imageUrl: existing.imageUrl,
        featured: existing.featured,
        isHero: Boolean(existing.isHero),
        sortOrder: existing.sortOrder ?? 0,
        tags: mergeCategoryTag(existing.tags.join(', '), existing.category),
        storeSlug: existing.storeSlug || '',
        storeName: existing.sidebarConfig?.storeName || existing.storeName || '',
        showBrandCard: existing.sidebarConfig?.showBrandCard !== false,
        showStoreCoupons: existing.sidebarConfig?.showStoreCoupons === true,
        showStoreReviews: existing.sidebarConfig?.showStoreReviews !== false,
        showRelatedReviews: existing.sidebarConfig?.showRelatedReviews !== false,
        showGuaranteeCard: existing.sidebarConfig?.showGuaranteeCard !== false,
        ctaText: existing.sidebarConfig?.ctaText || '',
        ctaUrl: existing.sidebarConfig?.ctaUrl || '',
        brandDescription: existing.sidebarConfig?.brandDescription || '',
        brandHighlights: existing.sidebarConfig?.brandHighlights || '',
        guaranteeTitle: existing.sidebarConfig?.guaranteeTitle || `${SITE_NAME} Testing Guarantee`,
        guaranteeText:
          existing.sidebarConfig?.guaranteeText ||
          'Every product reviewed is independently evaluated against real-world benchmarks. We never accept paid placements to alter lab scores.',
        showNewsBanner: existing.sidebarConfig?.showNewsBanner !== false,
        newsBannerImage: existing.sidebarConfig?.newsBannerImage || '',
        newsBannerUrl: existing.sidebarConfig?.newsBannerUrl || '',
        newsBannerAlt: existing.sidebarConfig?.newsBannerAlt || '',
        leftBannerImage: existing.sidebarConfig?.leftBannerImage || '',
        leftBannerUrl: existing.sidebarConfig?.leftBannerUrl || '',
        leftBannerAlt: existing.sidebarConfig?.leftBannerAlt || '',
        rightBannerImage:
          existing.sidebarConfig?.rightBannerImage || existing.sidebarConfig?.newsBannerImage || '',
        rightBannerUrl:
          existing.sidebarConfig?.rightBannerUrl || existing.sidebarConfig?.newsBannerUrl || '',
        rightBannerAlt:
          existing.sidebarConfig?.rightBannerAlt || existing.sidebarConfig?.newsBannerAlt || '',
      }
    : {
        title: '',
        slug: '',
        excerpt: '',
        content:
          '<h2>Introduction & Testing Methodology</h2><p>Provide a detailed introduction to the product review or news analysis...</p>',
        category: categoryParam || 'Reviews',
        categoryId: categoryParam && !isNaN(Number(categoryParam)) ? Number(categoryParam) : undefined,
        authorName: (() => {
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.fullName) return String(parsed.fullName);
              }
            } catch {}
          }
          return '';
        })(),
        authorRole: (() => {
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.roleName) return String(parsed.roleName);
              }
            } catch {}
          }
          return '';
        })(),
        readTime: '5 min read',
        rating: '',
        status: 'PUBLISHED',
        publishedAt: 'Today',
        scheduledAt: getDefaultScheduledTime(),
        imageUrl: '',
        featured: false,
        isHero: false,
        sortOrder: 0,
        tags: categoryParam && isNaN(Number(categoryParam)) ? categoryParam : '',
        storeSlug: '',
        storeName: '',
        showBrandCard: true,
        showStoreCoupons: false,
        showStoreReviews: true,
        showRelatedReviews: true,
        showGuaranteeCard: true,
        ctaText: '',
        ctaUrl: '',
        brandDescription: '',
        brandHighlights: '',
        guaranteeTitle: `${SITE_NAME} Testing Guarantee`,
        guaranteeText:
          'Every product reviewed is independently evaluated against real-world benchmarks. We never accept paid placements to alter lab scores.',
        showNewsBanner: true,
        newsBannerImage: '',
        newsBannerUrl: '',
        newsBannerAlt: '',
        leftBannerImage: '',
        leftBannerUrl: '',
        leftBannerAlt: '',
        rightBannerImage: '',
        rightBannerUrl: '',
        rightBannerAlt: '',
      };

  return <PostFormInner key={id ?? 'new'} existing={existing} initial={initial} />;
}

function toTagKey(raw?: string | null): string {
  return (raw || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mergeCategoryTagList(
  tags: string[],
  categoryName?: string,
  previousCategoryName?: string
): string[] {
  const prevKey = toTagKey(previousCategoryName);
  const nextClean = (categoryName || '').trim();
  const nextKey = toTagKey(nextClean);

  const filtered = (tags || [])
    .map((tg) => tg.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .filter((tg) => {
      const key = toTagKey(tg);
      if (!key) return false;
      if (prevKey && prevKey !== nextKey && key === prevKey) return false;
      return true;
    });

  if (!nextClean || !nextKey) return filtered;
  if (filtered.some((tg) => toTagKey(tg) === nextKey)) return filtered;
  return [nextClean, ...filtered];
}

function mergeCategoryTag(
  tagsCsv: string,
  categoryName?: string,
  previousCategoryName?: string
): string {
  const list = (tagsCsv || '')
    .split(',')
    .map((tg) => tg.trim())
    .filter(Boolean);
  return mergeCategoryTagList(list, categoryName, previousCategoryName).join(', ');
}

interface StoreOption {
  id: number;
  name: string;
  slug: string;
  maxDiscount?: string;
  rating?: number;
  activeCoupons?: number;
  shortDescription?: string;
  logoUrl?: string;
  affiliateUrl?: string;
  websiteUrl?: string;
}

function PostFormInner({ existing, initial }: { existing?: AdminArticle; initial: PostFormState }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [form, setForm] = useState<PostFormState>(initial);
  const [articleMode, setArticleMode] = useState<'review' | 'news'>(
    initial.storeSlug ? 'review' : 'news'
  );
  const [previewMobilePopupOpen, setPreviewMobilePopupOpen] = useState<boolean>(true);
  const [editorHydrationKey, setEditorHydrationKey] = useState<number>(0);

  useEffect(() => {
    if (form.storeSlug && articleMode !== 'review') {
      setArticleMode('review');
    }
  }, [form.storeSlug, articleMode]);
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(existing?.slug));
  const [excerptTouched, setExcerptTouched] = useState<boolean>(Boolean(existing?.excerpt?.trim()));

  // Hydrate 1-click AI Chat draft safely in useEffect (React Strict Mode + RichTextEditor safe)
  useEffect(() => {
    if (existing || typeof window === 'undefined') return;
    if (searchParams.get('fromAiChat') !== '1') return;
    try {
      const rawDraft = window.sessionStorage.getItem(AI_STORAGE_KEYS.DRAFT_IMPORT);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft) as {
        title?: string;
        slug?: string;
        excerpt?: string;
        contentHtml?: string;
        imageUrl?: string;
        categoryId?: number;
        categoryName?: string;
        rating?: string;
        ctaText?: string;
        brandDescription?: string;
        storeSlug?: string;
        storeName?: string;
        tags?: string[] | string;
        readTime?: string;
      };
      const normalizedTags = Array.isArray(draft.tags)
        ? draft.tags.join(', ')
        : typeof draft.tags === 'string'
          ? draft.tags
          : '';
      if (draft.categoryId && draft.categoryName) {
        setCategories((prev) =>
          prev.some((c) => c.id === draft.categoryId)
            ? prev
            : [{ id: draft.categoryId!, name: draft.categoryName!, slug: '' }, ...prev]
        );
      }
      setForm((prev) => ({
        ...prev,
        title: draft.title || prev.title,
        slug: draft.slug || (draft.title ? generateSlug(draft.title) : prev.slug),
        excerpt: draft.excerpt || prev.excerpt,
        content: draft.contentHtml || prev.content,
        imageUrl: draft.imageUrl || prev.imageUrl,
        categoryId: draft.categoryId ?? prev.categoryId,
        category: draft.categoryName || prev.category,
        rating: draft.rating || prev.rating,
        ctaText: draft.ctaText || prev.ctaText,
        brandDescription: draft.brandDescription || prev.brandDescription,
        storeSlug: draft.storeSlug || prev.storeSlug,
        storeName: draft.storeName || prev.storeName,
        tags: normalizedTags || prev.tags,
        readTime: draft.readTime || prev.readTime,
        status: 'DRAFT',
      }));
      if (draft.excerpt) setExcerptTouched(true);
      setEditorHydrationKey((k) => k + 1);
      // Delay removal slightly so React Strict Mode double-mount still hydrates cleanly
      const timer = window.setTimeout(() => {
        window.sessionStorage.removeItem(AI_STORAGE_KEYS.DRAFT_IMPORT);
      }, 1500);
      return () => window.clearTimeout(timer);
    } catch {
      // ignore malformed draft
    }
  }, [existing, searchParams]);
  const [autoCategoryTag, setAutoCategoryTag] = useState<string>(
    existing?.category?.trim() || (initial.categoryId ? initial.category.trim() : '')
  );
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [stores, setStores] = useState<StoreOption[]>(() => {
    if (existing?.storeName) {
      return [
        {
          id: 0,
          name: existing.storeName,
          slug: existing.storeSlug || '',
          maxDiscount: '',
          rating: 0,
          activeCoupons: 0,
          shortDescription: `${existing.storeName} verified promo codes`,
          logoUrl: '',
        },
      ];
    }
    return [];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryOption[]>(() => {
    if (existing?.categoryId && existing?.category) {
      return [{ id: existing.categoryId, name: existing.category, slug: '' }];
    }
    return [];
  });
  const [hasLoadedCategories, setHasLoadedCategories] = useState(false);

  const loadCategoriesOnDemand = async () => {
    if (hasLoadedCategories) return;
    try {
      const res = await apiClient.get(API_ENDPOINTS.PUBLIC.CATEGORIES);
      const list = res.data?.data?.content || res.data?.data;
      if (Array.isArray(list)) {
        const mapped = list.map((c: any) => ({
          id: Number(c.id),
          name: String(c.name),
          slug: String(c.slug),
        }));
        setCategories(mapped);
        setHasLoadedCategories(true);
        if (form.categoryId) {
          const matched = mapped.find((c) => c.id === form.categoryId);
          if (matched) {
            setForm((prev) => ({
              ...prev,
              category: matched.name,
              tags: mergeCategoryTag(prev.tags, matched.name, autoCategoryTag),
            }));
            setAutoCategoryTag(matched.name);
          }
        } else if (mapped.length > 0) {
          const defaultCat =
            mapped.find(
              (c) =>
                form.category &&
                (c.name.toLowerCase() === form.category.toLowerCase() ||
                  c.slug.toLowerCase() === form.category.toLowerCase())
            ) ||
            mapped.find(
              (c) => c.slug.toLowerCase() === 'other' || c.name.toLowerCase() === 'other'
            ) ||
            mapped[0];
          if (defaultCat) {
            setForm((prev) => ({
              ...prev,
              categoryId: prev.categoryId ?? defaultCat.id,
              category: prev.categoryId ? prev.category : defaultCat.name,
              tags: prev.categoryId
                ? prev.tags
                : mergeCategoryTag(prev.tags, defaultCat.name, autoCategoryTag),
            }));
            setAutoCategoryTag(defaultCat.name);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadCategoriesOnDemand();
  }, []);

  const loadStoresOnDemand = async () => {
    if (stores.length > 1) return;
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORES, { params: { size: 100 } });
      const list = res.data?.data?.content || res.data?.data;
      if (Array.isArray(list)) {
        setStores(
          list.map((s: any) => ({
            id: Number(s.id),
            name: String(s.name),
            slug: String(s.slug),
            maxDiscount: s.maxOffer ? `Up to ${s.maxOffer}% OFF` : '',
            rating: Number(s.ratingScore ?? 0),
            activeCoupons: Number(s.activeOffersCount ?? 0),
            shortDescription: s.aboutStore || s.description || `${s.name} official partner`,
            logoUrl: s.logo || s.logoUrl || '',
            affiliateUrl: s.affiliateUrl || '',
            websiteUrl: s.websiteUrl || '',
          }))
        );
      }
    } catch {}
  };

  const [centralTags, setCentralTags] = useState<TagItem[]>([]);
  const [loadedTags, setLoadedTags] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const loadTagsOnDemand = async () => {
    if (loadedTags) return;
    try {
      const data = await tagService.getPublicTags();
      if (Array.isArray(data)) {
        setCentralTags(data);
        setLoadedTags(true);
      }
    } catch {}
  };

  useEffect(() => {
    loadTagsOnDemand();
    loadCategoriesOnDemand();
    loadStoresOnDemand();
  }, []);

  const currentTagList = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const filteredCentralTags = useMemo(() => {
    if (!tagSearchQuery.trim()) {
      // Sort with selected tags at front, then alphabetical
      return [...centralTags].sort((a, b) => {
        const aSelected = currentTagList.some(
          (t) => t.toLowerCase() === a.slug.toLowerCase() || t.toLowerCase() === a.name.toLowerCase()
        );
        const bSelected = currentTagList.some(
          (t) => t.toLowerCase() === b.slug.toLowerCase() || t.toLowerCase() === b.name.toLowerCase()
        );
        if (aSelected !== bSelected) return aSelected ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    const q = tagSearchQuery.toLowerCase().trim();
    return centralTags.filter(
      (item) => item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [centralTags, tagSearchQuery, currentTagList]);

  const toggleTag = (tagNameOrSlug: string) => {
    const clean = tagNameOrSlug.trim();
    if (!clean) return;
    const exists = currentTagList.some((t) => t.toLowerCase() === clean.toLowerCase());
    let next: string[];
    if (exists) {
      next = currentTagList.filter((t) => t.toLowerCase() !== clean.toLowerCase());
    } else {
      next = [...currentTagList, clean];
    }
    setForm({ ...form, tags: next.join(', ') });
  };

  // Auto-detect or resolve selected store for live preview in Admin
  const selectedStore =
    stores.find((s) => s.slug === form.storeSlug) ||
    stores.find(
      (s) =>
        (form.slug && form.slug.toLowerCase().includes(s.slug.toLowerCase())) ||
        (form.title && form.title.toLowerCase().includes(s.name.toLowerCase()))
    );
  const previewStoreName = form.storeName.trim() || selectedStore?.name || '';
  const previewStoreDiscount = selectedStore?.maxDiscount || '';
  const previewStoreRating = selectedStore?.rating || 0;

  const setQuickSchedule = (hoursAhead: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursAhead);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm((prev) => ({ ...prev, scheduledAt: val }));
  };

  const setTomorrowSchedule = (hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm((prev) => ({ ...prev, scheduledAt: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      nextErrors.title = t('Please enter the article headline / title.');
    } else if (form.title.trim().length > 255) {
      nextErrors.title = t('Article headline must not exceed 255 characters.');
    }
    const cleanSlug = generateSlug(form.slug.trim() || form.title);
    if (form.title.trim() && !cleanSlug) {
      nextErrors.slug = t('URL Slug must contain letters or numbers.');
    } else if (cleanSlug.length > 255) {
      nextErrors.slug = t('URL Slug must not exceed 255 characters.');
    }
    if (form.imageUrl.trim().startsWith('data:')) {
      nextErrors.imageUrl = t('Cover image cannot be a raw base64 string — please upload via the Upload button.');
    } else if (form.imageUrl.trim().length > 500) {
      nextErrors.imageUrl = t('Cover image URL must not exceed 500 characters.');
    }
    const strippedContent = (form.content || '').replace(/<[^>]*>/g, '').trim();
    if (!strippedContent) {
      nextErrors.content = t('Please write the article body content.');
    }

    let finalCategoryId: number | undefined = form.categoryId;
    if (!finalCategoryId && form.category) {
      const matchedCat = categories.find((c) => c.name.toLowerCase() === form.category.toLowerCase());
      if (matchedCat) finalCategoryId = matchedCat.id;
    }
    if (finalCategoryId && categories.length > 0 && !categories.some((c) => c.id === finalCategoryId)) {
      finalCategoryId = undefined;
    }
    if (!finalCategoryId) {
      const otherCat = categories.find(
        (c) => c.slug.toLowerCase() === 'other' || c.name.toLowerCase() === 'other'
      );
      if (otherCat) {
        finalCategoryId = otherCat.id;
      } else {
        nextErrors.categoryId = t('Please select an editorial category (or choose Other).');
      }
    }

    const rawParsedTags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let finalPublishedAt: string = new Date().toISOString();
    let isActive = true;

    if (form.status === 'SCHEDULED') {
      const scheduleDate = new Date(form.scheduledAt);
      if (isNaN(scheduleDate.getTime()) || scheduleDate.getTime() <= Date.now()) {
        nextErrors.scheduledAt = t('Scheduled publish time must be in the future.');
      } else {
        isActive = true;
        finalPublishedAt = scheduleDate.toISOString();
      }
    } else if (form.status === 'DRAFT') {
      isActive = false;
      finalPublishedAt = new Date().toISOString();
    } else {
      // PUBLISHED
      isActive = true;
      const trimmedDate = form.publishedAt.trim();
      const parsedTime =
        trimmedDate && trimmedDate.toLowerCase() !== 'today'
          ? Date.parse(trimmedDate)
          : NaN;
      finalPublishedAt = !Number.isNaN(parsedTime)
        ? new Date(parsedTime).toISOString()
        : new Date().toISOString();
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const fieldNames = Object.keys(nextErrors)
        .map((k) => t(POST_FIELD_LABELS[k] || k))
        .join(', ');
      toast.error(`${t('Please check required fields')}: ${fieldNames}`);
      scrollToFormField(firstKey);
      return;
    }

    const isNewsMode = articleMode === 'news' || !form.storeSlug.trim();
    const sidebarConfig = {
      storeName: isNewsMode ? '' : form.storeName.trim(),
      showBrandCard: isNewsMode ? false : form.showBrandCard,
      showStoreCoupons: isNewsMode ? false : form.showStoreCoupons,
      showStoreReviews: isNewsMode ? false : form.showStoreReviews,
      showRelatedReviews: form.showRelatedReviews,
      showGuaranteeCard: isNewsMode ? false : form.showGuaranteeCard,
      ctaText: isNewsMode ? '' : form.ctaText.trim(),
      ctaUrl: isNewsMode ? '' : form.ctaUrl.trim(),
      brandDescription: isNewsMode ? '' : form.brandDescription.trim(),
      brandHighlights: isNewsMode ? '' : form.brandHighlights.trim(),
      guaranteeTitle: form.guaranteeTitle.trim() || `${SITE_NAME} Testing Guarantee`,
      guaranteeText:
        form.guaranteeText.trim() ||
        'Every product reviewed is independently evaluated against real-world benchmarks. We never accept paid placements to alter lab scores.',
      showNewsBanner: isNewsMode ? form.showNewsBanner : false,
      newsBannerImage: isNewsMode ? (form.rightBannerImage.trim() || form.leftBannerImage.trim()) : '',
      newsBannerUrl: isNewsMode ? (form.rightBannerUrl.trim() || form.leftBannerUrl.trim()) : '',
      newsBannerAlt: isNewsMode ? (form.rightBannerAlt.trim() || form.leftBannerAlt.trim()) : '',
      leftBannerImage: isNewsMode ? form.leftBannerImage.trim() : '',
      leftBannerUrl: isNewsMode ? form.leftBannerUrl.trim() : '',
      leftBannerAlt: isNewsMode ? form.leftBannerAlt.trim() : '',
      rightBannerImage: isNewsMode ? form.rightBannerImage.trim() : '',
      rightBannerUrl: isNewsMode ? form.rightBannerUrl.trim() : '',
      rightBannerAlt: isNewsMode ? form.rightBannerAlt.trim() : '',
    };

    const numericRating =
      form.rating && !isNaN(Number(form.rating)) && Number(form.rating) > 0
        ? Number(form.rating)
        : null;

    const resolvedCategoryName =
      categories.find((c) => c.id === finalCategoryId)?.name ||
      (finalCategoryId ? form.category.trim() : '');
    const parsedTags = mergeCategoryTagList(rawParsedTags, resolvedCategoryName);

    const resolvedExcerpt = form.excerpt.trim() || extractExcerptFromHtml(form.content) || '';

    const payload = {
      title: form.title.trim(),
      slug: cleanSlug,
      excerpt: resolvedExcerpt,
      content: form.content,
      categoryId: finalCategoryId,
      storeSlug: isNewsMode ? null : form.storeSlug.trim() || null,
      authorName: form.authorName.trim() || null,
      authorRole: form.authorRole.trim() || null,
      image: form.imageUrl.trim(),
      readTime: form.readTime.trim() || null,
      rating: numericRating,
      isFeatured: form.featured,
      isHero: form.isHero,
      isActive: isActive,
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
      publishedAt: finalPublishedAt,
      status: form.status,
      tags: parsedTags,
      sidebarConfig,
      metaTitle: form.title.trim(),
      metaDescription: resolvedExcerpt,
      metaKeywords: parsedTags.join(', '),
    };

    try {
      if (existing) {
        const res = await apiClient.put(API_ENDPOINTS.ADMIN.POST_DETAIL(existing.id), payload);
        toast.success(res.data?.message || `Saved "${form.title}" successfully!`);
      } else {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN.POSTS, payload);
        toast.success(res.data?.message || `Published "${form.title}" successfully!`);
      }
      router.push(ROUTES.ADMIN.POSTS);
    } catch (err: any) {
      const mappedErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && typeof err.response.data.errors === 'object') {
        Object.assign(mappedErrors, err.response.data.errors);
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to save article.';
      if (err?.response?.data?.code === 'DUPLICATE_RESOURCE' || /slug/i.test(msg)) {
        mappedErrors.slug = msg;
      }
      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const fieldNames = Object.keys(mappedErrors)
          .map((k) => t(POST_FIELD_LABELS[k] || k))
          .join(', ');
        toast.error(`${t('Please check required fields')}: ${fieldNames} — ${mappedErrors[firstKey]}`);
        scrollToFormField(firstKey);
      } else {
        setErrors({ _form: msg });
        toast.error(msg);
      }
    }
  };

  const submitLabel =
    form.status === 'SCHEDULED'
      ? existing
        ? 'Update Schedule'
        : 'Schedule Article'
      : form.status === 'DRAFT'
      ? 'Save as Draft'
      : existing
      ? 'Save Article'
      : 'Publish Live';

  const livePostSlug = generateSlug(form.slug.trim() || form.title.trim());

  const handleAiArticleGenerated = (res: AiGeneratedPostResult) => {
    if (res.categoryId && res.categoryName) {
      setCategories((prev) =>
        prev.some((c) => c.id === res.categoryId)
          ? prev
          : [{ id: res.categoryId!, name: res.categoryName!, slug: '' }, ...prev]
      );
    }
    setForm((prev) => ({
      ...prev,
      title: res.title || prev.title,
      slug: res.slug || generateSlug(res.title || prev.title),
      excerpt: res.excerpt || res.metaDescription || prev.excerpt,
      content: res.contentHtml || prev.content,
      imageUrl: res.imageUrl || prev.imageUrl,
      categoryId: res.categoryId ?? prev.categoryId,
      category: res.categoryName || prev.category,
      rating: res.rating || prev.rating,
      ctaText: res.ctaText || prev.ctaText,
      brandDescription: res.brandDescription || prev.brandDescription,
      readTime: res.readTime || prev.readTime,
      tags: Array.isArray(res.tags) && res.tags.length > 0 ? res.tags.join(', ') : prev.tags,
      storeSlug: res.mode === 'review' ? (res.storeSlug || prev.storeSlug) : '',
      storeName: res.mode === 'review' ? (res.storeName || prev.storeName) : '',
      status: 'DRAFT',
    }));
    setSlugTouched(true);
    setExcerptTouched(true);
    setEditorHydrationKey((k) => k + 1);
    setActiveTab('edit');
  };

  const headerActions = (
    <div className="flex items-center gap-2 mr-1">
      <button
        type="button"
        onClick={() => setAiModalOpen(true)}
        className="h-8 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
        title="Generate Review or News article using AI"
      >
        <Sparkles size={13} />
        <span>AI Auto-Write</span>
      </button>
      <CopyPublicLinkButton path={livePostSlug ? `/post/${livePostSlug}` : ''} disabled={!livePostSlug} />
      <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'edit'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit2 size={13} />
          <span>Editor</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-brand-primary text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye size={13} />
          <span>Live Preview</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
    <AdminFormPage
      title={existing ? `Edit Article: ${existing.title}` : 'Write New Article & Review'}
      description="Craft in-depth product reviews, buyer guides, and industry news with live preview."
      backHref={ROUTES.ADMIN.POSTS}
      backLabel="Back to articles"
      formId={FORM_ID}
      submitLabel={submitLabel}
      headerActions={headerActions}
      width="full"
    >
      {activeTab === 'edit' ? (
        <form noValidate id={FORM_ID} onSubmit={handleSave} className="space-y-6">
          {errors._form && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errors._form}</span>
            </div>
          )}
          <FormQuickGuide
            title="Quick Article & Review Setup"
            description="Headline / Title (*), Editorial Category (*), and Article Body Content (*) are required. URL Slug is generated automatically; pick Other if no specific category fits."
          />
          <FormErrorBanner errors={errors} fieldLabels={POST_FIELD_LABELS} />

          {/* TOP ROW: HEADLINE & SUMMARY + PUBLISHING SETTINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Headline & Excerpt */}
            <div className="lg:col-span-2">
              <FormSection title="Headline & Summary">
                <div className="space-y-1">
                  <label className={labelClass}>
                    {t('Headline / Title')} <span className="text-rose-600 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    data-field="title"
                    value={form.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const detectedStore = stores.find(
                        (s) => s.name && newTitle.toLowerCase().includes(s.name.toLowerCase())
                      );
                      setForm((prev) => ({
                        ...prev,
                        title: newTitle,
                        slug: slugTouched ? prev.slug : generateSlug(newTitle),
                        storeSlug: !prev.storeSlug && detectedStore ? detectedStore.slug : prev.storeSlug,
                        storeName: !prev.storeName && detectedStore ? detectedStore.name : prev.storeName,
                      }));
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g. Nilight 20-Inch Curved LED Light Bar: 500-Mile Extreme Off-Road Test"
                    className={`${inputClass} font-semibold ${errors.title ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.title && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={`${labelClass} flex items-center justify-between`}>
                    <span>{t('Article URL Slug')}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {t('Auto-generated')}
                    </span>
                  </label>
                  <input
                    type="text"
                    data-field="slug"
                    value={form.slug}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSlugTouched(Boolean(val.trim()));
                      setForm({ ...form, slug: val });
                      if (errors.slug) setErrors((prev) => ({ ...prev, slug: '' }));
                    }}
                    onBlur={() => {
                      setForm((prev) => ({
                        ...prev,
                        slug: generateSlug(prev.slug || prev.title),
                      }));
                    }}
                    placeholder={generateSlug(form.title) || 'nilight-led-light-bar-review'}
                    className={`${inputClass} font-mono ${errors.slug ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.slug && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.slug}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className={labelClass}>{t('Summary / Lead Excerpt (Optional)')}</label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {t('Optional • Auto-extracted from Review if blank')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const extracted = extractExcerptFromHtml(form.content);
                        if (extracted) {
                          setForm((prev) => ({ ...prev, excerpt: extracted }));
                          setExcerptTouched(false);
                          toast.success(t('Extracted summary from Review section!'));
                        } else {
                          toast.info(t('Write content in the Article Body Content section below first, or leave this blank.'));
                        }
                      }}
                      className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} />
                      <span>{t('Extract from Review')}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExcerptTouched(Boolean(val.trim()));
                      setForm({ ...form, excerpt: val });
                    }}
                    placeholder={
                      extractExcerptFromHtml(form.content) ||
                      t('Optional: Leave blank to automatically take the opening paragraph from the Review / Description below...')
                    }
                    className={inputClass}
                  />
                </div>
              </FormSection>
            </div>

            {/* Right 1 Col: Publishing & Schedule */}
            <div className="lg:col-span-1">
              <FormSection
                title="Publishing & Scheduled Release"
                description="Control article visibility, schedule publication time, and placement"
              >
                {/* 3 Status Cards */}
                <div className="space-y-1.5">
                  <label className={labelClass}>Publication Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'PUBLISHED' })}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        form.status === 'PUBLISHED'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className={form.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-slate-400'} />
                        <span className="text-xs font-bold">Publish Live</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">Live immediately</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'SCHEDULED' })}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        form.status === 'SCHEDULED'
                          ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CalendarClock size={14} className={form.status === 'SCHEDULED' ? 'text-indigo-600' : 'text-slate-400'} />
                        <span className="text-xs font-bold">Schedule</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">Set time & date</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'DRAFT' })}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        form.status === 'DRAFT'
                          ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className={form.status === 'DRAFT' ? 'text-amber-600' : 'text-slate-400'} />
                        <span className="text-xs font-bold">Draft</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">Internal review</span>
                    </button>
                  </div>
                </div>

                {/* If SCHEDULED: Scheduled Publishing Date & Time configuration */}
                {form.status === 'SCHEDULED' && (
                  <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <CalendarClock size={14} className="text-indigo-600" />
                          <span>Scheduled Publish Time *</span>
                        </label>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                          GMT+7
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                        className="w-full text-xs bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-2xs cursor-pointer"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Quick Presets
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuickSchedule(1)}
                          className="text-[11px] font-medium bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                        >
                          +1 Hour
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickSchedule(3)}
                          className="text-[11px] font-medium bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                        >
                          +3 Hours
                        </button>
                        <button
                          type="button"
                          onClick={() => setTomorrowSchedule(9)}
                          className="text-[11px] font-medium bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                        >
                          Tomorrow Morning (09:00)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTomorrowSchedule(20)}
                          className="text-[11px] font-medium bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                        >
                          Tomorrow Evening (20:00)
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                      💡 This article will be automatically published to the homepage and category pages at the scheduled time.
                    </p>
                  </div>
                )}

                {/* If PUBLISHED: Custom Published Date timestamp */}
                {form.status === 'PUBLISHED' && (
                  <div className="space-y-1 pt-1">
                    <label className={`${labelClass} flex items-center justify-between`}>
                      <span>Public Display Date</span>
                      <span className="text-[10px] text-slate-400 font-normal">Default: Today</span>
                    </label>
                    <input
                      type="text"
                      value={form.publishedAt}
                      onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                      placeholder="e.g. October 24, 2026 or Today"
                      className={inputClass}
                    />
                  </div>
                )}

                {/* Homepage Placement Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isHero}
                      onChange={(e) => setForm({ ...form, isHero: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="leading-tight">
                      <span className="text-xs font-bold text-slate-900 block">
                        {t('Pin as Homepage Hero (Lead Story)')}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {t('Displays this article in the main top Hero slot regardless of category (replaces previous Hero).')}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="leading-tight">
                      <span className="text-xs font-bold text-slate-800 block">
                        {t("Add to Curated Desk · Editor's Picks")}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {t("Most recently ticked articles automatically appear at the top of Editor's Picks.")}
                      </span>
                    </span>
                  </label>
                </div>
              </FormSection>
            </div>
          </div>

          {/* MIDDLE FULL-WIDTH ROW: ARTICLE BODY CONTENT AT 100% WIDTH */}
          <div className="w-full" data-field="content">
            <FormSection
              title="Article Body Content"
              description="Microsoft Word Studio Editor • Full support for Font Family, Font Size, Data Tables, Alignment, A4 Paper View & Affiliate Blocks"
              headerRight={
                <span className="text-[11px] font-bold text-[#2b579a] bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2b579a] animate-pulse"></span>
                  <span>Microsoft Word Studio</span>
                </span>
              }
            >
              <RichTextEditor
                key={`rte-${existing?.id ?? 'new'}-${editorHydrationKey}`}
                value={form.content}
                onChange={(html) => {
                  setForm((prev) => ({
                    ...prev,
                    content: html,
                    excerpt: excerptTouched ? prev.excerpt : extractExcerptFromHtml(html),
                  }));
                  if (errors.content) setErrors((prev) => ({ ...prev, content: '' }));
                }}
                minHeight="560px"
              />
              {errors.content && (
                <p className="text-[11px] font-semibold text-rose-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.content}
                </p>
              )}
            </FormSection>
          </div>

          {/* BOTTOM METADATA GRID: CATEGORY & MEDIA, AUTHOR & BENCHMARKS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Category & Media */}
            <FormSection title="Category & Media">
              <div className="space-y-1">
                <label className={labelClass}>
                  {t('Editorial Category')} <span className="text-rose-600 font-black">*</span>
                </label>
                <AdminSearchableSelect
                  data-field="categoryId"
                  value={form.categoryId ? String(form.categoryId) : ''}
                  onOpen={loadCategoriesOnDemand}
                  error={Boolean(errors.categoryId)}
                  placeholder="Select Editorial Category..."
                  searchPlaceholder="Search category..."
                  options={[
                    { value: '', label: 'Select Editorial Category...' },
                    ...categories.map((cat) => ({
                      value: String(cat.id),
                      label: cat.name,
                    })),
                  ]}
                  onChange={(raw) => {
                    const val = raw ? Number(raw) : undefined;
                    const found = categories.find((c) => c.id === val);
                    const nextCategoryName = found ? found.name : '';
                    setForm((prev) => ({
                      ...prev,
                      categoryId: val,
                      category: nextCategoryName,
                      tags: mergeCategoryTag(prev.tags, nextCategoryName, autoCategoryTag || prev.category),
                    }));
                    setAutoCategoryTag(nextCategoryName);
                    if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
                  }}
                />
                {errors.categoryId ? (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.categoryId}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t('Every article must belong to at least 1 category. Pick "Other" if none of the specific categories fit.')}
                  </p>
                )}
              </div>

              <div className="space-y-1 pt-2">
                <ImageUpload
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                  folder="article-covers"
                  label="Featured Cover Image"
                  aspectRatio="video"
                  defaultTags={[previewStoreName || form.title.trim()].filter(Boolean)}
                />
              </div>
            </FormSection>

            {/* Author & Benchmarks */}
            <FormSection title="Author & Benchmarks">
              <div className="space-y-1">
                <label className={labelClass}>Author Name</label>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Author Role / Beat</label>
                <input
                  type="text"
                  value={form.authorRole}
                  onChange={(e) => setForm({ ...form, authorRole: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className={labelClass}>Lab Score (0 - 5.0)</label>
                  <input
                    type="text"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    placeholder="4.8"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Read Time</label>
                  <input
                    type="text"
                    value={form.readTime}
                    onChange={(e) => setForm({ ...form, readTime: e.target.value })}
                    placeholder="6 min read"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash size={13} className="text-rose-600" />
                    <span>Taxonomy Tags</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {t('Auto-generated from Category')}
                    </span>
                  </label>
                  <Link
                    href={ROUTES.ADMIN.TAGS}
                    target="_blank"
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
                    title="Manage all tags centrally"
                  >
                    <span>Manage Tags</span>
                    <ExternalLink size={10} />
                  </Link>
                </div>

                {/* Comma-separated or text input with on-demand central tags loader */}
                <input
                  type="text"
                  value={form.tags}
                  onFocus={loadTagsOnDemand}
                  onClick={loadTagsOnDemand}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. Tech, Reviews, Apple, Deals"
                  className={inputClass}
                />

                {/* Selected Tag Pills */}
                {currentTagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {currentTagList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-brand-primary border border-rose-200 shadow-2xs"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="hover:bg-rose-200/60 rounded-full p-0.5 cursor-pointer ml-0.5"
                          title={`Remove #${tag}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Centralized Taxonomy Tag Quick Selector */}
                {centralTags.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Central taxonomy tags (click to toggle):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {tagSearchQuery
                          ? `Showing ${filteredCentralTags.length} of ${centralTags.length} tags`
                          : `All ${centralTags.length} registered tags in system`}
                      </span>
                    </div>

                    {/* Filter search bar for tags */}
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="Filter central tags (e.g. google, ai, tech, deals)..."
                        className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-200/90 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition shadow-2xs"
                      />
                      {tagSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTagSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Tag Pills Container - Displays ALL tags without slicing */}
                    <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                      {filteredCentralTags.length > 0 ? (
                        filteredCentralTags.map((item) => {
                          const isSelected = currentTagList.some(
                            (t) => t.toLowerCase() === item.slug.toLowerCase() || t.toLowerCase() === item.name.toLowerCase()
                          );
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleTag(item.name || item.slug)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 ${
                                isSelected
                                  ? 'bg-brand-primary text-white border border-brand-primary font-bold ring-1 ring-brand-primary/30'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: isSelected ? '#ffffff' : (item.color || '#6366f1') }}
                              />
                              <span>#{item.name}</span>
                              {isSelected ? <X size={10} className="stroke-[2.5]" /> : <Plus size={10} />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="w-full text-center py-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                          <span>No tags match "{tagSearchQuery}".</span>
                          <button
                            type="button"
                            onClick={() => {
                              toggleTag(tagSearchQuery);
                              setTagSearchQuery('');
                            }}
                            className="text-brand-primary font-bold hover:underline cursor-pointer"
                          >
                            + Add #{tagSearchQuery} as new tag
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </FormSection>
          </div>

          {/* RIGHT SIDEBAR & ARTICLE MODE CONFIGURATION */}
          <div className="w-full">
            <FormSection
              title="Article Type, Brand Affiliate & Side Banners"
              description="Review articles attach a Partner Brand with direct affiliate CTA, shopper reviews & optional coupons; General/News articles attach Left & Right Side Banners (auto-popup on mobile)"
              headerRight={
                <span className="text-[11px] font-bold text-brand-primary bg-brand-primary-soft border border-brand-primary-border px-3 py-1 rounded-xl flex items-center gap-1.5">
                  <PanelRight size={13} />
                  <span>{articleMode === 'review' ? 'Review Brand Config' : 'Side Banners & Mobile Popup'}</span>
                </span>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 7 Cols: Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* 2-Tab Mode Switcher: Review (Attach Brand) vs News/Article (2 Side Banners + Mobile Popup) */}
                  <div className="space-y-1.5">
                    <label className={labelClass}>Article Format &amp; Monetization Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 bg-slate-100/90 dark:bg-[#0d111a] border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                      <button
                        type="button"
                        aria-pressed={articleMode === 'review'}
                        onClick={() => {
                          setArticleMode('review');
                          loadStoresOnDemand();
                        }}
                        className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                          articleMode === 'review'
                            ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 text-slate-900 dark:text-white shadow-sm ring-2 ring-emerald-500/25'
                            : 'border-transparent bg-transparent text-slate-500 dark:text-slate-400 opacity-65 hover:opacity-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            articleMode === 'review'
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <StoreIcon size={17} />
                        </div>
                        <div className="min-w-0 flex-1 pr-5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold leading-tight truncate">
                              Review Article (Attach Brand)
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Direct affiliate CTA, reviews &amp; optional codes
                          </div>
                        </div>
                        <div className="shrink-0">
                          {articleMode === 'review' ? (
                            <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/15" />
                          ) : (
                            <span className="block w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-pressed={articleMode === 'news'}
                        onClick={() => {
                          setArticleMode('news');
                          setForm((prev) => ({
                            ...prev,
                            storeSlug: '',
                            storeName: '',
                          }));
                        }}
                        className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                          articleMode === 'news'
                            ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 text-slate-900 dark:text-white shadow-sm ring-2 ring-indigo-500/25'
                            : 'border-transparent bg-transparent text-slate-500 dark:text-slate-400 opacity-65 hover:opacity-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            articleMode === 'news'
                              ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Newspaper size={17} />
                        </div>
                        <div className="min-w-0 flex-1 pr-5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold leading-tight truncate">
                              News / Article (2 Side Banners)
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Desktop left/right rails → Mobile popup
                          </div>
                        </div>
                        <div className="shrink-0">
                          {articleMode === 'news' ? (
                            <CheckCircle2 size={18} className="text-indigo-500 fill-indigo-500/15" />
                          ) : (
                            <span className="block w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {articleMode === 'news' ? (
                    /* NEWS / EDITORIAL ARTICLE MODE: Left & Right Newspaper Side Banners + Auto Mobile Popup */
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 flex items-start gap-2.5">
                        <Smartphone size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Newspaper 2-Side Banners (Desktop) → Automatic Popup (Mobile)</div>
                          <p className="text-[11px] text-indigo-700/90 mt-0.5">
                            No store or coupon section is shown. Attached banners appear as sticky Left &amp; Right side rails on Desktop and automatically convert into a dismissible Popup on Mobile phones.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={form.showNewsBanner}
                            onChange={(e) => setForm({ ...form, showNewsBanner: e.target.checked })}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <ImageIcon size={13} className="text-indigo-600" />
                              <span>1. Side Banners &amp; Mobile Popup</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Flanking left/right banners on Desktop; popup modal on Mobile.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={form.showRelatedReviews}
                            onChange={(e) => setForm({ ...form, showRelatedReviews: e.target.checked })}
                            className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <BookOpen size={13} className="text-brand-primary" />
                              <span>2. Related News &amp; Articles</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Recommends related articles below the story with thumbnails.
                            </p>
                          </div>
                        </label>
                      </div>

                      {form.showNewsBanner && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* LEFT SIDE BANNER */}
                          <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900">Left Side Banner</span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                Desktop Left + Popup
                              </span>
                            </div>
                            <ImageUpload
                              value={form.leftBannerImage}
                              onChange={(url) => setForm((prev) => ({ ...prev, leftBannerImage: url }))}
                              folder="banners"
                              label="Left Banner Image"
                              description="Recommended vertical 160×600, 300×600 or 600×800 px."
                              aspectRatio="banner"
                            />
                            <div className="space-y-1">
                              <label className={labelClass}>Left Banner Link URL</label>
                              <div className="relative">
                                <LinkIcon
                                  size={13}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                  type="text"
                                  value={form.leftBannerUrl}
                                  onChange={(e) => setForm({ ...form, leftBannerUrl: e.target.value })}
                                  placeholder="https://partner-site.com/..."
                                  className={`${inputClass} pl-8`}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className={labelClass}>Left Banner Caption / Alt</label>
                              <input
                                type="text"
                                value={form.leftBannerAlt}
                                onChange={(e) => setForm({ ...form, leftBannerAlt: e.target.value })}
                                placeholder="e.g. Spring Tech Event — Up to 40% Off"
                                className={inputClass}
                              />
                            </div>
                          </div>

                          {/* RIGHT SIDE BANNER */}
                          <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900">Right Side Banner</span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                Desktop Right + Popup
                              </span>
                            </div>
                            <ImageUpload
                              value={form.rightBannerImage}
                              onChange={(url) => setForm((prev) => ({ ...prev, rightBannerImage: url }))}
                              folder="banners"
                              label="Right Banner Image"
                              description="Recommended vertical 160×600, 300×600 or 600×800 px."
                              aspectRatio="banner"
                            />
                            <div className="space-y-1">
                              <label className={labelClass}>Right Banner Link URL</label>
                              <div className="relative">
                                <LinkIcon
                                  size={13}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                  type="text"
                                  value={form.rightBannerUrl}
                                  onChange={(e) => setForm({ ...form, rightBannerUrl: e.target.value })}
                                  placeholder="https://partner-site.com/..."
                                  className={`${inputClass} pl-8`}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className={labelClass}>Right Banner Caption / Alt</label>
                              <input
                                type="text"
                                value={form.rightBannerAlt}
                                onChange={(e) => setForm({ ...form, rightBannerAlt: e.target.value })}
                                placeholder="e.g. Exclusive Flash Sale"
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* REVIEW MODE: Attach Partner Brand + Direct Affiliate CTA + Reviews + Optional Coupons */
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className={labelClass}>Target Partner Brand / Store</label>
                          <AdminSearchableSelect
                            value={form.storeSlug}
                            onOpen={loadStoresOnDemand}
                            placeholder="Select a partner brand to link..."
                            searchPlaceholder="Search partner store..."
                            options={[
                              ...stores.map((s) => ({
                                value: s.slug,
                                label: s.name,
                                sublabel: s.websiteUrl || `${s.maxDiscount} • ${s.activeCoupons} codes`,
                              })),
                            ]}
                            onChange={(chosenSlug) => {
                              const matched = stores.find((s) => s.slug === chosenSlug);
                              setForm((prev) => ({
                                ...prev,
                                storeSlug: chosenSlug,
                                storeName: chosenSlug ? (matched ? matched.name : prev.storeName) : '',
                              }));
                            }}
                          />
                          <p className={`text-[11px] font-medium pt-1 ${form.storeSlug ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {form.storeSlug
                              ? '★ Linked to Brand → CTA button opens Partner Brand Website directly (skips internal /store page).'
                              : '⚠ Select a Partner Brand above so this article routes to Product Reviews (/reviews).'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className={labelClass}>Brand Display Name (Optional Override)</label>
                          <input
                            type="text"
                            value={form.storeName}
                            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                            placeholder={selectedStore?.name || 'e.g. NuPhy Studio'}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className={labelClass}>Direct Affiliate / Partner CTA Link</label>
                          <div className="relative">
                            <ExternalLink
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                              type="text"
                              value={form.ctaUrl}
                              onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                              placeholder={
                                selectedStore?.affiliateUrl ||
                                selectedStore?.websiteUrl ||
                                'https://brand-partner.com/?ref=...'
                              }
                              className={`${inputClass} pl-9`}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Leave blank to auto-use the Brand&apos;s Affiliate / Website URL directly.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className={labelClass}>CTA Button Text</label>
                          <input
                            type="text"
                            value={form.ctaText}
                            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                            placeholder={
                              form.showStoreCoupons
                                ? `Get Promo Code (${selectedStore?.activeCoupons || 3} Active) →`
                                : `Visit ${previewStoreName} Official Site →`
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className={labelClass}>Short Brand Description</label>
                          <input
                            type="text"
                            value={form.brandDescription}
                            onChange={(e) => setForm({ ...form, brandDescription: e.target.value })}
                            placeholder={
                              selectedStore?.shortDescription ||
                              `Official products, specifications, and verified offers from ${previewStoreName}.`
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className={labelClass}>Supplementary Brand Highlights (Optional)</label>
                          <input
                            type="text"
                            value={form.brandHighlights}
                            onChange={(e) => setForm({ ...form, brandHighlights: e.target.value })}
                            placeholder="e.g. Official Warranty • Free Shipping • 30-Day Returns"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Widget Toggles */}
                      <div className="space-y-2 pt-1">
                        <label className={labelClass}>Right Sidebar Sections (Show / Hide)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={form.showBrandCard}
                              onChange={(e) => setForm({ ...form, showBrandCard: e.target.checked })}
                              className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <StoreIcon size={13} className="text-brand-primary" />
                                <span>1. Brand Card &amp; Direct Affiliate CTA</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Brand logo, rating, description, highlights &amp; direct partner CTA button.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70 cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={form.showStoreCoupons}
                              onChange={(e) => setForm({ ...form, showStoreCoupons: e.target.checked })}
                              className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Tag size={13} className="text-amber-600" />
                                <span>2. Promo Codes Box (Optional)</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Hidden by default for brands that prefer direct affiliate links without coupon codes.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={form.showStoreReviews}
                              onChange={(e) => setForm({ ...form, showStoreReviews: e.target.checked })}
                              className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <MessageSquare size={13} className="text-emerald-600" />
                                <span>3. Shopper Reviews &amp; Brand Notes</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Displays verified buyer reviews and supplementary brand details.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={form.showRelatedReviews}
                              onChange={(e) => setForm({ ...form, showRelatedReviews: e.target.checked })}
                              className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <BookOpen size={13} className="text-brand-primary" />
                                <span>4. Related Lab Reviews</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Recommends related reviews in the same category with thumbnails.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={form.showGuaranteeCard}
                              onChange={(e) => setForm({ ...form, showGuaranteeCard: e.target.checked })}
                              className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-emerald-600" />
                                <span>5. Testing Guarantee &amp; Tags</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Independent testing guarantee box with #tag pills.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Guarantee Text Customization */}
                      {form.showGuaranteeCard && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div className="space-y-1">
                            <label className={labelClass}>Guarantee Box Title</label>
                            <input
                              type="text"
                              value={form.guaranteeTitle}
                              onChange={(e) => setForm({ ...form, guaranteeTitle: e.target.value })}
                              placeholder={`${SITE_NAME} Testing Guarantee`}
                              className={inputClass}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className={labelClass}>Guarantee Description</label>
                            <input
                              type="text"
                              value={form.guaranteeText}
                              onChange={(e) => setForm({ ...form, guaranteeText: e.target.value })}
                              placeholder="Every product reviewed is independently evaluated..."
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Right 5 Cols: Mini Live Preview */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <span>{articleMode === 'news' ? 'Side Banners & Popup Preview' : 'Right Sidebar Preview'}</span>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                      Live Sync
                    </span>
                  </div>

                  {articleMode === 'news' ? (
                    <>
                      {form.showNewsBanner ? (
                        form.leftBannerImage || form.rightBannerImage ? (
                          <div className="space-y-3">
                            {/* Desktop 2-Side Rails Mini Diagram */}
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2">
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                                <span>Desktop View (2 Side Rails)</span>
                                <span className="text-indigo-600">≥ 1280px</span>
                              </div>
                              <div className="grid grid-cols-12 gap-2 items-start">
                                <div className="col-span-3">
                                  {form.leftBannerImage ? (
                                    <img
                                      src={form.leftBannerImage}
                                      alt={form.leftBannerAlt || 'Left Banner'}
                                      className="w-full h-28 object-cover rounded-lg border border-slate-200"
                                    />
                                  ) : (
                                    <div className="h-28 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-400 text-center p-1">
                                      Empty Left
                                    </div>
                                  )}
                                </div>
                                <div className="col-span-6 h-28 rounded-lg bg-slate-100 border border-slate-200 p-2 flex flex-col justify-center gap-1.5">
                                  <div className="h-2 w-3/4 bg-slate-300 rounded" />
                                  <div className="h-1.5 w-full bg-slate-200 rounded" />
                                  <div className="h-1.5 w-5/6 bg-slate-200 rounded" />
                                  <div className="text-[9px] font-bold text-slate-500 text-center pt-1">
                                    Article Body
                                  </div>
                                </div>
                                <div className="col-span-3">
                                  {form.rightBannerImage ? (
                                    <img
                                      src={form.rightBannerImage}
                                      alt={form.rightBannerAlt || 'Right Banner'}
                                      className="w-full h-28 object-cover rounded-lg border border-slate-200"
                                    />
                                  ) : (
                                    <div className="h-28 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-400 text-center p-1">
                                      Empty Right
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mobile Auto-Popup Mini Diagram */}
                            <div className="bg-slate-900 text-white rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-bold text-indigo-300">
                                <span className="inline-flex items-center gap-1">
                                  <Smartphone size={12} /> Mobile View → Auto Popup
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-white/15 text-white text-[9px]">✕ Dismissible</span>
                              </div>
                              <div className="bg-white rounded-lg overflow-hidden max-w-[160px] mx-auto border border-slate-700">
                                <img
                                  src={form.leftBannerImage || form.rightBannerImage}
                                  alt="Mobile Popup Preview"
                                  className="w-full h-28 object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center space-y-1.5">
                            <ImageIcon size={24} className="mx-auto text-slate-300" />
                            <div className="text-xs font-bold text-slate-600">No Side Banners Attached</div>
                            <p className="text-[11px] text-slate-400">
                              Upload Left and/or Right banners on the left. On Mobile they automatically appear as a Popup!
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-center text-[11px] text-slate-400">
                          Side banners &amp; mobile popup are currently disabled for this article.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {form.showBrandCard && (
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-2.5 text-center">
                          <StoreLogoFrame
                            src={selectedStore?.logoUrl}
                            name={previewStoreName}
                            className="w-28 h-12 mx-auto rounded-xl"
                            paddingClassName="p-1.5"
                            fallbackTextClassName="text-lg"
                          />
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-brand-primary bg-brand-primary-soft border border-brand-primary-border px-2 py-0.5 rounded-full tracking-widest">
                              <Sparkles size={10} />{' '}
                              {form.showStoreCoupons
                                ? `Brand Deals • Up to ${previewStoreDiscount}`
                                : 'Official Brand Partner'}
                            </span>
                            <h4 className="font-black text-sm text-slate-900">{previewStoreName}</h4>
                            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                              <Star size={11} className="fill-amber-400 text-amber-400" />
                              <span className="font-bold text-slate-800">{previewStoreRating.toFixed(1)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {form.brandDescription.trim() ||
                                selectedStore?.shortDescription ||
                                `Verified products and direct official storefront for ${previewStoreName}.`}
                            </p>
                            {form.brandHighlights.trim() && (
                              <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-lg px-2 py-1">
                                {form.brandHighlights.trim()}
                              </p>
                            )}
                          </div>
                          <div className="w-full py-2 bg-brand-primary text-white font-black text-[11px] rounded-lg flex items-center justify-center gap-1">
                            <span>
                              {form.ctaText.trim() ||
                                (form.showStoreCoupons
                                  ? `Get Promo Code (${selectedStore?.activeCoupons || 3} Active) →`
                                  : `Visit ${previewStoreName} Official Site →`)}
                            </span>
                            <ExternalLink size={11} />
                          </div>
                        </div>
                      )}

                      {form.showStoreCoupons && (
                        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <Tag size={13} className="text-brand-primary" />
                              Active {previewStoreName} Codes
                            </span>
                          </div>
                          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-[11px]">
                            <span className="font-black text-brand-primary bg-brand-primary-soft border border-brand-primary-border px-1.5 py-0.5 rounded">
                              {previewStoreDiscount}
                            </span>
                            <span className="font-mono font-bold text-slate-700 bg-white border border-dashed border-slate-300 px-2 py-0.5 rounded">
                              SAVE20
                            </span>
                          </div>
                        </div>
                      )}

                      {form.showStoreReviews && (
                        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare size={13} className="text-emerald-600" />
                              Verified Shopper Reviews
                            </span>
                            <span className="text-[10px] font-bold text-amber-500">★ {previewStoreRating.toFixed(1)}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span>Alex M. • ✓ Verified</span>
                              <span className="text-amber-400">★★★★★</span>
                            </div>
                            <p className="text-slate-600 line-clamp-2">
                              Pulled automatically from {previewStoreName}&apos;s verified customer reviews.
                            </p>
                          </div>
                        </div>
                      )}

                      {form.showGuaranteeCard && (
                        <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                            <ShieldCheck size={14} />
                            <span>{form.guaranteeTitle || `${SITE_NAME} Testing Guarantee`}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {form.guaranteeText}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </FormSection>
          </div>
        </form>
      ) : (
        /* LIVE PREVIEW TAB (Desktop, iPad & Mobile — 1:1 with /post/[slug]) */
        <AdminDevicePreviewFrame
          title="Client Editorial Article Preview"
          urlPath={`/post/${form.slug || 'article-slug'}`}
        >
          {(device) => {
            const isMobile = device === 'mobile';
            const isTablet = device === 'tablet';
            const isDesktop = device === 'desktop';

            const hasPreviewNewsBanners =
              articleMode === 'news' &&
              form.showNewsBanner &&
              Boolean(form.leftBannerImage || form.rightBannerImage);

            return (
              <div className={`relative bg-[#F8F8F6] ${isMobile ? 'p-3.5 space-y-4' : isTablet ? 'p-5 space-y-5' : 'p-8 space-y-6'}`}>
                {hasPreviewNewsBanners && !isDesktop && !previewMobilePopupOpen && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setPreviewMobilePopupOpen(true)}
                      className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Smartphone size={12} />
                      <span>Preview Mobile Banner Popup</span>
                    </button>
                  </div>
                )}

                <div className="flex items-start justify-center gap-4 max-w-[1400px] mx-auto">
                  {hasPreviewNewsBanners && isDesktop && form.leftBannerImage && (
                    <aside className="w-[140px] shrink-0 sticky top-6">
                      <img
                        src={form.leftBannerImage}
                        alt={form.leftBannerAlt || 'Left Banner'}
                        className="w-full h-auto rounded-xl border border-slate-200 shadow-xs object-cover"
                      />
                    </aside>
                  )}

                <div className="flex-1 min-w-0 max-w-6xl mx-auto space-y-5">
                  <nav className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                    <span className="shrink-0">Home</span>
                    <ChevronRight size={12} className="shrink-0" />
                    <span className="shrink-0">{form.category}</span>
                    <ChevronRight size={12} className="shrink-0" />
                    <span className="text-slate-900 font-semibold truncate">
                      {form.title || 'Untitled Article'}
                    </span>
                  </nav>

                  <div className={`bg-white border border-[#E7E7E5] rounded-2xl ${isMobile ? 'p-4 space-y-3.5' : isTablet ? 'p-6 space-y-4' : 'p-10 space-y-5'} shadow-2xs`}>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-brand-primary text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded-sm shadow-2xs">
                        {form.category}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 flex items-center gap-1 font-semibold">
                        <Clock size={13} /> {form.readTime}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar size={13} /> Today
                      </span>
                    </div>

                    <h1 className={`font-editorial ${isMobile ? 'text-xl' : isTablet ? 'text-3xl' : 'text-4xl'} font-black text-slate-950 tracking-tight leading-tight`}>
                      {form.title || 'Your Article Headline Will Appear Here'}
                    </h1>

                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 leading-relaxed max-w-3xl`}>
                      {form.excerpt || 'Write an executive summary of this review or investigative dispatch...'}
                    </p>

                    <div className={`pt-4 border-t border-slate-100 flex ${isMobile ? 'flex-col items-start gap-3' : 'flex-row items-center justify-between gap-4'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-300 relative shrink-0 flex items-center justify-center font-bold text-slate-600">
                          {form.authorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{form.authorName}</div>
                          <div className="text-xs text-slate-500">{form.authorRole} • {SITE_NAME} Staff</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                        <span>Editorial Testing &amp; Lab Benchmarks</span>
                      </div>
                    </div>
                  </div>

                  {form.imageUrl && (
                    <div className={`relative ${isMobile ? 'aspect-[16/9]' : 'aspect-[21/9]'} rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-slate-900`}>
                      <Image
                        src={form.imageUrl}
                        alt={form.title}
                        fill
                        className="object-cover"
                        unoptimized={form.imageUrl.startsWith('data:') || form.imageUrl.startsWith('/uploads/')}
                      />
                    </div>
                  )}

                  <div className={isDesktop && articleMode === 'review' ? 'grid grid-cols-12 gap-8 items-start' : 'grid grid-cols-1 gap-5 items-start'}>
                    <div className={isDesktop && articleMode === 'review' ? 'col-span-8 space-y-6' : 'space-y-4'}>
                      {articleMode === 'review' && form.rating && (
                        <div className={`bg-slate-900 text-white rounded-2xl ${isMobile ? 'p-4 flex-col text-center' : 'p-6 flex-row text-left'} flex items-center justify-between gap-4`}>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#EAB308]">
                              Independent Evaluation
                            </span>
                            <h4 className="text-base font-bold text-white">{SITE_NAME} Lab Score &amp; Verdict</h4>
                            <p className="text-xs text-slate-400">
                              Based on durability benchmarks, pricing accuracy, and hands-on testing.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl shrink-0">
                            <Star size={20} className="fill-amber-400 text-amber-400" />
                            <span className="text-2xl font-black text-white">{form.rating}</span>
                            <span className="text-xs text-slate-400">/ 5.0</span>
                          </div>
                        </div>
                      )}

                      <div className={`bg-white border border-[#E7E7E5] rounded-2xl ${isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-10'} shadow-2xs space-y-6`}>
                        <div className="w-full">
                          <div
                            className={`prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans ${isMobile ? 'text-sm' : 'text-base'} prose-headings:font-bold prose-h2:text-2xl prose-h2:font-editorial prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2 prose-p:my-3 prose-p:leading-relaxed prose-a:text-brand-primary prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-brand-primary prose-blockquote:italic prose-blockquote:pl-4 prose-blockquote:my-4 prose-img:rounded-xl prose-ul:list-disc prose-ol:list-decimal`}
                            dangerouslySetInnerHTML={{ __html: form.content }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Sidebar in Live Preview (Review Mode Only) */}
                    {articleMode === 'review' && (
                      <aside className={isDesktop ? 'col-span-4 space-y-5' : 'space-y-4'}>
                        {form.showBrandCard && (
                          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 text-center">
                            <StoreLogoFrame
                              src={selectedStore?.logoUrl}
                              name={previewStoreName}
                              className="w-36 h-16 mx-auto rounded-2xl"
                              paddingClassName="p-2"
                              fallbackTextClassName="text-2xl"
                            />
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-brand-primary bg-brand-primary-soft border border-brand-primary-border px-2.5 py-0.5 rounded-full tracking-widest">
                                <Sparkles size={11} />{' '}
                                {form.showStoreCoupons
                                  ? `Brand Deals • Up to ${previewStoreDiscount}`
                                  : 'Official Brand Partner'}
                              </span>
                              <h4 className="font-black text-lg text-slate-900">{previewStoreName}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                {form.brandDescription.trim() ||
                                  selectedStore?.shortDescription ||
                                  `Official products, specifications, and verified offers from ${previewStoreName}.`}
                              </p>
                              {form.brandHighlights.trim() && (
                                <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-xl px-3 py-1.5">
                                  {form.brandHighlights.trim()}
                                </div>
                              )}
                            </div>
                            <div className="w-full py-3 bg-brand-primary text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                              <span>
                                {form.ctaText.trim() ||
                                  (form.showStoreCoupons
                                    ? `Get Promo Code (${selectedStore?.activeCoupons || 3} Active) →`
                                    : `Visit ${previewStoreName} Official Site →`)}
                              </span>
                              <ExternalLink size={13} />
                            </div>
                          </div>
                        )}

                        {form.showStoreCoupons && (
                          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-black text-slate-900">
                              <span className="flex items-center gap-1.5">
                                <Tag size={13} className="text-brand-primary" />
                                Active {previewStoreName} Codes
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                              <span className="font-black text-brand-primary bg-brand-primary-soft border border-brand-primary-border px-2 py-0.5 rounded">
                                {previewStoreDiscount}
                              </span>
                              <span className="font-mono font-bold text-slate-700 bg-white border border-dashed border-slate-300 px-2.5 py-0.5 rounded">
                                SAVE20
                              </span>
                            </div>
                          </div>
                        )}

                        {form.showStoreReviews && (
                          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                <MessageSquare size={14} className="text-emerald-600" />
                                Shopper Reviews
                              </span>
                              <span className="text-xs font-bold text-amber-500">★ {previewStoreRating.toFixed(1)}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>Verified Buyer</span>
                                <span className="text-amber-400">★★★★★</span>
                              </div>
                              <p className="text-slate-600">
                                Authentic buyer feedback synced from {previewStoreName}.
                              </p>
                            </div>
                          </div>
                        )}

                        {form.showGuaranteeCard && (
                          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                              <ShieldCheck size={16} />
                              <span>{form.guaranteeTitle || `${SITE_NAME} Testing Guarantee`}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{form.guaranteeText}</p>
                            <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                              {form.tags
                                .split(',')
                                .filter((t) => t.trim())
                                .map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[11px] font-medium bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg"
                                  >
                                    #{tag.trim()}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </aside>
                    )}
                  </div>
                </div>

                  {hasPreviewNewsBanners && isDesktop && form.rightBannerImage && (
                    <aside className="w-[140px] shrink-0 sticky top-6">
                      <img
                        src={form.rightBannerImage}
                        alt={form.rightBannerAlt || 'Right Banner'}
                        className="w-full h-auto rounded-xl border border-slate-200 shadow-xs object-cover"
                      />
                    </aside>
                  )}
                </div>

                {/* Mobile / Tablet Live Preview Automatic Banner Popup */}
                {hasPreviewNewsBanners && !isDesktop && previewMobilePopupOpen && (
                  <div className="absolute inset-0 z-30 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-[300px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                      <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span>Sponsored Popup</span>
                        <button
                          type="button"
                          onClick={() => setPreviewMobilePopupOpen(false)}
                          className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <img
                        src={form.leftBannerImage || form.rightBannerImage}
                        alt="Mobile Banner Popup"
                        className="w-full max-h-72 object-contain bg-slate-100"
                      />
                      {(form.leftBannerAlt || form.rightBannerAlt) && (
                        <div className="p-2.5 text-center text-xs font-bold text-slate-800 border-t border-slate-100">
                          {form.leftBannerAlt || form.rightBannerAlt}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        </AdminDevicePreviewFrame>
      )}
    </AdminFormPage>

    <AiPostWriterModal
      isOpen={aiModalOpen}
      onClose={() => setAiModalOpen(false)}
      stores={stores.map((s) => ({ slug: s.slug, name: s.name }))}
      initialStoreSlug={form.storeSlug}
      onEnsureStoresLoaded={loadStoresOnDemand}
      onGenerated={handleAiArticleGenerated}
    />
    </>
  );
}
