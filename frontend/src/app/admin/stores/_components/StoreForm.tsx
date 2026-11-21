'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/admin/ImageUpload';
import TagInput from '@/components/admin/TagInput';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import AdminDevicePreviewFrame from '@/components/admin/AdminDevicePreviewFrame';
import GetCodeButton from '@/components/deals/GetCodeButton';
import AdminFormPage, {
  FormLoading,
  FormNotFound,
  FormSection,
  inputClass,
  labelClass,
} from '@/components/admin/AdminFormPage';
import { ROUTES } from '@/constants/routes';
import { SITE_DOMAIN, SITE_NAME, SITE_SLUG } from '@/constants/site';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import storeService, { buildDefaultPopularSearches } from '@/services/storeService';
import {
  buildDefaultStoreFaqs,
  extractBrandToken,
  FaqTemplateItem,
  ReviewTemplateItem,
} from '@/constants/storeTemplates';
import { storeTemplateService } from '@/services/storeTemplateService';
import { type AdminStore } from '../_lib/data';
import { StoreCustomerReview, StoreRatingBreakdown } from '@/types/deals';
import StoreCustomerReviewsSection from '@/components/store/StoreCustomerReviewsSection';
import ReviewerPicker from './ReviewerPicker';
import ReviewLibraryModal from './ReviewLibraryModal';
import FaqLibraryModal from './FaqLibraryModal';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { 
  Eye, 
  Edit2, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ExternalLink, 
  Star, 
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Tag,
  ShieldCheck,
  Clock,
  Users,
  Sparkles,
  ChevronDown,
  ArrowRight,
  AlertCircle,
  BookOpen,
  RotateCcw,
  BookmarkPlus,
} from 'lucide-react';

interface StoreFormState {
  name: string;
  slug: string;
  domain: string;
  logoUrl: string;
  bannerUrl: string;
  categoryId?: number;
  category: string;
  rating: number;
  reviewsCount?: number;
  maxDiscount: string;
  affiliateUrl: string;
  shortDescription?: string;
  description: string;
  popularSearchesText?: string;
  faqs: Array<{ question: string; answer: string }>;
  ratingBreakdown: StoreRatingBreakdown;
  customerReviews: StoreCustomerReview[];
  isFeatured: boolean;
  isActive: boolean;
  tags?: string[];
  sortOrder: number;
}

const FORM_ID = 'store-form';

export default function StoreForm({ id }: { id?: string }) {
  const isEdit = id !== undefined;
  const [storeData, setStoreData] = useState<AdminStore | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !id) return;
    let isMounted = true;
    storeService.getAdminStoreById(id)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.name) {
          const mapped: AdminStore = {
            id: String(data.id),
            name: data.name,
            slug: data.slug,
            domain: (data as any).displayDomain
              ? String((data as any).displayDomain)
              : data.afWebsite
                ? data.afWebsite.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '')
                : `${data.slug}.com`,
            logoUrl: data.logo || '',
            bannerUrl: data.socialCardImage || '',
            categoryId: data.categoryId ? Number(data.categoryId) : undefined,
            category: data.categoryName || 'General',
            rating: Number(data.ratingScore ?? 4.8),
            reviewsCount: Number(data.ratingCount ?? 0),
            activeCoupons: 0,
            maxDiscount: data.maxOffer ? `Up to ${data.maxOffer}% OFF` : '20%',
            affiliateUrl: data.afWebsite || `/go/${data.slug}`,
            description: data.aboutStore || '',
            shortDescription: data.socialDescription || '',
            popularSearches: data.popularSearches || [],
            faqs: data.faqs || [],
            ratingBreakdown: data.ratingBreakdown || {
              fiveStar: 0,
              fourStar: 0,
              threeStar: 0,
              twoStar: 0,
              oneStar: 0,
            },
            customerReviews: Array.isArray(data.customerReviews) ? data.customerReviews : [],
            isFeatured: Boolean(data.isFeatured),
            isActive: data.isActive !== false,
            clicks: Number(data.afVisitCount ?? 0),
            tags: Array.isArray(data.tags) ? data.tags : [],
            sortOrder: Number(data.sortOrder ?? 9999),
          };
          setStoreData(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to load store detail from backend:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isEdit]);

  if (isEdit && loading) return <FormLoading />;
  if (isEdit && !storeData && !loading) return <FormNotFound backHref={ROUTES.ADMIN.STORES} entity="Store" />;

  const initial: StoreFormState = storeData
    ? {
      name: storeData.name,
      slug: storeData.slug,
      domain: storeData.domain,
      logoUrl: storeData.logoUrl || '',
      bannerUrl: storeData.bannerUrl || '',
      categoryId: storeData.categoryId,
      category: storeData.category,
      rating: storeData.rating,
      reviewsCount: storeData.reviewsCount,
      maxDiscount: storeData.maxDiscount,
      affiliateUrl: storeData.affiliateUrl,
      shortDescription: storeData.shortDescription || '',
      description: storeData.description,
      popularSearchesText:
        storeData.popularSearches && storeData.popularSearches.length > 0
          ? storeData.popularSearches.join(', ')
          : buildDefaultPopularSearches(storeData.name).join(', '),
      faqs:
        storeData.faqs && storeData.faqs.length > 0
          ? storeData.faqs
          : buildDefaultStoreFaqs(storeData.name),
      ratingBreakdown: storeData.ratingBreakdown || {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
      },
      customerReviews: storeData.customerReviews || [],
      isFeatured: storeData.isFeatured,
      isActive: storeData.isActive,
      tags: storeData.tags || [],
      sortOrder: storeData.sortOrder ?? 9999,
    }
    : {
      name: '',
      slug: '',
      domain: '',
      logoUrl: '',
      bannerUrl: '',
      categoryId: undefined,
      category: '',
      rating: 4.8,
      reviewsCount: 0,
      maxDiscount: '20%',
      affiliateUrl: '',
      shortDescription: '',
      description: '',
      popularSearchesText: '',
      faqs: buildDefaultStoreFaqs(''),
      ratingBreakdown: {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
      },
      customerReviews: [],
      isFeatured: false,
      isActive: true,
      tags: [],
      sortOrder: 9999,
    };

  return <StoreFormInner key={storeData?.id ?? 'new'} id={id} existing={storeData ?? undefined} initial={initial} />;
}

function toCleanSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // Strip accidental duplicate protocol prefixes like https://https:// or http://https://
  return trimmed.replace(/^(https?:\/\/)+(https?:\/\/)/i, '$2');
}

function extractCleanDomain(raw: string): string {
  const cleaned = sanitizeUrlInput(raw);
  if (!cleaned) return '';
  return cleaned
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#].*$/, '')
    .trim();
}

const STORE_FIELD_LABELS: Record<string, string> = {
  name: 'Store Name',
  affiliateUrl: 'Affiliate Tracking URL',
  slug: 'URL Slug',
  domain: 'Official Domain',
  categoryId: 'Category',
  maxDiscount: 'Max Discount Display',
  rating: 'Rating Score (1.0 - 5.0)',
  reviewsCount: 'Total Reviews Count',
  logoUrl: 'Store Brand Logo',
};

function parsePopularSearchesText(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasCustomPopularSearches(store?: AdminStore): boolean {
  if (!store?.popularSearches || store.popularSearches.length === 0) return false;
  const saved = store.popularSearches.map((s) => s.trim().toLowerCase()).filter(Boolean).join(', ');
  const defaults = buildDefaultPopularSearches(store.name).map((s) => s.toLowerCase()).join(', ');
  return Boolean(saved) && saved !== defaults;
}

function hasCustomFaqs(store?: AdminStore): boolean {
  if (!store?.faqs || store.faqs.length === 0) return false;
  const defaults = buildDefaultStoreFaqs(store.name);
  if (store.faqs.length !== defaults.length) return true;
  return store.faqs.some(
    (f, idx) =>
      (f.question || '').trim() !== defaults[idx].question.trim() ||
      (f.answer || '').trim() !== defaults[idx].answer.trim()
  );
}

function extractSummaryFromReviewHtml(html?: string | null, maxChars = 260): string {
  if (!html) return '';
  // Prefer paragraph text after headings if available
  const withoutHeadings = html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ');
  const rawSource = withoutHeadings.replace(/<[^>]+>/g, ' ').trim() ? withoutHeadings : html;
  const plain = rawSource
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s*\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  if (plain.length <= maxChars) return plain;
  const sliced = plain.slice(0, maxChars);
  const lastPeriod = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '), sliced.lastIndexOf('? '));
  if (lastPeriod >= Math.floor(maxChars * 0.5)) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trim() + '...';
}

function StoreFormInner({ id, existing, initial }: { id?: string; existing?: AdminStore; initial: StoreFormState }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [form, setForm] = useState<StoreFormState>(initial);
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(existing?.slug));
  const [domainTouched, setDomainTouched] = useState<boolean>(
    Boolean(
      existing?.domain &&
      existing?.affiliateUrl &&
      extractCleanDomain(existing.domain).toLowerCase() !== extractCleanDomain(existing.affiliateUrl).toLowerCase()
    )
  );
  const [shortDescTouched, setShortDescTouched] = useState<boolean>(Boolean(existing?.shortDescription?.trim()));
  const [autoBrandTag, setAutoBrandTag] = useState<string>(existing?.name?.trim() || '');
  const [popularSearchesTouched, setPopularSearchesTouched] = useState<boolean>(
    hasCustomPopularSearches(existing)
  );
  const [faqsTouched, setFaqsTouched] = useState<boolean>(hasCustomFaqs(existing));
  const faqsTouchedRef = useRef<boolean>(hasCustomFaqs(existing));
  const [faqTemplates, setFaqTemplates] = useState<FaqTemplateItem[]>([]);
  const faqTemplatesRef = useRef<FaqTemplateItem[]>([]);
  const [reviewTemplates, setReviewTemplates] = useState<ReviewTemplateItem[]>([]);
  const [faqLibraryOpen, setFaqLibraryOpen] = useState(false);
  const [reviewLibraryState, setReviewLibraryState] = useState<{
    open: boolean;
    mode: 'append' | 'replace-single';
    targetIndex: number | null;
  }>({ open: false, mode: 'append', targetIndex: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>(() => {
    if (existing?.categoryId && existing?.category) {
      return [{ id: existing.categoryId, name: existing.category }];
    }
    return [];
  });

  const syncFaqTemplates = (list: FaqTemplateItem[]) => {
    faqTemplatesRef.current = list;
    setFaqTemplates(list);
  };

  const loadCategoriesOnDemand = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.CATEGORIES, { params: { size: 100 } });
      const list = res.data?.data?.content || res.data?.data;
      if (Array.isArray(list)) {
        setCategories(list.map((c: any) => ({ id: Number(c.id), name: String(c.name) })));
        return;
      }
    } catch {
      try {
        const pubRes = await apiClient.get(API_ENDPOINTS.PUBLIC.CATEGORIES);
        const pubList = pubRes.data?.data?.content || pubRes.data?.data;
        if (Array.isArray(pubList)) {
          setCategories(pubList.map((c: any) => ({ id: Number(c.id), name: String(c.name) })));
        }
      } catch {}
    }
  };

  useEffect(() => {
    loadCategoriesOnDemand();
  }, []);

  useEffect(() => {
    const nextFaqsTouched = hasCustomFaqs(existing);
    setForm(
      !nextFaqsTouched && faqTemplatesRef.current.length > 0
        ? {
            ...initial,
            faqs: storeTemplateService.getDefaultFaqsForBrand(
              initial.name,
              faqTemplatesRef.current
            ),
          }
        : initial
    );
    setSlugTouched(Boolean(existing?.slug));
    setDomainTouched(
      Boolean(
        existing?.domain &&
        existing?.affiliateUrl &&
        extractCleanDomain(existing.domain).toLowerCase() !== extractCleanDomain(existing.affiliateUrl).toLowerCase()
      )
    );
    setShortDescTouched(Boolean(existing?.shortDescription?.trim()));
    setAutoBrandTag(existing?.name?.trim() || '');
    setPopularSearchesTouched(hasCustomPopularSearches(existing));
    setFaqsTouched(nextFaqsTouched);
    faqsTouchedRef.current = nextFaqsTouched;
  }, [initial, existing]);

  const scrollToField = (fieldKey: string) => {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLElement>(`[data-field="${fieldKey}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        el.focus?.();
      }, 150);
    }
  };

  const handleAddFaq = () => {
    setFaqsTouched(true);
    faqsTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }],
    }));
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqsTouched(true);
    faqsTouchedRef.current = true;
    setForm((prev) => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  const handleRemoveFaq = (index: number) => {
    setFaqsTouched(true);
    faqsTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const handleResetDefaultFaqs = async () => {
    setFaqsTouched(false);
    faqsTouchedRef.current = false;
    let latestTemplates = faqTemplatesRef.current;
    if (latestTemplates.length === 0) {
      try {
        latestTemplates = await storeTemplateService.listFaqTemplates();
        syncFaqTemplates(latestTemplates);
      } catch {}
    }
    setForm((prev) => ({
      ...prev,
      faqs: storeTemplateService.getDefaultFaqsForBrand(prev.name, latestTemplates),
    }));
  };

  const handleAddStarterReviews = async () => {
    let latestTemplates = reviewTemplates;
    if (latestTemplates.length === 0) {
      try {
        latestTemplates = await storeTemplateService.listReviewTemplates();
        setReviewTemplates(latestTemplates);
      } catch {}
    }
    const picks = storeTemplateService.getStarterReviewsForBrand(form.name, latestTemplates);
    if (picks.length === 0) {
      toast.info(t('Review library is empty. Create or save review templates first.'));
      setReviewLibraryState({ open: true, mode: 'append', targetIndex: null });
      return;
    }
    setForm((prev) => ({
      ...prev,
      customerReviews: [...prev.customerReviews, ...picks],
    }));
  };

  const handleAddReview = () => {
    setForm((prev) => ({
      ...prev,
      customerReviews: [
        ...prev.customerReviews,
        {
          reviewerName: '',
          reviewerAvatar: '',
          isVerified: true,
          rating: 5,
          reviewDateLabel: '2 days ago',
          comment: '',
          sortOrder: prev.customerReviews.length,
          isActive: true,
        },
      ],
    }));
  };

  const handleUpdateReview = <K extends keyof StoreCustomerReview>(
    index: number,
    field: K,
    value: StoreCustomerReview[K]
  ) => {
    setForm((prev) => {
      const updated = [...prev.customerReviews];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customerReviews: updated };
    });
  };

  const handleRemoveReview = (index: number) => {
    setForm((prev) => ({
      ...prev,
      customerReviews: prev.customerReviews.filter((_, i) => i !== index),
    }));
  };

  const handleBreakdownChange = (field: keyof StoreRatingBreakdown, rawValue: string) => {
    const parsed = Math.min(100, Math.max(0, parseInt(rawValue, 10) || 0));
    setForm((prev) => ({
      ...prev,
      ratingBreakdown: {
        ...prev.ratingBreakdown,
        [field]: parsed,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      nextErrors.name = t('Please enter the store / brand name.');
    } else if (trimmedName.length > 150) {
      nextErrors.name = t('Store name must not exceed 150 characters.');
    }

    const cleanSlug = toCleanSlug(form.slug.trim() || trimmedName);
    if (trimmedName && !cleanSlug) {
      nextErrors.slug = t('URL Slug must contain letters or numbers (e.g. dutch-vet).');
    }

    // Resolve affiliate URL (fall back to domain if user pasted full URL into domain)
    let resolvedAffiliateUrl = sanitizeUrlInput(form.affiliateUrl);
    if ((!resolvedAffiliateUrl || resolvedAffiliateUrl === 'https://' || resolvedAffiliateUrl === 'http://') && form.domain.trim()) {
      const sanitizedDomain = sanitizeUrlInput(form.domain);
      resolvedAffiliateUrl = /^https?:\/\//i.test(sanitizedDomain)
        ? sanitizedDomain
        : `https://${sanitizedDomain}`;
    } else if (resolvedAffiliateUrl && !/^https?:\/\//i.test(resolvedAffiliateUrl) && !resolvedAffiliateUrl.startsWith('/')) {
      resolvedAffiliateUrl = `https://${resolvedAffiliateUrl}`;
    }

    if (!resolvedAffiliateUrl || resolvedAffiliateUrl === 'https://' || resolvedAffiliateUrl === 'http://') {
      nextErrors.affiliateUrl = t('Please enter the Affiliate Tracking URL (e.g. https://dutchpetinc.pxf.io/QYQax6).');
    }

    const parsedDiscount = parseInt((form.maxDiscount || '').replace(/[^0-9]/g, ''), 10);
    const maxOfferNum = Number.isFinite(parsedDiscount) && parsedDiscount > 0 ? Math.min(500, parsedDiscount) : 20;

    const ratingVal = Number(form.rating);
    if (Number.isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) {
      nextErrors.rating = t('Rating score must be between 0.0 and 5.0.');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const missingFieldNames = Object.keys(nextErrors)
        .map((k) => t(STORE_FIELD_LABELS[k] || k))
        .join(', ');
      toast.error(`${t('Please check required fields')}: ${missingFieldNames}`);
      scrollToField(firstKey);
      return;
    }

    const parsedPopularSearches = parsePopularSearchesText(form.popularSearchesText);

    // Only attach categoryId if it exists in the real loaded categories list
    let finalCategoryId: number | null = null;
    if (form.categoryId && categories.some((c) => c.id === form.categoryId)) {
      finalCategoryId = form.categoryId;
    } else if (form.category) {
      const matched = categories.find((c) => c.name.toLowerCase() === form.category.toLowerCase());
      if (matched) finalCategoryId = matched.id;
    }

    const resolvedShortDescription =
      (form.shortDescription || '').trim() ||
      extractSummaryFromReviewHtml(form.description) ||
      null;

    const autoExtractedDomain = extractCleanDomain(resolvedAffiliateUrl);
    const cleanedInputDomain = form.domain.trim() ? extractCleanDomain(form.domain) : '';
    const resolvedDisplayDomain =
      cleanedInputDomain &&
      (domainTouched || cleanedInputDomain.toLowerCase() !== autoExtractedDomain.toLowerCase())
        ? cleanedInputDomain
        : null;

    const backendPayload = {
      name: trimmedName,
      slug: cleanSlug,
      categoryId: finalCategoryId,
      logo: form.logoUrl || null,
      socialCardImage: form.bannerUrl || null,
      socialDescription: resolvedShortDescription,
      aboutStore: form.description || null,
      afWebsite: resolvedAffiliateUrl || null,
      displayDomain: resolvedDisplayDomain,
      maxOffer: maxOfferNum,
      ratingScore: ratingVal || 4.8,
      ratingCount: form.reviewsCount ?? (existing?.reviewsCount ?? 0),
      isActive: form.isActive,
      isSearchable: true,
      isFeatured: form.isFeatured,
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 9999,
      popularSearches:
        parsedPopularSearches.length > 0
          ? parsedPopularSearches
          : buildDefaultPopularSearches(trimmedName),
      faqs: (() => {
        const cleanedFaqs = form.faqs.filter((f) => f.question.trim() || f.answer.trim());
        return cleanedFaqs.length > 0 ? cleanedFaqs : buildDefaultStoreFaqs(trimmedName);
      })(),
      tags: (form.tags && form.tags.length > 0) ? form.tags : (trimmedName ? [trimmedName] : []),
      ratingBreakdown: form.ratingBreakdown,
      customerReviews: form.customerReviews
        .filter((r) => r.reviewerName.trim() || r.comment.trim())
        .map((r, idx) => ({
          id: r.id,
          reviewerProfileId: r.reviewerProfileId,
          reviewerName: r.reviewerName.trim(),
          reviewerAvatar: r.reviewerAvatar?.trim() || null,
          isVerified: r.isVerified !== false,
          rating: Math.min(5, Math.max(1, Number(r.rating || 5))),
          reviewDateLabel: r.reviewDateLabel?.trim() || '',
          comment: r.comment.trim(),
          sortOrder: idx,
          isActive: r.isActive !== false,
        })),
    };

    try {
      const targetId = existing?.id || id;
      if (existing && targetId) {
        const res = await apiClient.put(API_ENDPOINTS.ADMIN.STORE_DETAIL(targetId), backendPayload);
        toast.success(res.data?.message || `Updated store "${trimmedName}" successfully!`);
      } else {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN.STORES, backendPayload);
        toast.success(res.data?.message || `Created store "${trimmedName}" successfully!`);
      }
      router.push(ROUTES.ADMIN.STORES);
    } catch (err: any) {
      const rawErrors = err?.response?.data?.errors;
      const mappedErrors: Record<string, string> = {};
      if (rawErrors && typeof rawErrors === 'object') {
        const keyMap: Record<string, string> = {
          name: 'name',
          slug: 'slug',
          afWebsite: 'affiliateUrl',
          affiliateUrl: 'affiliateUrl',
          categoryId: 'categoryId',
          logo: 'logoUrl',
          maxOffer: 'maxDiscount',
          ratingScore: 'rating',
          ratingCount: 'reviewsCount',
        };
        for (const [k, v] of Object.entries(rawErrors)) {
          const uiKey = keyMap[k] || k;
          mappedErrors[uiKey] = String(v);
        }
      }

      const errCode = err?.response?.data?.code;
      const msg = err?.response?.data?.message || err?.message || t('Failed to save store.');
      if (errCode === 'DUPLICATE_RESOURCE' || /slug/i.test(msg)) {
        mappedErrors.slug = msg;
      }

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const fieldNames = Object.keys(mappedErrors)
          .map((k) => t(STORE_FIELD_LABELS[k] || k))
          .join(', ');
        toast.error(`${t('Please check required fields')}: ${fieldNames} — ${mappedErrors[firstKey]}`);
        scrollToField(firstKey);
      } else {
        toast.error(msg);
      }
    }
  };

  const headerActions = (
    <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold mr-2">
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
  );

  return (
    <AdminFormPage
      title={existing ? `Edit Store: ${existing.name}` : 'Add New Merchant Store'}
      description="Configure merchant credentials, logos, referral URLs, and SEO taxonomy."
      backHref={ROUTES.ADMIN.STORES}
      backLabel="Back to stores"
      formId={FORM_ID}
      submitLabel={existing ? 'Save Store' : 'Add Store'}
      headerActions={headerActions}
      width="full"
    >
      {activeTab === 'edit' ? (
        <form noValidate id={FORM_ID} onSubmit={handleSave} className="space-y-6">
          {/* Quick Setup Guide Banner for Admin */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 bg-blue-50/70 flex items-start gap-3 text-xs text-slate-700">
            <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900">
                {t('Quick Brand Setup Guide')}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t('Only Store Name (*) and Affiliate Tracking URL (*) are required to create a brand. URL Slug and Official Domain are auto-filled for you; Logo, Category, Description, FAQs, and Reviews are optional.')}
              </p>
            </div>
          </div>

          {/* Prominent Validation Error Summary Banner */}
          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              className="p-4 rounded-2xl border border-rose-300 bg-rose-50/90 text-rose-900 space-y-2.5 shadow-2xs animate-fadeIn"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>
                  {t('Please fix the following fields before saving')} ({Object.keys(errors).length}):
                </span>
              </div>
              <ul className="space-y-1.5 pl-1">
                {Object.entries(errors)
                  .filter(([, msg]) => Boolean(msg))
                  .map(([fieldKey, msg]) => (
                    <li key={fieldKey} className="text-xs flex items-center justify-between gap-2 bg-white/80 border border-rose-200/80 rounded-xl px-3 py-2">
                      <div>
                        <strong className="font-bold text-rose-800">
                          {t(STORE_FIELD_LABELS[fieldKey] || fieldKey)}:
                        </strong>{' '}
                        <span className="text-rose-700">{msg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => scrollToField(fieldKey)}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold shrink-0 cursor-pointer transition"
                      >
                        {t('Go to field')} →
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Column (Left - 2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <FormSection
              title="Store Identity & Domain"
              description="Step 1 (Required): Enter brand name and affiliate tracking link. Slug and display domain are generated automatically."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>
                    {t('Store Name')} <span className="text-rose-600 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    data-field="name"
                    value={form.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      const trimmedNext = nextName.trim();
                      setForm((prev) => {
                        const existingTags = prev.tags || [];
                        // Replace previous auto-generated brand tag with the new brand name while keeping any manual tags
                        const manualTags = existingTags.filter(
                          (tg) =>
                            tg.toLowerCase() !== (autoBrandTag || '').toLowerCase() &&
                            tg.toLowerCase() !== prev.name.trim().toLowerCase()
                        );
                        const nextTags = trimmedNext
                          ? Array.from(new Set([trimmedNext, ...manualTags]))
                          : manualTags;

                        return {
                          ...prev,
                          name: nextName,
                          slug: slugTouched ? prev.slug : toCleanSlug(nextName),
                          tags: nextTags,
                          popularSearchesText: popularSearchesTouched
                            ? prev.popularSearchesText
                            : buildDefaultPopularSearches(trimmedNext).join(', '),
                          faqs: faqsTouched
                            ? prev.faqs
                            : storeTemplateService.getDefaultFaqsForBrand(
                                trimmedNext,
                                faqTemplatesRef.current
                              ),
                        };
                      });
                      setAutoBrandTag(trimmedNext);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="e.g. Dutch Vet"
                    className={`${inputClass} ${errors.name ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.name ? (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.name}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      {t('Required • Brand display name shown across the portal.')}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>{t('URL Slug')}</label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {t('Auto-generated')}
                    </span>
                  </div>
                  <input
                    type="text"
                    data-field="slug"
                    value={form.slug}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSlugTouched(Boolean(val.trim()));
                      setForm((prev) => ({ ...prev, slug: val }));
                      if (errors.slug) setErrors((prev) => ({ ...prev, slug: '' }));
                    }}
                    onBlur={() => {
                      setForm((prev) => ({
                        ...prev,
                        slug: toCleanSlug(prev.slug || prev.name),
                      }));
                    }}
                    placeholder={toCleanSlug(form.name) || 'dutch-vet'}
                    className={`${inputClass} font-mono ${errors.slug ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.slug ? (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.slug}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      URL: /store/{toCleanSlug(form.slug || form.name) || 'brand-slug'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>
                  {t('Affiliate Tracking URL')} <span className="text-rose-600 font-black">*</span>
                </label>
                <input
                  type="url"
                  data-field="affiliateUrl"
                  value={form.affiliateUrl}
                  onChange={(e) => {
                    const sanitized = sanitizeUrlInput(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      affiliateUrl: sanitized,
                      domain:
                        !domainTouched && sanitized
                          ? extractCleanDomain(sanitized)
                          : prev.domain,
                    }));
                    if (errors.affiliateUrl) setErrors((prev) => ({ ...prev, affiliateUrl: '' }));
                  }}
                  onBlur={() => {
                    if (form.affiliateUrl.trim() && !/^https?:\/\//i.test(form.affiliateUrl.trim()) && !form.affiliateUrl.trim().startsWith('/')) {
                      const withProto = `https://${sanitizeUrlInput(form.affiliateUrl)}`;
                      setForm((prev) => ({
                        ...prev,
                        affiliateUrl: withProto,
                        domain: !domainTouched ? extractCleanDomain(withProto) : prev.domain,
                      }));
                    }
                  }}
                  placeholder="https://dutchpetinc.pxf.io/QYQax6"
                  className={`${inputClass} font-mono ${errors.affiliateUrl ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                />
                {errors.affiliateUrl ? (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.affiliateUrl}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {t('Required • Paste your full partner tracking link (e.g. https://dutchpetinc.pxf.io/QYQax6). Duplicate https:// is automatically cleaned.')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>{t('Official Domain (Optional)')}</label>
                    <span className="text-[10px] font-medium text-slate-500">
                      {domainTouched && form.domain.trim() && extractCleanDomain(form.domain).toLowerCase() !== extractCleanDomain(form.affiliateUrl).toLowerCase()
                        ? t('Custom domain')
                        : t('Auto-extracted')}
                    </span>
                  </div>
                  <input
                    type="text"
                    data-field="domain"
                    value={form.domain}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      setDomainTouched(Boolean(rawVal.trim()));
                      const sanitized = sanitizeUrlInput(rawVal);
                      setForm((prev) => ({
                        ...prev,
                        domain: rawVal,
                        // If admin pasted a full tracking URL here while Affiliate URL is empty, auto-fill Affiliate URL!
                        affiliateUrl:
                          !prev.affiliateUrl.trim() && /^https?:\/\//i.test(sanitized)
                            ? sanitized
                            : prev.affiliateUrl,
                      }));
                      if (errors.domain) setErrors((prev) => ({ ...prev, domain: '' }));
                      if (errors.affiliateUrl && /^https?:\/\//i.test(sanitized)) {
                        setErrors((prev) => ({ ...prev, affiliateUrl: '' }));
                      }
                    }}
                    placeholder={extractCleanDomain(form.affiliateUrl) || 'dutchpet.com'}
                    className={`${inputClass} ${errors.domain ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.domain && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.domain}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>{t('Category (Optional)')}</label>
                    <span className="text-[10px] font-medium text-slate-500">
                      {t('Optional')}
                    </span>
                  </div>
                  <AdminSearchableSelect
                    data-field="categoryId"
                    value={String(form.categoryId ?? (categories.find(c => c.name.toLowerCase() === form.category.toLowerCase())?.id || ''))}
                    onOpen={loadCategoriesOnDemand}
                    error={Boolean(errors.categoryId)}
                    placeholder="-- No Category (Optional) --"
                    searchPlaceholder="Search category..."
                    options={[
                      { value: '', label: '-- No Category (Optional) --' },
                      ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                    ]}
                    onChange={(val) => {
                      const catId = val ? Number(val) : undefined;
                      const matched = categories.find((c) => c.id === catId);
                      setForm({
                        ...form,
                        categoryId: catId,
                        category: matched ? matched.name : '',
                      });
                      if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: '' }));
                    }}
                  />
                  {errors.categoryId && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.categoryId}
                    </p>
                  )}
                </div>
              </div>

              {/* Merged Store Tags inside Brand Overview */}
              <div className="pt-3 border-t border-slate-100">
                <TagInput
                  tags={form.tags || []}
                  onChange={(newTags) => setForm({ ...form, tags: newTags })}
                  label={t('Store Tags')}
                  placeholder="Type tag name and press Enter (e.g., tech, accessories, anker...)"
                  helperText={t('Automatically includes the brand name tag as you type Store Name. You can also add additional topic tags.')}
                />
              </div>

              {/* Merged Short Summary inside Brand Overview (Optional or Auto-extracted from Review) */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className={labelClass}>{t('Short Summary (2–3 Lines)')}</label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {t('Optional • Auto-extracted from Review if blank')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const extracted = extractSummaryFromReviewHtml(form.description);
                        if (extracted) {
                          setForm((prev) => ({ ...prev, shortDescription: extracted }));
                          setShortDescTouched(false);
                          toast.success(t('Extracted summary from Review section!'));
                        } else {
                          toast.info(t('Write content in the Editorial Overview & Description section below first, or leave this blank.'));
                        }
                      }}
                      className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={11} />
                      <span>{t('Extract from Review')}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(form.shortDescription || '').length} chars
                    </span>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={form.shortDescription || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShortDescTouched(Boolean(val.trim()));
                    setForm({ ...form, shortDescription: val });
                  }}
                  placeholder={
                    extractSummaryFromReviewHtml(form.description) ||
                    t('Optional: Leave blank to automatically take the opening paragraph from the Review / Description below...')
                  }
                  className={`${inputClass} resize-y leading-relaxed text-xs`}
                />
                <p className="text-[11px] text-slate-500">
                  💡 {t('You can leave this blank — the system will automatically extract 2–3 opening sentences from the Editorial Review section below.')}
                </p>
              </div>
            </FormSection>
          </div>

          {/* Sidebar Column (Right - 1 Col) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status & Visibility Card */}
            <FormSection title="Status & Visibility">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Active Status</span>
                    <span className="text-[11px] text-slate-400">Publicly visible on website</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Featured Store</span>
                    <span className="text-[11px] text-slate-400">Pin to top store directory</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                </label>
              </div>
            </FormSection>

            {/* Performance & Outbound Links */}
            <FormSection title="Affiliate Configuration">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClass}>{t('Max Discount Display')}</label>
                  <input
                    type="text"
                    data-field="maxDiscount"
                    value={form.maxDiscount}
                    onChange={(e) => {
                      setForm({ ...form, maxDiscount: e.target.value });
                      if (errors.maxDiscount) setErrors((prev) => ({ ...prev, maxDiscount: '' }));
                    }}
                    placeholder="e.g. 25% Off"
                    className={`${inputClass} ${errors.maxDiscount ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.maxDiscount && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.maxDiscount}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>{t('Rating Score (1.0 - 5.0)')}</label>
                  <input
                    type="number"
                    data-field="rating"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(e) => {
                      setForm({ ...form, rating: parseFloat(e.target.value) || 4.8 });
                      if (errors.rating) setErrors((prev) => ({ ...prev, rating: '' }));
                    }}
                    className={`${inputClass} ${errors.rating ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.rating && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.rating}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>{t('Total Reviews Count')}</label>
                  <input
                    type="number"
                    data-field="reviewsCount"
                    min="0"
                    value={form.reviewsCount ?? 0}
                    onChange={(e) => {
                      setForm({ ...form, reviewsCount: Math.max(0, parseInt(e.target.value, 10) || 0) });
                      if (errors.reviewsCount) setErrors((prev) => ({ ...prev, reviewsCount: '' }));
                    }}
                    placeholder="e.g. 12540"
                    className={`${inputClass} ${errors.reviewsCount ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.reviewsCount && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.reviewsCount}
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Live Preview Card */}
            <FormSection title="Live Card Preview">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-sm font-black text-slate-400">
                        {form.name ? form.name.charAt(0).toUpperCase() : 'S'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {form.name || 'Store Name Preview'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {form.domain || 'domain.com'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60">
                  <span className="font-bold text-brand-primary bg-rose-50 px-2 py-0.5 rounded">
                    Up to {form.maxDiscount || '20% Off'}
                  </span>
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    ★ {form.rating || 4.8}
                  </span>
                </div>
              </div>
            </FormSection>
          </div>

        </div>

        {/* Full-Width 100% Sections: Visual Assets, Word Studio Editor, Popular Searches, FAQs */}
        <div className="w-full space-y-6">
          <FormSection
            title="Visual Assets"
            description="Step 2 (Optional): Upload brand logo and cover banner. If omitted, an automatic brand monogram badge is used."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1" data-field="logoUrl">
                <ImageUpload
                  value={form.logoUrl}
                  onChange={(url) => {
                    setForm({ ...form, logoUrl: url });
                    if (errors.logoUrl) setErrors((prev) => ({ ...prev, logoUrl: '' }));
                  }}
                  folder="store-logos"
                  label="Store Brand Logo (Optional)"
                  description="Square logo (PNG or JPG). Recommended 200x200."
                  aspectRatio="square"
                  defaultTags={form.name.trim() ? [form.name.trim()] : []}
                />
                {errors.logoUrl && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.logoUrl}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <ImageUpload
                  value={form.bannerUrl}
                  onChange={(url) => setForm({ ...form, bannerUrl: url })}
                  folder="store-banners"
                  label="Store Banner / Cover (Optional)"
                  description="Wide banner for store coupon landing page."
                  aspectRatio="video"
                  defaultTags={form.name.trim() ? [form.name.trim()] : []}
                />
              </div>
            </div>
          </FormSection>

          {/* Word Studio Editor */}
          <FormSection
            title="Editorial Overview & Description"
            description="Compose the brand overview and promo code redemption guide in Word Studio (100% Full-Width Canvas)"
            headerRight={
              <span className="text-[11px] font-bold text-[#2b579a] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2b579a] animate-pulse"></span>
                <span>Word Studio 100%</span>
              </span>
            }
          >
            <RichTextEditor
              value={form.description}
              onChange={(html) => {
                setForm((prev) => ({
                  ...prev,
                  description: html,
                  shortDescription: shortDescTouched
                    ? prev.shortDescription
                    : extractSummaryFromReviewHtml(html),
                }));
              }}
              minHeight="450px"
              initialPaperView={false}
              placeholder="Enter refund policies, shipping thresholds, and coupon stacking tips for this store..."
            />
          </FormSection>

          {/* Popular Searches Config Section (100% Full Width) */}
          <FormSection
            title="Popular Searches Pills"
            description="Quick-search keyword pills displayed above the store review section for SEO and shopper convenience."
            headerRight={
              <div className="flex items-center gap-2">
                {form.name.trim() &&
                  (form.popularSearchesText || '').trim() !==
                    buildDefaultPopularSearches(form.name).join(', ') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPopularSearchesTouched(false);
                        setForm((prev) => ({
                          ...prev,
                          popularSearchesText: buildDefaultPopularSearches(prev.name).join(', '),
                        }));
                      }}
                      className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer transition"
                    >
                      {t('Regenerate from Brand Name')}
                    </button>
                  )}
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {t('Auto-generated from Brand Name')}
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelClass}>{t('Search Keywords (Comma- or newline-separated)')}</label>
                <textarea
                  rows={3}
                  value={form.popularSearchesText || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPopularSearchesTouched(Boolean(val.trim()));
                    setForm({ ...form, popularSearchesText: val });
                  }}
                  onBlur={() => {
                    if (!(form.popularSearchesText || '').trim() && form.name.trim()) {
                      setPopularSearchesTouched(false);
                      setForm((prev) => ({
                        ...prev,
                        popularSearchesText: buildDefaultPopularSearches(prev.name).join(', '),
                      }));
                    }
                  }}
                  placeholder={form.name.trim() || 'Dutch Vet'}
                  className={`${inputClass} resize-y text-xs leading-relaxed`}
                />
                <p className="text-[11px] text-slate-500">
                  {t(
                    `💡 Defaults to the store brand name (${form.name.trim() || t('Store')}). Add more keywords separated by commas if needed.`
                  )}
                </p>
              </div>

              {/* Live Preview of Tag Pills */}
              {parsePopularSearchesText(form.popularSearchesText).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">{t('Tag Pills Preview:')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsePopularSearchesText(form.popularSearchesText).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* Store FAQs Config Section (100% Full Width) */}
          <FormSection
            title="Store FAQs & Schema Q&A"
            description="Configure frequently asked questions and answers displayed at the bottom of the store page."
            headerRight={
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFaqLibraryOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 cursor-pointer transition"
                >
                  <BookOpen size={13} />
                  <span>{t('FAQ Library')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultFaqs}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 cursor-pointer transition"
                  title={t('Reset Default FAQs')}
                >
                  <RotateCcw size={12} />
                  <span>{t('Reset Default FAQs')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus size={13} />
                  <span>Add FAQ</span>
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {form.faqs.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <HelpCircle size={16} />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    No custom FAQs added for this store yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    The store page automatically displays 5 default FAQs (how to redeem codes, return policy, coupon stacking, free shipping). Click below to add custom questions.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetDefaultFaqs}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200/80 transition cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>{t('Load 5 Default FAQs')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFaqLibraryOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                    >
                      <BookOpen size={13} />
                      <span>{t('Browse FAQ Library')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add First Question</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 relative group hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                            Q{idx + 1}
                          </span>
                          <span>Question #{idx + 1}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!faq.question.trim() && !faq.answer.trim()) return;
                              try {
                                const saved = await storeTemplateService.createFaqTemplate({
                                  category: 'custom',
                                  title: faq.question.trim().slice(0, 48) || `FAQ #${idx + 1}`,
                                  questionTemplate: extractBrandToken(faq.question, form.name),
                                  answerTemplate: extractBrandToken(faq.answer, form.name),
                                  isDefault: false,
                                });
                                syncFaqTemplates([saved, ...faqTemplatesRef.current]);
                                toast.success(t('Saved to FAQ Library!'));
                              } catch {
                                toast.error(t('Failed to save template'));
                              }
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition cursor-pointer inline-flex items-center gap-1"
                            title={t('Save to Library')}
                          >
                            <BookmarkPlus size={12} />
                            <span>{t('Save to Library')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFaq(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                            title="Remove FAQ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Question *</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                          placeholder={`e.g. How do I apply a ${form.name || 'Store'} promo code at checkout?`}
                          className={`${inputClass} text-xs`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Answer *</label>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                          placeholder="Enter a helpful answer for shoppers..."
                          className={`${inputClass} text-xs resize-y leading-relaxed`}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Another Question</span>
                  </button>
                </div>
              )}
            </div>
          </FormSection>

          {/* Customer Reviews & Rating Breakdown Section (100% Full Width, Database-Backed) */}
          <FormSection
            title="Customer Reviews & Rating Breakdown"
            description="Customize shopper rating breakdown percentages and individual customer review cards displayed on the store page."
            headerRight={
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setReviewLibraryState({ open: true, mode: 'append', targetIndex: null })
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 cursor-pointer transition"
                >
                  <BookOpen size={13} />
                  <span>{t('Review Library')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddStarterReviews}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 cursor-pointer transition"
                >
                  <Sparkles size={13} />
                  <span>{t('Add 3 from Library')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddReview}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus size={13} />
                  <span>Add Review</span>
                </button>
              </div>
            }
          >
            <div className="space-y-5">
              {/* Star Breakdown Percentages (5★ to 1★) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Star Rating Breakdown (%)</h4>
                    <p className="text-[11px] text-slate-500">
                      Leave all at 0% to auto-calculate score, review count, and % from the actual customer reviews below. Enter custom % to override using Rating Score &amp; Total Reviews Count.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(
                    [
                      { key: 'fiveStar', label: '5 ★ (%)' },
                      { key: 'fourStar', label: '4 ★ (%)' },
                      { key: 'threeStar', label: '3 ★ (%)' },
                      { key: 'twoStar', label: '2 ★ (%)' },
                      { key: 'oneStar', label: '1 ★ (%)' },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">{item.label}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.ratingBreakdown[item.key]}
                        onChange={(e) => handleBreakdownChange(item.key, e.target.value)}
                        className={`${inputClass} text-xs`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Review Cards */}
              {form.customerReviews.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <Star size={16} />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    No customer reviews configured for this store yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Add custom shopper reviews stored in PostgreSQL to display the &ldquo;What Shoppers Say&rdquo; section on the store page.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewLibraryState({ open: true, mode: 'append', targetIndex: null })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                    >
                      <BookOpen size={13} />
                      <span>{t('Browse Review Library')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddStarterReviews}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>{t('Add 3 from Library')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddReview}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200/80 transition cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>{t('Add Blank Review')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.customerReviews.map((review, idx) => (
                    <div
                      key={review.id ?? idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span>{review.reviewerName || `Customer Review #${idx + 1}`}</span>
                        </span>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={review.isVerified !== false}
                              onChange={(e) => handleUpdateReview(idx, 'isVerified', e.target.checked)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                            />
                            <span>Verified Buyer</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={review.isActive !== false}
                              onChange={(e) => handleUpdateReview(idx, 'isActive', e.target.checked)}
                              className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>Active</span>
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!review.comment.trim()) return;
                              try {
                                const saved = await storeTemplateService.createReviewTemplate({
                                  category: 'custom',
                                  title: review.reviewerName.trim()
                                    ? `${review.reviewerName.trim()} (${review.rating || 5}★)`
                                    : `Review #${idx + 1}`,
                                  reviewerName: review.reviewerName.trim() || 'Verified Buyer',
                                  rating: Number(review.rating || 5),
                                  reviewDateLabel: review.reviewDateLabel?.trim() || '3 days ago',
                                  isVerified: review.isVerified !== false,
                                  commentTemplate: extractBrandToken(review.comment, form.name),
                                });
                                setReviewTemplates((prev) => [saved, ...prev]);
                                toast.success(t('Saved to Review Library!'));
                              } catch {
                                toast.error(t('Failed to save template'));
                              }
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition cursor-pointer inline-flex items-center gap-1"
                            title={t('Save to Library')}
                          >
                            <BookmarkPlus size={12} />
                            <span>{t('Save to Library')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveReview(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                            title="Remove Review"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          Select / Search Saved Reviewer
                        </label>
                        <ReviewerPicker
                          selectedName={review.reviewerName}
                          onSelect={(profile) => {
                            setForm((prev) => {
                              const updated = [...prev.customerReviews];
                              updated[idx] = {
                                ...updated[idx],
                                reviewerProfileId: profile.id,
                                reviewerName: profile.name,
                                reviewerAvatar: profile.avatarUrl || '',
                                isVerified: profile.isVerified,
                              };
                              return { ...prev, customerReviews: updated };
                            });
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Reviewer Name *</label>
                          <input
                            type="text"
                            value={review.reviewerName}
                            onChange={(e) => handleUpdateReview(idx, 'reviewerName', e.target.value)}
                            placeholder="e.g. Jessica L."
                            className={`${inputClass} text-xs`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Star Rating (1 - 5)</label>
                          <AdminSearchableSelect
                            value={String(review.rating)}
                            searchable={false}
                            onChange={(val) => handleUpdateReview(idx, 'rating', Number(val))}
                            options={[
                              { value: '5', label: '5 Stars (★★★★★)' },
                              { value: '4', label: '4 Stars (★★★★☆)' },
                              { value: '3', label: '3 Stars (★★★☆☆)' },
                              { value: '2', label: '2 Stars (★★☆☆☆)' },
                              { value: '1', label: '1 Star (★☆☆☆☆)' },
                            ]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Date Label</label>
                          <input
                            type="text"
                            value={review.reviewDateLabel || ''}
                            onChange={(e) => handleUpdateReview(idx, 'reviewDateLabel', e.target.value)}
                            placeholder="e.g. 2 days ago, 1 week ago"
                            className={`${inputClass} text-xs`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                        <div className="space-y-1">
                          <ImageUpload
                            label="Reviewer Avatar"
                            value={review.reviewerAvatar || ''}
                            onChange={(url) => handleUpdateReview(idx, 'reviewerAvatar', url)}
                            folder="avatars"
                            aspectRatio="square"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] font-bold text-slate-700">Review Comment *</label>
                            <button
                              type="button"
                              onClick={() =>
                                setReviewLibraryState({
                                  open: true,
                                  mode: 'replace-single',
                                  targetIndex: idx,
                                })
                              }
                              className="px-2 py-0.5 rounded-md text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 inline-flex items-center gap-1 cursor-pointer transition"
                            >
                              <BookOpen size={11} />
                              <span>{t('Pick from Review Library')}</span>
                            </button>
                          </div>
                          <textarea
                            rows={3}
                            value={review.comment}
                            onChange={(e) => handleUpdateReview(idx, 'comment', e.target.value)}
                            placeholder="Saved big on my skincare routine with coupons. The code worked perfectly!"
                            className={`${inputClass} text-xs resize-y leading-relaxed`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddReview}
                    className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Another Review</span>
                  </button>
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </form>
      ) : (
        /* LIVE CLIENT STORE PAGE PREVIEW (1:1 with /store/[slug]) */
        <AdminDevicePreviewFrame
          title="Client Store Landing Page Preview"
          urlPath={`/store/${form.slug || 'store-name'}`}
        >
          {(device) => {
            const isDesktop = device === 'desktop';
            const isMobile = device === 'mobile';
            const displayStoreName = form.name.trim() || 'Store Name Preview';
            const displayDesc =
              form.shortDescription?.trim() ||
              `Browse verified promo codes and active deals from ${displayStoreName}.`;
            const previewTags =
              form.tags && form.tags.length > 0 ? form.tags : [displayStoreName];
            const previewFaqs =
              form.faqs.length > 0 ? form.faqs : buildDefaultStoreFaqs(displayStoreName);
            const previewSearches =
              parsePopularSearchesText(form.popularSearchesText).length > 0
                ? parsePopularSearchesText(form.popularSearchesText)
                : buildDefaultPopularSearches(displayStoreName);

            return (
              <div className={isMobile ? 'p-3 space-y-3.5' : 'p-5 sm:p-6 space-y-5 max-w-6xl mx-auto'}>
                {/* Breadcrumb */}
                <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Home</span>
                  <span>›</span>
                  <span>Stores</span>
                  <span>›</span>
                  <span className="text-slate-800 font-semibold truncate">{displayStoreName} Coupons</span>
                </nav>

                {/* Main Layout: Desktop 12-col (4 sticky left + 8 right), iPad/Mobile stacked */}
                <div className={isDesktop ? 'grid grid-cols-12 gap-5 items-start' : 'space-y-4'}>
                  {/* LEFT SIDEBAR: Store Brand Card + Active Offers Stats */}
                  <aside className={isDesktop ? 'col-span-4 space-y-4' : 'space-y-3'}>
                    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs ${isDesktop ? 'text-center' : 'text-left'}`}>
                      {form.bannerUrl && isDesktop && (
                        <div className="w-full h-24 overflow-hidden relative bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={form.bannerUrl}
                            alt={`${displayStoreName} banner`}
                            className="w-full h-full object-cover opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        </div>
                      )}

                      <div className={`${isDesktop ? 'p-5' : 'p-3.5'} ${form.bannerUrl && isDesktop ? '-mt-11 pt-0 relative z-10' : ''} space-y-3`}>
                        <div className={isDesktop ? 'space-y-2.5' : 'flex items-center gap-3'}>
                          <div
                            className={`${
                              isDesktop ? 'w-20 h-20 mx-auto rounded-2xl' : 'w-12 h-12 rounded-xl'
                            } overflow-hidden flex items-center justify-center shadow-md border-2 border-white bg-slate-900 text-white shrink-0`}
                          >
                            {form.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={form.logoUrl} alt={displayStoreName} className="w-full h-full object-cover" />
                            ) : (
                              <span className={`font-black ${isDesktop ? 'text-2xl' : 'text-sm'}`}>
                                {displayStoreName.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h1 className={`font-black text-slate-950 ${isDesktop ? 'text-lg' : 'text-base truncate'}`}>
                              {displayStoreName}
                            </h1>
                            <div className={`flex items-center ${isDesktop ? 'justify-center' : 'justify-start'} gap-1 text-[11px] text-slate-500`}>
                              <span className="text-amber-400">★</span>
                              <span className="font-bold text-slate-800">{Number(form.rating || 4.8).toFixed(1)}</span>
                              <span>/ {(form.reviewsCount ?? 0).toLocaleString()} ratings</span>
                            </div>
                          </div>
                        </div>

                        <p className={`text-xs text-slate-500 leading-relaxed line-clamp-3 pt-2 border-t border-slate-100 ${isDesktop ? 'text-center' : 'text-left'}`}>
                          {displayDesc}
                        </p>

                        {previewTags.length > 0 && (
                          <div className={`flex flex-wrap gap-1.5 ${isDesktop ? 'justify-center' : 'justify-start'}`}>
                            {previewTags.slice(0, 6).map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80"
                              >
                                #{tag.replace(/^#+/, '')}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className={isDesktop ? 'flex flex-col gap-2 pt-1' : 'grid grid-cols-2 gap-2 pt-1'}>
                          <span className="w-full py-2 px-3 bg-slate-900 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 truncate">
                            <span className="truncate">Visit Official {displayStoreName}</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </span>
                          <span className="w-full py-2 px-3 rounded-lg border border-brand-primary text-brand-primary font-bold text-[11px] flex items-center justify-center gap-1.5 truncate">
                            <span>Get Coupon Alert</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isDesktop && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2 text-xs">
                        <h4 className="font-black text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider text-[11px]">
                          2 Active Offers
                        </h4>
                        <div className="flex justify-between text-slate-600">
                          <span>Coupon Codes:</span>
                          <span className="font-bold text-slate-900">2</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Best Offer:</span>
                          <span className="font-black text-brand-primary">{form.maxDiscount || 'Up to 50% OFF'}</span>
                        </div>
                      </div>
                    )}
                  </aside>

                  {/* RIGHT STREAM: Filter Bar + Sample Offers + Trust Strip + About + FAQs + Popular Searches */}
                  <div className={isDesktop ? 'col-span-8 space-y-4' : 'space-y-3.5'}>
                    {/* Filter Tabs */}
                    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs">
                      <div className="flex items-center gap-1">
                        <span className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-brand-primary text-white">All (2)</span>
                        <span className="px-3 py-1.5 rounded-lg font-bold text-[11px] text-slate-600">Codes (2)</span>
                        <span className="px-3 py-1.5 rounded-lg font-bold text-[11px] text-slate-600">Deals (0)</span>
                      </div>
                      {!isMobile && (
                        <span className="flex items-center gap-1 pr-2 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck size={13} className="text-emerald-600" />
                          <span>Hand-tested &amp; verified</span>
                        </span>
                      )}
                    </div>

                    {/* Sample #1 Top Offer Card */}
                    <div className={`bg-white border-2 border-emerald-500/45 rounded-xl p-4 shadow-sm flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between gap-4'}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0">
                          {form.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.logoUrl} alt={displayStoreName} className="w-full h-full object-contain" />
                          ) : (
                            <span className="font-black text-xs text-slate-700">{displayStoreName.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-sm font-black text-slate-900 leading-snug">
                            {form.maxDiscount || '25% Off'} {displayStoreName} Exclusive Promo Code
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="font-extrabold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">CODE</span>
                            <span className="font-bold text-emerald-700">✓ Verified</span>
                            <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">★ Exclusive</span>
                          </div>
                        </div>
                      </div>
                      <GetCodeButton code="SAVE25" isCode={true} highlight={true} size="md" fullWidth={isMobile} />
                    </div>

                    {/* Trust Value Props Strip */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-0 divide-x divide-slate-100'}`}>
                        <div className="flex items-center gap-2 pr-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <ShieldCheck size={14} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-[11px] font-bold text-slate-900 leading-tight">Hand-Tested</h5>
                            <p className="text-[10px] text-slate-500 truncate">Verified carts</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 ${isMobile ? '' : 'px-2.5'}`}>
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Clock size={14} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-[11px] font-bold text-slate-900 leading-tight">Live Audited</h5>
                            <p className="text-[10px] text-slate-500 truncate">Daily sync</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 ${isMobile ? 'pt-2 border-t border-slate-100' : 'px-2.5'}`}>
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Tag size={14} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-[11px] font-bold text-slate-900 leading-tight">Direct Links</h5>
                            <p className="text-[10px] text-slate-500 truncate">Official offers</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 ${isMobile ? 'pt-2 border-t border-slate-100' : 'pl-2.5'}`}>
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Users size={14} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-[11px] font-bold text-slate-900 leading-tight">Editorial</h5>
                            <p className="text-[10px] text-slate-500 truncate">Zero fake codes</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About Store + FAQs */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h2 className="text-base font-black text-slate-900">About {displayStoreName}</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Merchant overview and coupon verification details.</p>
                      </div>
                      <div
                        className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{
                          __html: form.description || `<p>${displayDesc}</p>`,
                        }}
                      />

                      {previewFaqs.length > 0 && (
                        <div className="space-y-2.5 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <HelpCircle size={15} className="text-emerald-600 shrink-0" />
                            <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-slate-900`}>
                              Frequently Asked Questions About {displayStoreName}
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {previewFaqs.map((faq, idx) => (
                              <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1">
                                <p className="text-xs font-bold text-slate-900">{faq.question}</p>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Popular Searches */}
                    {previewSearches.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
                        <h4 className="text-xs font-black text-slate-900">
                          Popular Searches Related to {displayStoreName} Coupons
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {previewSearches.map((q, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50/70 border border-emerald-200"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full-Width Customer Reviews Preview */}
                <StoreCustomerReviewsSection
                  storeName={displayStoreName}
                  rating={form.rating}
                  reviewCount={form.reviewsCount ?? 0}
                  ratingBreakdown={form.ratingBreakdown}
                  reviews={form.customerReviews}
                  previewDevice={device}
                />
              </div>
            );
          }}
        </AdminDevicePreviewFrame>
      )}

      <FaqLibraryModal
        isOpen={faqLibraryOpen}
        onClose={() => setFaqLibraryOpen(false)}
        brandName={form.name}
        onTemplatesChange={(list) => {
          syncFaqTemplates(list);
          if (!faqsTouchedRef.current) {
            setForm((prev) => ({
              ...prev,
              faqs: storeTemplateService.getDefaultFaqsForBrand(prev.name, list),
            }));
          }
        }}
        onInsertFaqs={(pickedFaqs) => {
          if (pickedFaqs.length === 0) return;
          setFaqsTouched(true);
          faqsTouchedRef.current = true;
          setForm((prev) => ({
            ...prev,
            faqs: [...prev.faqs, ...pickedFaqs],
          }));
        }}
      />

      <ReviewLibraryModal
        isOpen={reviewLibraryState.open}
        onClose={() =>
          setReviewLibraryState({ open: false, mode: 'append', targetIndex: null })
        }
        brandName={form.name}
        mode={reviewLibraryState.mode}
        onTemplatesChange={setReviewTemplates}
        onInsertReviews={(pickedReviews) => {
          if (pickedReviews.length === 0) return;
          if (
            reviewLibraryState.mode === 'replace-single' &&
            reviewLibraryState.targetIndex !== null
          ) {
            const picked = pickedReviews[0];
            const idx = reviewLibraryState.targetIndex;
            setForm((prev) => {
              const updated = [...prev.customerReviews];
              const existingCard = updated[idx];
              if (!existingCard) return prev;
              updated[idx] = {
                ...existingCard,
                reviewerName: picked.reviewerName,
                isVerified: picked.isVerified,
                rating: picked.rating,
                reviewDateLabel: picked.reviewDateLabel,
                comment: picked.comment,
              };
              return { ...prev, customerReviews: updated };
            });
          } else {
            setForm((prev) => ({
              ...prev,
              customerReviews: [...prev.customerReviews, ...pickedReviews],
            }));
          }
        }}
      />
    </AdminFormPage>
  );
}
