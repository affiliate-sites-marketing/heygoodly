'use client';

import { useState, useEffect } from 'react';
import {
  X,
  GripVertical,
  LayoutGrid,
  Save,
  Loader2,
  Search,
  Tag,
  Sparkles,
  Star,
  RotateCcw,
  Store as StoreIcon,
} from 'lucide-react';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { offerService } from '@/services/offerService';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import {
  OFFER_AUTO_SORT_OPTIONS,
  sortOffersAuto,
  type OfferAutoSortRule,
} from '@/utils/offerAutoSort';

interface StoreOption {
  id: number;
  name: string;
}

interface MatrixOfferItem {
  id: number;
  title: string;
  discount: string;
  code: string | null;
  isExclusive: boolean;
  isVerified?: boolean;
  isActive: boolean;
  usesCount?: number;
  expireAt?: string | null;
  imageUrl?: string;
}

interface OfferOrderMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStoreId?: number;
  onSaved?: () => void;
}

export default function OfferOrderMatrixModal({
  isOpen,
  onClose,
  initialStoreId,
  onSaved,
}: OfferOrderMatrixModalProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    initialStoreId ? String(initialStoreId) : ''
  );
  const [items, setItems] = useState<MatrixOfferItem[]>([]);
  const [originalItems, setOriginalItems] = useState<MatrixOfferItem[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load store options when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setHighlightQuery('');
    setDirty(false);

    if (initialStoreId) {
      setSelectedStoreId(String(initialStoreId));
    }

    setLoadingStores(true);
    apiClient
      .get(API_ENDPOINTS.ADMIN.STORES, { params: { page: 0, size: 200, sortBy: 'name', direction: 'asc' } })
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.content || res.data?.data || [];
        const mapped: StoreOption[] = Array.isArray(list)
          ? list.map((s: any) => ({ id: Number(s.id), name: String(s.name || '') }))
          : [];
        setStores(mapped);
        if (!initialStoreId && mapped.length > 0) {
          setSelectedStoreId((prev) => prev || String(mapped[0].id));
        }
      })
      .catch(() => {
        if (active) setStores([]);
      })
      .finally(() => {
        if (active) setLoadingStores(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, initialStoreId]);

  // Load offers whenever selectedStoreId changes
  useEffect(() => {
    if (!isOpen || !selectedStoreId) {
      setItems([]);
      setOriginalItems([]);
      return;
    }
    let active = true;
    setLoadingOffers(true);
    setDirty(false);
    setDragIndex(null);
    setDragOverIndex(null);

    offerService
      .getAdminOffers({
        storeId: Number(selectedStoreId),
        page: 0,
        size: 100,
        sortBy: 'sortOrder',
        direction: 'asc',
      })
      .then((res) => {
        if (!active) return;
        const mapped: MatrixOfferItem[] = (res.content || []).map((o) => ({
          id: Number(o.id),
          title: o.name || 'Offer',
          discount: o.discountValue || '',
          code: o.code || null,
          isExclusive: Boolean(o.isExclusive),
          isVerified: Boolean(o.isVerified),
          isActive: o.isActive !== false,
          usesCount: Number((o as any).usesCount ?? 0),
          expireAt: (o as any).expireAt || null,
          imageUrl: o.image || o.imageUrl || o.storeLogo || undefined,
        }));
        setItems(mapped);
        setOriginalItems(mapped);
      })
      .catch(() => {
        if (active) {
          toast.error('Failed to load store offers');
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setLoadingOffers(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedStoreId, toast]);

  if (!isOpen) return null;

  const selectedStoreName =
    stores.find((s) => String(s.id) === selectedStoreId)?.name || '';

  const handleDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIdx, 0, moved);
    setItems(next);
    setDirty(true);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleReset = () => {
    setItems(originalItems);
    setDirty(false);
  };

  const handleAutoSort = (rule: OfferAutoSortRule) => {
    if (items.length <= 1) return;
    const sorted = sortOffersAuto(items, rule);
    setItems(sorted);
    setDirty(true);
    toast.success(t('Auto-sorted offers! Click Save Order to apply.'));
  };

  const handleSave = async () => {
    if (saving || items.length === 0) return;
    setSaving(true);
    try {
      await apiClient.patch(API_ENDPOINTS.ADMIN.OFFERS_REORDER, {
        orderedIds: items.map((o) => o.id),
      });
      toast.success(t('Updated offer display order!'));
      setOriginalItems(items);
      setDirty(false);
      onSaved?.();
      onClose();
    } catch {
      toast.error(t('Failed to update offer order'));
    } finally {
      setSaving(false);
    }
  };

  const normalizedQuery = highlightQuery.trim().toLowerCase();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
              <LayoutGrid size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {t('Arrange Offer Order by Store')}
                </h2>
                {selectedStoreName && (
                  <span className="text-[11px] font-bold bg-brand-primary text-white px-2.5 py-0.5 rounded-full">
                    {selectedStoreName} • {items.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Pick a store, then drag & drop offers into slots #1 → #N (#1 gets the highlighted Top Offer CTA on the store page).')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Store Selector + Auto-Sort + Highlight Search Toolbar */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <StoreIcon size={15} className="text-brand-primary shrink-0" />
            <AdminSearchableSelect
              value={selectedStoreId}
              onChange={(val) => setSelectedStoreId(val)}
              disabled={loadingStores}
              placeholder={loadingStores ? 'Loading stores...' : 'Select a Merchant Store...'}
              searchPlaceholder="Search store..."
              options={stores.map((st) => ({ value: String(st.id), label: st.name }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500 shrink-0" />
            <AdminSearchableSelect
              value=""
              searchable={false}
              disabled={loadingOffers || items.length <= 1}
              onChange={(val) => {
                if (val) handleAutoSort(val as OfferAutoSortRule);
              }}
              placeholder={t('⚡ Auto-Sort Coupons...')}
              options={OFFER_AUTO_SORT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.label),
              }))}
            />
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              placeholder={t('Highlight offer by title or code...')}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
            {highlightQuery && (
              <button
                type="button"
                onClick={() => setHighlightQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/40">
          {!selectedStoreId ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('Select a store above to arrange its offers.')}
            </div>
          ) : loadingOffers ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Loader2 size={26} className="animate-spin text-brand-primary" />
              <span className="text-xs font-semibold">{t('Loading store offers...')}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('This store has no offers yet.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {items.map((offer, idx) => {
                const isMatch =
                  Boolean(normalizedQuery) &&
                  (offer.title.toLowerCase().includes(normalizedQuery) ||
                    (offer.code || '').toLowerCase().includes(normalizedQuery));
                const isDimmed = Boolean(normalizedQuery) && !isMatch;
                const isDragSource = dragIndex === idx;
                const isDragTarget = dragOverIndex === idx && dragIndex !== idx;
                const isTop = idx === 0;

                return (
                  <div
                    key={offer.id}
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (dragIndex === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === idx) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(idx);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`group relative rounded-2xl border bg-white p-3.5 transition-all cursor-grab active:cursor-grabbing select-none flex flex-col gap-2.5 ${
                      isDragTarget
                        ? 'border-brand-primary ring-2 ring-brand-primary/40 bg-brand-primary/5 scale-[1.02] shadow-md'
                        : isMatch
                          ? 'border-amber-400 ring-2 ring-amber-400/35 shadow-sm'
                          : isTop
                            ? 'border-emerald-500/45 hover:border-emerald-500/70 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    } ${isDragSource ? 'opacity-40 scale-95' : ''} ${isDimmed ? 'opacity-35' : ''}`}
                  >
                    {/* Top row: Rank badge + Top badge + Grip */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                            isTop
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : idx < 3
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        {isTop && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">
                            Top Offer
                          </span>
                        )}
                        {offer.isExclusive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-0.5">
                            <Star size={9} className="fill-amber-500 text-amber-500" />
                          </span>
                        )}
                      </div>
                      <GripVertical
                        size={15}
                        className="text-slate-400 group-hover:text-brand-primary transition shrink-0"
                      />
                    </div>

                    {/* Thumbnail + Offer Title */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl border border-slate-200 bg-white p-1 overflow-hidden flex items-center justify-center shrink-0">
                        {offer.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={offer.imageUrl}
                            alt={offer.title}
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <Tag size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {offer.title}
                        </p>
                      </div>
                    </div>

                    {/* Footer: Code/Deal + Discount */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px]">
                      {offer.code ? (
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[130px]">
                          {offer.code}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          <Sparkles size={10} /> Deal
                        </span>
                      )}
                      <span className="font-black text-brand-primary shrink-0">
                        {offer.discount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {dirty ? (
              <span className="font-semibold text-amber-600">
                {t('Unsaved order changes — click Save Order to apply.')}
              </span>
            ) : (
              <span>{t('Order matches live store page.')}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{t('Reset')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {t('Cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{t('Save Order')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
