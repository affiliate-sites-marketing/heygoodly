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
import { ROUTES } from '@/constants/routes';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { STORAGE_KEYS } from '@/constants/ui-constants';
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
  showRelatedReviews: boolean;
  showGuaranteeCard: boolean;
  ctaText: string;
  brandDescription: string;
  guaranteeTitle: string;
  guaranteeText: string;
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
        showStoreCoupons: existing.sidebarConfig?.showStoreCoupons !== false,
        showRelatedReviews: existing.sidebarConfig?.showRelatedReviews !== false,
        showGuaranteeCard: existing.sidebarConfig?.showGuaranteeCard !== false,
        ctaText: existing.sidebarConfig?.ctaText || '',
        brandDescription: existing.sidebarConfig?.brandDescription || '',
        guaranteeTitle: existing.sidebarConfig?.guaranteeTitle || `${SITE_NAME} Testing Guarantee`,
        guaranteeText:
          existing.sidebarConfig?.guaranteeText ||
          'Every product reviewed is independently evaluated against real-world benchmarks. We never accept paid placements to alter lab scores.',
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
        showStoreCoupons: true,
        showRelatedReviews: true,
        showGuaranteeCard: true,
        ctaText: '',
        brandDescription: '',
        guaranteeTitle: `${SITE_NAME} Testing Guarantee`,
        guaranteeText:
          'Every product reviewed is independently evaluated against real-world benchmarks. We never accept paid placements to alter lab scores.',
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
}

function PostFormInner({ existing, initial }: { existing?: AdminArticle; initial: PostFormState }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [form, setForm] = useState<PostFormState>(initial);
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(existing?.slug));
  const [excerptTouched, setExcerptTouched] = useState<boolean>(Boolean(existing?.excerpt?.trim()));
  const [autoCategoryTag, setAutoCategoryTag] = useState<string>(
    existing?.category?.trim() || (initial.categoryId ? initial.category.trim() : '')
  );
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
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
            shortDescription: s.aboutStore || s.description || `${s.name} promo codes`,
            logoUrl: s.logo || s.logoUrl || '',
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

    const sidebarConfig = {
      storeName: form.storeName.trim(),
      showBrandCard: form.showBrandCard,
      showStoreCoupons: form.showStoreCoupons,
      showRelatedReviews: form.showRelatedReviews,
      showGuaranteeCard: form.showGuaranteeCard,
      ctaText: form.ctaText.trim(),
      brandDescription: form.brandDescription.trim(),
      guaranteeTitle: form.guaranteeTitle.trim() || `${SITE_NAME} Testing Guarantee`,
      guaranteeText:
        form.guaranteeText.trim() ||
        'Every product reviewed is independently evaluated against real-world benchmarks. We never accept paid placements to alter lab scores.',
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
      storeSlug: form.storeSlug.trim() || null,
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

  const headerActions = (
    <div className="flex items-center gap-2 mr-1">
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
                      label: cat.slug === 'other' ? `${cat.name} (Khác)` : cat.name,
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

          {/* RIGHT SIDEBAR & AFFILIATE STORE CONFIGURATION */}
          <div className="w-full">
            <FormSection
              title="Right Sidebar & Affiliate Store Configuration"
              description="Configure the partner store, active promo codes, related reviews, and editorial guarantee displayed in the article right sidebar"
              headerRight={
                <span className="text-[11px] font-bold text-brand-primary bg-brand-primary-soft border border-brand-primary-border px-3 py-1 rounded-xl flex items-center gap-1.5">
                  <PanelRight size={13} />
                  <span>Right Sidebar Config</span>
                </span>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 7 Cols: Controls */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelClass}>Target Partner Store</label>
                      <AdminSearchableSelect
                        value={form.storeSlug}
                        onOpen={loadStoresOnDemand}
                        placeholder="✨ Auto-detect from title / slug"
                        searchPlaceholder="Search partner store..."
                        options={[
                          { value: '', label: '✨ Auto-detect from title / slug' },
                          ...stores.map((s) => ({
                            value: s.slug,
                            label: s.name,
                            sublabel: `${s.maxDiscount} • ${s.activeCoupons} codes`,
                          })),
                        ]}
                        onChange={(chosenSlug) => {
                          const matched = stores.find((s) => s.slug === chosenSlug);
                          setForm((prev) => ({
                            ...prev,
                            storeSlug: chosenSlug,
                            storeName: matched ? matched.name : prev.storeName,
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelClass}>Store Display Name (Optional Override)</label>
                      <input
                        type="text"
                        value={form.storeName}
                        onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                        placeholder={selectedStore?.name || 'e.g. Neo Sabers'}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelClass}>CTA Button Text</label>
                      <input
                        type="text"
                        value={form.ctaText}
                        onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                        placeholder={`Get Promo Code (${selectedStore?.activeCoupons || 6} Active) →`}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelClass}>Short Description Under Store Name</label>
                      <input
                        type="text"
                        value={form.brandDescription}
                        onChange={(e) => setForm({ ...form, brandDescription: e.target.value })}
                        placeholder={
                          selectedStore?.shortDescription ||
                          `Updated daily with hand-tested promo codes for ${previewStoreName}.`
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Widget Toggles */}
                  <div className="space-y-2 pt-1">
                    <label className={labelClass}>Right Sidebar Widget Visibility</label>
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
                            <span>1. Brand Deals Card</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Store logo, rating stars, summary, and promo code CTA button.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={form.showStoreCoupons}
                          onChange={(e) => setForm({ ...form, showStoreCoupons: e.target.checked })}
                          className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Tag size={13} className="text-brand-primary" />
                            <span>2. Active Promo Codes</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Displays up to 3 active coupons for the selected store.
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
                            <span>3. Related Lab Reviews</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Recommends related reviews in the same category with thumbnails.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={form.showGuaranteeCard}
                          onChange={(e) => setForm({ ...form, showGuaranteeCard: e.target.checked })}
                          className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-emerald-600" />
                            <span>4. Testing Guarantee &amp; Tags</span>
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
                </div>

                {/* Right 5 Cols: Mini Live Preview of the Right Sidebar */}
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <span>Right Sidebar Preview</span>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                      Live Sync
                    </span>
                  </div>

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
                          <Sparkles size={10} /> Brand Deals • Up to {previewStoreDiscount}
                        </span>
                        <h4 className="font-black text-sm text-slate-900">{previewStoreName}</h4>
                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800">{previewStoreRating.toFixed(1)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {form.brandDescription.trim() ||
                            selectedStore?.shortDescription ||
                            `Updated daily with hand-tested promo codes and direct manufacturer discounts for ${previewStoreName}.`}
                        </p>
                      </div>
                      <div className="w-full py-2 bg-brand-primary text-white font-black text-[11px] rounded-lg">
                        {form.ctaText.trim() || `Get Promo Code (${selectedStore?.activeCoupons || 6} Active) →`}
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

            return (
              <div className={`bg-[#F8F8F6] ${isMobile ? 'p-3.5 space-y-4' : isTablet ? 'p-5 space-y-5' : 'p-8 space-y-6'}`}>
                <div className="max-w-6xl mx-auto space-y-5">
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

                  <div className={isDesktop ? 'grid grid-cols-12 gap-8 items-start' : 'grid grid-cols-1 gap-5 items-start'}>
                    <div className={isDesktop ? 'col-span-8 space-y-6' : 'space-y-4'}>
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

                      <div className={`bg-white border border-[#E7E7E5] rounded-2xl ${isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-10'} shadow-2xs space-y-6`}>
                        <div className="w-full">
                          <div
                            className={`prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans ${isMobile ? 'text-sm' : 'text-base'} prose-headings:font-bold prose-h2:text-2xl prose-h2:font-editorial prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2 prose-p:my-3 prose-p:leading-relaxed prose-a:text-brand-primary prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-brand-primary prose-blockquote:italic prose-blockquote:pl-4 prose-blockquote:my-4 prose-img:rounded-xl prose-ul:list-disc prose-ol:list-decimal`}
                            dangerouslySetInnerHTML={{ __html: form.content }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Sidebar in Live Preview */}
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
                              <Sparkles size={11} /> Brand Deals • Up to {previewStoreDiscount}
                            </span>
                            <h4 className="font-black text-lg text-slate-900">{previewStoreName}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {form.brandDescription.trim() ||
                                selectedStore?.shortDescription ||
                                `Updated daily with hand-tested promo codes and direct manufacturer discounts for ${previewStoreName}.`}
                            </p>
                          </div>
                          <div className="w-full py-3 bg-brand-primary text-white font-black text-xs rounded-xl shadow-xs">
                            {form.ctaText.trim() || `Get Promo Code (${selectedStore?.activeCoupons || 6} Active) →`}
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
                  </div>
                </div>
              </div>
            );
          }}
        </AdminDevicePreviewFrame>
      )}
    </AdminFormPage>
  );
}
