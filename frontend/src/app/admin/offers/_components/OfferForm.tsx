'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowDown, ArrowUp, BadgePercent, Calendar, Copy, ExternalLink, GripVertical, Infinity as InfinityIcon, Loader2, ShieldCheck, Sparkles, Star, Tag } from 'lucide-react';
import AdminFormPage, {
  FormLoading,
  FormNotFound,
  FormSection,
  inputClass,
  labelClass,
} from '@/components/admin/AdminFormPage';
import ImageUpload from '@/components/admin/ImageUpload';
import TagInput from '@/components/admin/TagInput';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import AdminDevicePreviewFrame, { AdminEditPreviewTabs } from '@/components/admin/AdminDevicePreviewFrame';
import GetCodeButton from '@/components/deals/GetCodeButton';
import { ROUTES } from '@/constants/routes';
import { SITE_NAME, SITE_SLUG } from '@/constants/site';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { offerService, type AdminOfferPayload } from '@/services/offerService';
import { type OfferItem } from '../_lib/data';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';

interface OfferFormState {
  storeId?: number;
  storeName: string;
  offerType: 'coupon' | 'deal';
  title: string;
  couponCode: string;
  discountAmount: string;
  discountUnit: 'percentage' | 'fixed' | 'free_shipping';
  destinationUrl: string;
  isExclusive: boolean;
  isActive: boolean;
  isVerified: boolean;
  terms: string;
  imageUrl: string;
  tags?: string[];
  hasExpiration: boolean;
  startDate: string;
  expireDate: string;
  sortOrder: number;
}

const FORM_ID = 'offer-form';

export default function OfferForm({ id }: { id?: string }) {
  return (
    <Suspense fallback={<FormLoading />}>
      <OfferFormContent id={id} />
    </Suspense>
  );
}

function OfferFormContent({ id }: { id?: string }) {
  const searchParams = useSearchParams();
  const storeParam = searchParams.get('store');
  const isEdit = id !== undefined;

  const [offerData, setOfferData] = useState<OfferItem | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !id) return;
    let mounted = true;

    offerService.getAdminOfferById(id)
      .then((data) => {
        if (!mounted) return;
        if (data && data.name) {
          const discountStr = data.discountValue || '15% Off';

          const mapped: OfferItem = {
            id: Number(data.id),
            storeId: Number(data.storeId),
            storeName: data.storeName || 'Merchant Partner',
            storeSlug: data.storeSlug || '',
            title: data.name,
            discount: discountStr,
            couponCode: data.code || null,
            offerType: data.code ? 'coupon' : 'deal',
            isExclusive: Boolean(data.isExclusive),
            isActive: data.isActive !== false,
            isVerified: Boolean(data.isVerified),
            usesCount: 0,
            destinationUrl: data.urlRef || `/out/${data.id}`,
            terms: data.description || 'Valid on regular priced items.',
            imageUrl: data.image || (data as any).imageUrl || undefined,
            tags: Array.isArray(data.tags) ? data.tags : [],
            hasExpiration: Boolean(data.hasExpiration || data.startAt || data.expireAt),
            startAt: data.startAt ?? null,
            expireAt: data.expireAt ?? null,
            sortOrder: data.sortOrder ?? 0,
          };
          setOfferData(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch offer detail from backend:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, isEdit]);

  if (isEdit && loading) return <FormLoading />;
  if (isEdit && !offerData && !loading) return <FormNotFound backHref={ROUTES.ADMIN.OFFERS} entity="Offer" />;

  const initial: OfferFormState = offerData
    ? {
        storeId: offerData.storeId,
        storeName: offerData.storeName,
        offerType: offerData.offerType,
        title: offerData.title,
        couponCode: offerData.couponCode || '',
        discountAmount: offerData.discount.trim().toLowerCase().includes('free shipping')
          ? ''
          : offerData.discount.replace(/[^0-9.]/g, '') || '10',
        discountUnit: offerData.discount.trim().toLowerCase().includes('free shipping')
          ? 'free_shipping'
          : offerData.discount.includes('%')
            ? 'percentage'
            : 'fixed',
        destinationUrl: offerData.destinationUrl || `https://${offerData.storeSlug || 'store'}.com/?ref=${SITE_SLUG}`,
        isExclusive: offerData.isExclusive,
        isActive: offerData.isActive,
        isVerified: Boolean(offerData.isVerified),
        terms: offerData.terms || 'Valid on regular priced items.',
        imageUrl: offerData.imageUrl || '',
        tags: mergeBrandTag(offerData.tags || [], offerData.storeName),
        hasExpiration: Boolean(offerData.hasExpiration || offerData.startAt || offerData.expireAt),
        startDate: offerData.startAt ? new Date(offerData.startAt).toISOString().slice(0, 10) : '',
        expireDate: offerData.expireAt ? new Date(offerData.expireAt).toISOString().slice(0, 10) : '',
        sortOrder: offerData.sortOrder ?? 0,
      }
    : {
        storeId: undefined,
        storeName: storeParam || '',
        offerType: 'coupon',
        title: '',
        couponCode: '',
        discountAmount: '15',
        discountUnit: 'percentage',
        destinationUrl: '',
        isExclusive: false,
        isActive: true,
        isVerified: false,
        terms: 'Valid on regular priced items.',
        imageUrl: '',
        tags: storeParam ? [storeParam] : [],
        hasExpiration: false,
        startDate: '',
        expireDate: '',
        sortOrder: 0,
      };

  return <OfferFormInner key={offerData?.id ?? 'new'} id={id} existing={offerData ?? undefined} initial={initial} />;
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

function mergeBrandTag(tags: string[], brandName?: string, previousBrandName?: string): string[] {
  const prevKey = toTagKey(previousBrandName);
  const nextClean = (brandName || '').trim();
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

function sanitizeOfferUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^(https?:\/\/)+(https?:\/\/)/i, '$2');
}

const OFFER_FIELD_LABELS: Record<string, string> = {
  storeId: 'Merchant Store',
  title: 'Offer Title',
  couponCode: 'Coupon Promo Code',
  discountAmount: 'Discount Amount',
  destinationUrl: 'Destination URL (Tracking Link)',
};

function OfferFormInner({ id, existing, initial }: { id?: string; existing?: OfferItem; initial: OfferFormState }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [form, setForm] = useState<OfferFormState>(initial);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [autoBrandTag, setAutoBrandTag] = useState<string>(existing?.storeName?.trim() || initial.storeName?.trim() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stores, setStores] = useState<Array<{ id: number; name: string; slug: string; afWebsite?: string; logo?: string }>>(() => {
    if (existing?.storeName && existing?.storeId) {
      return [{ id: existing.storeId, name: existing.storeName, slug: existing.storeSlug || '', logo: existing.storeLogo || undefined }];
    }
    return [];
  });
  type StoreOrderEntry = {
    key: string;
    id?: number;
    title: string;
    discount: string;
    code?: string | null;
    isCurrent?: boolean;
  };
  const [storeOffersOrder, setStoreOffersOrder] = useState<StoreOrderEntry[]>([]);
  const [loadingStoreOrder, setLoadingStoreOrder] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [dragOrderIdx, setDragOrderIdx] = useState<number | null>(null);
  const [dragOverOrderIdx, setDragOverOrderIdx] = useState<number | null>(null);

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

  const loadStoresOnDemand = async () => {
    if (stores.length > 1) return;
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORES, { params: { size: 100 } });
      const list = res.data?.data?.content || res.data?.data;
      if (Array.isArray(list)) {
        const mappedStores = list.map((s: any) => ({
          id: Number(s.id),
          name: String(s.name),
          slug: String(s.slug),
          afWebsite: s.afWebsite || undefined,
          logo: s.logo || s.logoUrl || undefined,
        }));
        setStores(mappedStores);
        if (!form.storeId && form.storeName) {
          const matched = mappedStores.find(
            (s) =>
              s.name.toLowerCase() === form.storeName.toLowerCase() ||
              s.slug.toLowerCase() === form.storeName.toLowerCase()
          );
          if (matched) {
            setForm((prev) => ({
              ...prev,
              storeId: matched.id,
              storeName: matched.name,
              destinationUrl: !prev.destinationUrl && matched.afWebsite ? matched.afWebsite : prev.destinationUrl,
              imageUrl: !prev.imageUrl.trim() && matched.logo ? matched.logo : prev.imageUrl,
              tags: mergeBrandTag(prev.tags || [], matched.name, autoBrandTag || prev.storeName),
            }));
            setAutoBrandTag(matched.name);
          }
        } else if (form.storeId) {
          const matchedById = mappedStores.find((s) => s.id === form.storeId);
          if (matchedById?.logo) {
            setForm((prev) => ({
              ...prev,
              imageUrl: prev.imageUrl.trim() ? prev.imageUrl : matchedById.logo || '',
            }));
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadStoresOnDemand();
  }, []);

  useEffect(() => {
    let active = true;
    const storeId = form.storeId;
    if (!storeId) {
      setStoreOffersOrder([]);
      setOrderDirty(false);
      return;
    }

    setLoadingStoreOrder(true);
    offerService
      .getAdminOffers({
        storeId,
        page: 0,
        size: 50,
        sortBy: 'sortOrder',
        direction: 'asc',
      })
      .then((res) => {
        if (!active) return;
        const rows: StoreOrderEntry[] = (res.content || []).map((o) => ({
          key: String(o.id),
          id: Number(o.id),
          title: o.name || 'Offer',
          discount: o.discountValue || '',
          code: o.code || null,
          isCurrent: Boolean(existing?.id && Number(o.id) === Number(existing.id)),
        }));

        const hasCurrent = rows.some((r) => r.isCurrent);
        if (!hasCurrent) {
          rows.push({
            key: existing?.id ? String(existing.id) : '__new__',
            id: existing?.id ? Number(existing.id) : undefined,
            title: form.title.trim() || existing?.title || 'New Offer',
            discount: '',
            code: form.offerType === 'deal' ? null : (form.couponCode.trim().toUpperCase() || null),
            isCurrent: true,
          });
        }

        setStoreOffersOrder(rows);
        setOrderDirty(false);
        const curIdx = rows.findIndex((r) => r.isCurrent);
        if (curIdx >= 0) {
          setForm((prev) => ({ ...prev, sortOrder: curIdx + 1 }));
        }
      })
      .catch(() => {
        if (active) setStoreOffersOrder([]);
      })
      .finally(() => {
        if (active) setLoadingStoreOrder(false);
      });

    return () => {
      active = false;
    };
  }, [form.storeId, existing?.id]);

  const moveStoreOrderItem = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= storeOffersOrder.length ||
      toIdx >= storeOffersOrder.length
    ) {
      return;
    }
    const next = [...storeOffersOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setStoreOffersOrder(next);
    setOrderDirty(true);
    const curIdx = next.findIndex((item) => item.isCurrent);
    if (curIdx >= 0) {
      setForm((prev) => ({ ...prev, sortOrder: curIdx + 1 }));
    }
  };

  const discountFormatted =
    form.discountUnit === 'free_shipping'
      ? 'FREE SHIPPING'
      : form.discountUnit === 'percentage'
        ? `${form.discountAmount}% Off`
        : `$${form.discountAmount} Off`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (!form.storeId || Number(form.storeId) <= 0) {
      nextErrors.storeId = t('Please select a Merchant Store.');
    }
    if (!form.title.trim()) {
      nextErrors.title = t('Please enter the Offer Title.');
    }
    if (form.offerType === 'coupon' && !form.couponCode.trim()) {
      nextErrors.couponCode = t('Please enter the Coupon Promo Code (or switch Offer Type to Direct Deal).');
    }
    if (form.discountUnit !== 'free_shipping' && !form.discountAmount.trim()) {
      nextErrors.discountAmount = t('Please enter the Discount Amount.');
    }

    const selectedStore = stores.find((s) => s.id === form.storeId);
    const storeSlug = selectedStore ? selectedStore.slug : form.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let resolvedUrl = sanitizeOfferUrl(form.destinationUrl);
    if (!resolvedUrl || resolvedUrl === 'https://' || resolvedUrl === 'http://') {
      resolvedUrl = selectedStore?.afWebsite || (storeSlug ? `https://${storeSlug}.com/?ref=${SITE_SLUG}` : '');
    } else if (!/^https?:\/\//i.test(resolvedUrl) && !resolvedUrl.startsWith('/')) {
      resolvedUrl = `https://${resolvedUrl}`;
    }

    if (!resolvedUrl) {
      nextErrors.destinationUrl = t('Please enter the Destination URL (Tracking Link).');
    } else if (resolvedUrl.length > 500) {
      nextErrors.destinationUrl = t('Destination URL must not exceed 500 characters.');
    }
    if (form.title.trim().length > 255) {
      nextErrors.title = t('Offer title must not exceed 255 characters.');
    }
    if (form.couponCode.trim().length > 100) {
      nextErrors.couponCode = t('Coupon code must not exceed 100 characters.');
    }
    if (form.imageUrl && form.imageUrl.trim().startsWith('data:')) {
      nextErrors.imageUrl = t('Offer image cannot be a raw base64 string — please upload via the Upload button.');
    } else if (form.imageUrl && form.imageUrl.trim().length > 500) {
      nextErrors.imageUrl = t('Offer image URL must not exceed 500 characters.');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const fieldNames = Object.keys(nextErrors)
        .map((k) => t(OFFER_FIELD_LABELS[k] || k))
        .join(', ');
      toast.error(`${t('Please check required fields')}: ${fieldNames}`);
      scrollToField(firstKey);
      return;
    }

    if (form.hasExpiration && form.startDate && form.expireDate && form.expireDate < form.startDate) {
      toast.error(t('End date must be on or after start date.'));
      return;
    }

    const startAtIso =
      form.hasExpiration && form.startDate.trim()
        ? new Date(`${form.startDate.trim()}T00:00:00`).toISOString()
        : null;

    const expireAtIso =
      form.hasExpiration && form.expireDate.trim()
        ? new Date(`${form.expireDate.trim()}T23:59:59`).toISOString()
        : null;

    const backendPayload: AdminOfferPayload = {
      storeId: Number(form.storeId),
      name: form.title.trim(),
      discountValue: discountFormatted,
      code: form.offerType === 'deal' ? null : (form.couponCode.trim().toUpperCase() || null),
      urlRef: resolvedUrl,
      description: form.terms.trim() || null,
      isVerified: form.isVerified,
      isExclusive: form.isExclusive,
      isActive: form.isActive,
      sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
      image: form.imageUrl?.trim() || selectedStore?.logo || null,
      tags: mergeBrandTag(form.tags || [], selectedStore?.name || form.storeName),
      hasExpiration: form.hasExpiration,
      startAt: startAtIso,
      expireAt: expireAtIso,
    };

    try {
      let savedOfferId: number | undefined = existing?.id ? Number(existing.id) : undefined;
      if (existing && id) {
        const res = await apiClient.put(API_ENDPOINTS.ADMIN.OFFER_DETAIL(id), backendPayload);
        savedOfferId = Number(res.data?.data?.id ?? id);
        if (orderDirty && storeOffersOrder.length > 0) {
          const orderedIds = storeOffersOrder
            .map((item) => (item.isCurrent ? savedOfferId : item.id))
            .filter((val): val is number => typeof val === 'number' && val > 0);
          if (orderedIds.length > 0) {
            await apiClient.patch(API_ENDPOINTS.ADMIN.OFFERS_REORDER, { orderedIds });
          }
        }
        toast.success(res.data?.message || `Updated offer "${form.title}" successfully!`);
      } else {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN.OFFERS, backendPayload);
        savedOfferId = Number(res.data?.data?.id);
        if (savedOfferId && storeOffersOrder.length > 0) {
          const orderedIds = storeOffersOrder
            .map((item) => (item.isCurrent ? savedOfferId : item.id))
            .filter((val): val is number => typeof val === 'number' && val > 0);
          if (orderedIds.length > 0) {
            await apiClient.patch(API_ENDPOINTS.ADMIN.OFFERS_REORDER, { orderedIds });
          }
        }
        toast.success(res.data?.message || `Created offer "${form.title}" successfully!`);
      }
      router.push(ROUTES.ADMIN.OFFERS);
    } catch (err: any) {
      const rawErrors = err?.response?.data?.errors;
      const mappedErrors: Record<string, string> = {};
      if (rawErrors && typeof rawErrors === 'object') {
        const keyMap: Record<string, string> = {
          storeId: 'storeId',
          name: 'title',
          title: 'title',
          discountValue: 'discountAmount',
          code: 'couponCode',
          couponCode: 'couponCode',
          urlRef: 'destinationUrl',
          destinationUrl: 'destinationUrl',
        };
        for (const [k, v] of Object.entries(rawErrors)) {
          mappedErrors[keyMap[k] || k] = String(v);
        }
      }
      const msg = err?.response?.data?.message || err?.message || t('Failed to save offer.');
      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const fieldNames = Object.keys(mappedErrors)
          .map((k) => t(OFFER_FIELD_LABELS[k] || k))
          .join(', ');
        toast.error(`${t('Please check required fields')}: ${fieldNames} — ${mappedErrors[firstKey]}`);
        scrollToField(firstKey);
      } else {
        setErrors({ _form: msg });
        toast.error(msg);
      }
    }
  };

  const selectedStoreForPreview = stores.find((s) => s.id === form.storeId);
  const previewStoreSlug =
    selectedStoreForPreview?.slug ||
    existing?.storeSlug ||
    (form.storeName ? form.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'store');
  const previewStoreName = selectedStoreForPreview?.name || form.storeName || 'Merchant Partner';
  const previewOfferImage = form.imageUrl?.trim() || selectedStoreForPreview?.logo || '';
  const previewIsTopOffer =
    storeOffersOrder.length > 0
      ? storeOffersOrder.findIndex((i) => i.isCurrent) === 0
      : form.sortOrder === 1;

  return (
    <AdminFormPage
      title={existing ? `Edit Offer: ${existing.title}` : 'Create New Promotional Offer'}
      description="Configure discount voucher codes, merchant affiliate URLs, and offer visibility."
      backHref={ROUTES.ADMIN.OFFERS}
      backLabel="Back to offers"
      formId={FORM_ID}
      submitLabel={existing ? 'Save Offer' : 'Publish Offer'}
      headerActions={<AdminEditPreviewTabs activeTab={activeTab} onChange={setActiveTab} />}
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
                        {t(OFFER_FIELD_LABELS[fieldKey] || fieldKey)}:
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
            <FormSection title="Offer Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Merchant Store *</label>
                  <AdminSearchableSelect
                    data-field="storeId"
                    value={form.storeId ? String(form.storeId) : ''}
                    onOpen={loadStoresOnDemand}
                    error={Boolean(errors.storeId)}
                    placeholder="Select a Merchant Store"
                    searchPlaceholder="Search store..."
                    options={[
                      { value: '', label: 'Select a Merchant Store' },
                      ...stores.map((st) => ({ value: String(st.id), label: st.name })),
                    ]}
                    onChange={(val) => {
                      const sId = Number(val);
                      const foundStore = stores.find((s) => s.id === sId);
                      setForm((prev) => {
                        const prevStoreLogo = stores.find((s) => s.id === prev.storeId)?.logo || '';
                        const currentImg = prev.imageUrl.trim();
                        const shouldAutoSyncLogo = !currentImg || (Boolean(prevStoreLogo) && currentImg === prevStoreLogo);
                        const prevStoreUrl = stores.find((s) => s.id === prev.storeId)?.afWebsite || '';
                        const currentUrl = prev.destinationUrl.trim();
                        const shouldAutoSyncUrl = !currentUrl || currentUrl === 'https://' || (Boolean(prevStoreUrl) && currentUrl === prevStoreUrl);
                        return {
                          ...prev,
                          storeId: sId || undefined,
                          storeName: foundStore ? foundStore.name : '',
                          destinationUrl:
                            shouldAutoSyncUrl && foundStore?.afWebsite
                              ? foundStore.afWebsite
                              : prev.destinationUrl,
                          imageUrl: shouldAutoSyncLogo
                            ? (foundStore?.logo || '')
                            : prev.imageUrl,
                          tags: mergeBrandTag(prev.tags || [], foundStore?.name, autoBrandTag || prev.storeName),
                        };
                      });
                      setAutoBrandTag(foundStore?.name || '');
                      if (errors.storeId) setErrors((prev) => ({ ...prev, storeId: '' }));
                    }}
                  />
                  {errors.storeId && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.storeId}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Offer Type *</label>
                  <AdminSearchableSelect
                    value={form.offerType}
                    onChange={(val) => {
                      setForm({ ...form, offerType: val as 'coupon' | 'deal' });
                      if (errors.couponCode) setErrors((prev) => ({ ...prev, couponCode: '' }));
                    }}
                    options={[
                      { value: 'coupon', label: 'Coupon Code (Requires promo voucher)' },
                      { value: 'deal', label: 'Direct Deal (Auto-applied discount link)' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Offer Title *</label>
                <input
                  type="text"
                  data-field="title"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="e.g. 15% Off Sitewide On All LED Light Bars"
                  className={`${inputClass} ${errors.title ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                />
                {errors.title && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.title}
                  </p>
                )}
              </div>

              {form.offerType === 'coupon' && (
                <div className="space-y-1">
                  <label className={labelClass}>Coupon Promo Code *</label>
                  <input
                    type="text"
                    data-field="couponCode"
                    value={form.couponCode}
                    onChange={(e) => {
                      setForm({ ...form, couponCode: e.target.value.toUpperCase() });
                      if (errors.couponCode) setErrors((prev) => ({ ...prev, couponCode: '' }));
                    }}
                    placeholder="e.g. SAVE15NOW"
                    className={`${inputClass} font-mono font-bold tracking-wider ${errors.couponCode ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.couponCode && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.couponCode}
                    </p>
                  )}
                </div>
              )}
            </FormSection>

            <FormSection title="Discount & Destination URL">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>
                    {form.discountUnit === 'free_shipping' ? 'Discount Badge' : 'Discount Amount *'}
                  </label>
                  <input
                    type="text"
                    data-field="discountAmount"
                    disabled={form.discountUnit === 'free_shipping'}
                    value={form.discountUnit === 'free_shipping' ? 'FREE SHIPPING' : form.discountAmount}
                    onChange={(e) => {
                      setForm({ ...form, discountAmount: e.target.value });
                      if (errors.discountAmount) setErrors((prev) => ({ ...prev, discountAmount: '' }));
                    }}
                    placeholder="e.g. 15 or 50"
                    className={`${inputClass} ${form.discountUnit === 'free_shipping' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''} ${errors.discountAmount ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.discountAmount && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.discountAmount}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Discount Unit</label>
                  <AdminSearchableSelect
                    value={form.discountUnit}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        discountUnit: val as 'percentage' | 'fixed' | 'free_shipping',
                      })
                    }
                    options={[
                      { value: 'percentage', label: '% Percentage Off' },
                      { value: 'fixed', label: '$ Fixed USD Off' },
                      { value: 'free_shipping', label: 'Free Shipping' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Destination URL (Tracking Link) *</label>
                <input
                  type="url"
                  data-field="destinationUrl"
                  value={form.destinationUrl}
                  onChange={(e) => {
                    setForm({ ...form, destinationUrl: sanitizeOfferUrl(e.target.value) });
                    if (errors.destinationUrl) setErrors((prev) => ({ ...prev, destinationUrl: '' }));
                  }}
                  placeholder={`https://www.nilight.com/?pb_ref=${SITE_SLUG}`}
                  className={`${inputClass} font-mono ${errors.destinationUrl ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                />
                {errors.destinationUrl && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.destinationUrl}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Terms & Exclusions</label>
                <textarea
                  rows={3}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  placeholder="Valid on regular priced items only. Not combinable with clearance sales..."
                  className={inputClass}
                />
              </div>
            </FormSection>

            {/* Offer Taxonomy & Tags */}
            <FormSection
              title="Offer Taxonomy & Tags"
              description="Attach centralized tags (e.g. #deals, #black-friday, #tech) for unified discovery across review articles and store pages."
              headerRight={
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {t('Auto-generated from Brand Name')}
                </span>
              }
            >
              <TagInput
                tags={form.tags || []}
                onChange={(newTags) => setForm({ ...form, tags: newTags })}
                label="Offer Tags"
                placeholder="Type tag name and press Enter (e.g., deals, tech, apple, free-shipping...)"
                helperText="Automatically includes the selected Merchant Store brand name tag. You can also add extra promo tags."
              />
            </FormSection>
          </div>

          {/* Sidebar Column (Right - 1 Col) */}
          <div className="lg:col-span-1 space-y-6">
            <FormSection title="Offer Status & Flags">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Offer Active</span>
                    <span className="text-[11px] text-slate-400">Display publicly in store directory</span>
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
                    <span className="text-xs font-bold text-slate-800 block">Editor Verified Badge</span>
                    <span className="text-[11px] text-slate-400">Mark verified by {SITE_NAME} staff</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isVerified}
                    onChange={(e) => setForm({ ...form, isVerified: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Exclusive Deal</span>
                    <span className="text-[11px] text-slate-400">Highlight as exclusive partner deal</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isExclusive}
                    onChange={(e) => setForm({ ...form, isExclusive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                </label>
              </div>
            </FormSection>

            {/* Offer Expiration / Validity (Balanced in Right Sidebar) */}
            <FormSection
              title="Offer Expiration"
              description="Runs indefinitely or within a custom date range."
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, hasExpiration: false, startDate: '', expireDate: '' })}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      !form.hasExpiration
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <InfinityIcon size={13} />
                    <span>No Expiration</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      const defaultEnd =
                        form.expireDate ||
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                      setForm({
                        ...form,
                        hasExpiration: true,
                        startDate: form.startDate || today,
                        expireDate: defaultEnd,
                      });
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      form.hasExpiration
                        ? 'bg-brand-primary-soft border-brand-primary text-brand-primary shadow-2xs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar size={13} />
                    <span>Date Range</span>
                  </button>
                </div>

                {form.hasExpiration ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className={labelClass}>From Date</label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>To Date</label>
                        <input
                          type="date"
                          value={form.expireDate}
                          min={form.startDate || undefined}
                          onChange={(e) => setForm({ ...form, expireDate: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[7, 30, 90].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            const baseMs = form.startDate
                              ? new Date(`${form.startDate}T00:00:00`).getTime()
                              : Date.now();
                            const startStr = form.startDate || new Date().toISOString().slice(0, 10);
                            const target = new Date(baseMs + days * 24 * 60 * 60 * 1000)
                              .toISOString()
                              .slice(0, 10);
                            setForm({ ...form, hasExpiration: true, startDate: startStr, expireDate: target });
                          }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        >
                          +{days} days
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Ongoing offer — no expiration date shown.
                  </p>
                )}
              </div>
            </FormSection>

            {/* Product / Offer Image Section */}
            <FormSection title="Product / Offer Image">
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
                folder="stores"
                label="Promotional Image / Product Photo"
                description="Auto-selected from Store logo. Upload or pick a custom image to override."
              />
            </FormSection>

            {/* Live Voucher Preview */}
            <FormSection title="Customer Voucher Preview">
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {form.storeName || 'Merchant Partner'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {form.isVerified && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Verified
                      </span>
                    )}
                    {form.isExclusive && (
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        ★ Exclusive
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnail + Title Details */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 shrink-0 relative flex items-center justify-center">
                    {form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt="Offer preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                        {(form.storeName || 'ST').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-black text-slate-900 leading-tight">
                      {discountFormatted}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {form.title || 'Special discount offer on selected products'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {form.offerType === 'coupon' && form.couponCode ? (
                    <div className="bg-slate-100 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800">
                      {form.couponCode}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No code needed</span>
                  )}
                  <span className="text-[11px] font-bold text-brand-primary bg-brand-primary-soft px-2.5 py-1 rounded-lg">
                    Get Deal →
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                  <Calendar size={11} />
                  <span>
                    {form.hasExpiration && (form.startDate || form.expireDate)
                      ? form.startDate && form.expireDate
                        ? `Valid ${form.startDate} – ${form.expireDate}`
                        : form.expireDate
                        ? `Expires ${form.expireDate}`
                        : `Valid from ${form.startDate}`
                      : 'No expiration (Ongoing)'}
                  </span>
                </div>
              </div>
            </FormSection>
          </div>

        </div>
      </form>
      ) : (
        <AdminDevicePreviewFrame
          title="Client Store Offer & Coupon Popup Preview"
          urlPath={`/store/${previewStoreSlug}`}
        >
          {(device) => {
            const isMobile = device === 'mobile';
            const isTablet = device === 'tablet';
            const isCode = form.offerType === 'coupon';
            return (
              <div className={isMobile ? 'p-3.5 space-y-4' : isTablet ? 'p-5 space-y-5' : 'p-8 max-w-4xl mx-auto space-y-6'}>
                {/* 1. Store Coupon Card Preview */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t('Store Page Offer Card')} ({isMobile ? 'Mobile' : isTablet ? 'iPad' : 'Desktop'})
                  </p>
                  <div
                    className={`bg-white rounded-xl ${isMobile ? 'p-3.5 flex-col gap-3' : 'p-5 flex-row items-center justify-between gap-4'} transition-all flex ${
                      previewIsTopOffer
                        ? 'border-2 border-emerald-500/45 shadow-sm'
                        : 'border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white p-1.5 flex items-center justify-center`}>
                        {previewOfferImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewOfferImage}
                            alt={previewStoreName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-sm font-black text-slate-800">
                            {previewStoreName.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-black text-slate-900 leading-snug`}>
                          {form.title.trim() || `${discountFormatted} ${previewStoreName} Promo Offer`}
                        </h3>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                            {isCode ? <Tag size={10} /> : <Sparkles size={10} className="text-emerald-600" />}
                            <span>{isCode ? 'CODE' : 'DEAL'}</span>
                          </span>
                          {form.isVerified && (
                            <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1 px-1">
                              <ShieldCheck size={12} className="text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          )}
                          {form.isExclusive && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Star size={10} className="fill-amber-500 text-amber-500" />
                              <span>Exclusive</span>
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <BadgePercent size={11} className="text-brand-primary" />
                            <span>{discountFormatted}</span>
                          </span>
                        </div>

                        {form.hasExpiration && (form.startDate || form.expireDate) && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                            <Calendar size={11} />
                            <span>
                              {form.startDate && form.expireDate
                                ? `Valid ${form.startDate} – ${form.expireDate}`
                                : form.expireDate
                                ? `Expires ${form.expireDate}`
                                : `Valid from ${form.startDate}`}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={isMobile ? 'pt-2 border-t border-slate-100' : 'shrink-0'}>
                      <GetCodeButton
                        code={isCode ? (form.couponCode || 'SAVE15') : undefined}
                        isCode={isCode}
                        highlight={previewIsTopOffer}
                        size="md"
                        fullWidth={isMobile}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Coupon Reveal Popup Preview */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t('Coupon Modal Popup Preview')}
                  </p>
                  <div className={`bg-white border border-slate-200 rounded-2xl ${isMobile ? 'p-4' : 'p-6'} shadow-md max-w-md mx-auto text-center space-y-4`}>
                    <div className="w-14 h-14 mx-auto rounded-2xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shadow-2xs">
                      {previewOfferImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewOfferImage} alt={previewStoreName} className="w-full h-full object-contain" />
                      ) : (
                        <span className="font-black text-slate-800">{previewStoreName.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                        {previewStoreName}
                      </span>
                      <h4 className="text-base font-black text-slate-900 leading-snug">
                        {form.title.trim() || `${discountFormatted} ${previewStoreName} Promo Offer`}
                      </h4>
                    </div>

                    {isCode ? (
                      <div className="flex items-center justify-between gap-2 p-2 pl-4 rounded-xl border-2 border-dashed border-brand-primary/40 bg-brand-primary/5">
                        <span className="font-mono text-base font-black tracking-widest text-slate-900">
                          {form.couponCode || 'SAVE15'}
                        </span>
                        <span className="px-3.5 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold inline-flex items-center gap-1.5">
                          <Copy size={13} /> Copy Code
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                        ✓ Deal Activated — No Coupon Code Required
                      </div>
                    )}

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {form.terms || 'Valid on regular priced items.'}
                    </p>

                    <div className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5">
                      <span>Go to {previewStoreName}</span>
                      <ExternalLink size={13} />
                    </div>
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
