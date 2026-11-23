'use client';

import { useState, useEffect } from 'react';
import {
  X,
  GripVertical,
  LayoutGrid,
  Save,
  Loader2,
  Search,
  Star,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';

interface MatrixStoreItem {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  categoryName?: string;
  activeOffersCount: number;
  isFeatured: boolean;
  isActive: boolean;
  ratingScore?: number;
}

interface StoreOrderMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function StoreOrderMatrixModal({
  isOpen,
  onClose,
  onSaved,
}: StoreOrderMatrixModalProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();

  const [items, setItems] = useState<MatrixStoreItem[]>([]);
  const [originalItems, setOriginalItems] = useState<MatrixStoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setDirty(false);
    setHighlightQuery('');

    apiClient
      .get(API_ENDPOINTS.ADMIN.STORES, {
        params: {
          page: 0,
          size: 200,
          sortBy: 'sortOrder',
          direction: 'asc',
        },
      })
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.content || res.data?.data || [];
        const mapped: MatrixStoreItem[] = Array.isArray(list)
          ? list.map((s: any) => ({
              id: Number(s.id),
              name: String(s.name || ''),
              slug: String(s.slug || ''),
              logo: s.logo || s.logoUrl || undefined,
              categoryName: s.categoryName || s.category || 'General',
              activeOffersCount: Number(s.activeOffersCount ?? 0),
              isFeatured: Boolean(s.isFeatured || s.featured),
              isActive: s.isActive !== false,
              ratingScore: s.ratingScore != null ? Number(s.ratingScore) : undefined,
            }))
          : [];
        setItems(mapped);
        setOriginalItems(mapped);
      })
      .catch(() => {
        if (active) {
          toast.error('Failed to load stores for ordering');
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, toast]);

  if (!isOpen) return null;

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

  const handleSave = async () => {
    if (saving || items.length === 0) return;
    setSaving(true);
    try {
      await apiClient.patch(API_ENDPOINTS.ADMIN.STORES_REORDER, {
        orderedIds: items.map((s) => s.id),
      });
      toast.success(t('Updated store display order!'));
      setOriginalItems(items);
      setDirty(false);
      onSaved?.();
      onClose();
    } catch {
      toast.error(t('Failed to update store order'));
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
                  {t('Arrange Store Display Matrix')}
                </h2>
                <span className="text-[11px] font-bold bg-brand-primary text-white px-2.5 py-0.5 rounded-full">
                  {items.length} {t('Stores')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Drag and drop store cards into any slot (#1 → #N) to set their display priority on the client directory.')}
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

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              placeholder={t('Highlight store by name...')}
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

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
              <GripVertical size={12} />
              {t('Drag any card to swap position')}
            </span>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/40">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Loader2 size={26} className="animate-spin text-brand-primary" />
              <span className="text-xs font-semibold">{t('Loading stores...')}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('No stores available to arrange.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {items.map((store, idx) => {
                const isMatch =
                  Boolean(normalizedQuery) &&
                  (store.name.toLowerCase().includes(normalizedQuery) ||
                    store.slug.toLowerCase().includes(normalizedQuery));
                const isDimmed = Boolean(normalizedQuery) && !isMatch;
                const isDragSource = dragIndex === idx;
                const isDragTarget = dragOverIndex === idx && dragIndex !== idx;

                return (
                  <div
                    key={store.id}
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
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    } ${isDragSource ? 'opacity-40 scale-95' : ''} ${isDimmed ? 'opacity-35' : ''}`}
                  >
                    {/* Top row: Rank badge + Grip + Featured */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                          idx === 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : idx < 3
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        #{idx + 1}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {store.isFeatured && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            ★
                          </span>
                        )}
                        {!store.isActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            Off
                          </span>
                        )}
                        <GripVertical
                          size={15}
                          className="text-slate-400 group-hover:text-brand-primary transition"
                        />
                      </div>
                    </div>

                    {/* Store Logo + Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-11 rounded-xl border border-slate-200 bg-white p-1 overflow-hidden flex items-center justify-center shrink-0">
                        {store.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={store.logo}
                            alt={store.name}
                            className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none"
                          />
                        ) : (
                          <span className="font-black text-xs text-slate-700">
                            {store.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {store.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {store.categoryName}
                        </p>
                      </div>
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Tag size={10} className="text-brand-primary" />
                        {store.activeOffersCount} offers
                      </span>
                      {store.ratingScore != null && (
                        <span className="inline-flex items-center gap-0.5 font-bold text-slate-700">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          {store.ratingScore.toFixed(1)}
                        </span>
                      )}
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
              <span>{t('Order matches live store directory.')}</span>
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
