'use client';

import { useState, useEffect } from 'react';
import {
  X,
  GripVertical,
  LayoutGrid,
  Save,
  Loader2,
  Search,
  BookOpen,
  RotateCcw,
  Layers,
  Eye,
} from 'lucide-react';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';

interface CategoryOption {
  id: number;
  name: string;
  slug?: string;
}

interface MatrixPostItem {
  id: number;
  title: string;
  slug: string;
  imageUrl?: string;
  status: string;
  isHero: boolean;
  isFeatured: boolean;
  views: number;
}

interface PostOrderMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategoryId?: number;
  onSaved?: () => void;
}

export default function PostOrderMatrixModal({
  isOpen,
  onClose,
  initialCategoryId,
  onSaved,
}: PostOrderMatrixModalProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategoryId ? String(initialCategoryId) : ''
  );
  const [items, setItems] = useState<MatrixPostItem[]>([]);
  const [originalItems, setOriginalItems] = useState<MatrixPostItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load categories when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setHighlightQuery('');
    setDirty(false);

    if (initialCategoryId) {
      setSelectedCategoryId(String(initialCategoryId));
    }

    setLoadingCats(true);
    apiClient
      .get(API_ENDPOINTS.PUBLIC.CATEGORIES)
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.content || res.data?.data || [];
        const mapped: CategoryOption[] = Array.isArray(list)
          ? list.map((c: any) => ({
              id: Number(c.id),
              name: String(c.name || ''),
              slug: c.slug || '',
            }))
          : [];
        setCategories(mapped);
        if (!initialCategoryId && mapped.length > 0) {
          setSelectedCategoryId((prev) => prev || String(mapped[0].id));
        }
      })
      .catch(() => {
        if (active) setCategories([]);
      })
      .finally(() => {
        if (active) setLoadingCats(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, initialCategoryId]);

  // Load posts whenever selectedCategoryId changes
  useEffect(() => {
    if (!isOpen || !selectedCategoryId) {
      setItems([]);
      setOriginalItems([]);
      return;
    }
    let active = true;
    setLoadingPosts(true);
    setDirty(false);
    setDragIndex(null);
    setDragOverIndex(null);

    apiClient
      .get(API_ENDPOINTS.ADMIN.POSTS, {
        params: {
          categoryId: Number(selectedCategoryId),
          page: 0,
          size: 100,
          sortBy: 'sortOrder',
          direction: 'asc',
        },
      })
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.content || res.data?.data || [];
        const mapped: MatrixPostItem[] = Array.isArray(list)
          ? list.map((p: any) => ({
              id: Number(p.id),
              title: String(p.title || 'Untitled'),
              slug: String(p.slug || ''),
              imageUrl: p.image || p.thumbnail || undefined,
              status: String(p.status || (p.isActive ? 'PUBLISHED' : 'DRAFT')).toUpperCase(),
              isHero: Boolean(p.isHero),
              isFeatured: Boolean(p.isFeatured),
              views: Number(p.viewCount ?? p.views ?? 0),
            }))
          : [];
        setItems(mapped);
        setOriginalItems(mapped);
      })
      .catch(() => {
        if (active) {
          toast.error('Failed to load category articles');
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setLoadingPosts(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedCategoryId, toast]);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => String(c.id) === selectedCategoryId);
  const selectedCategoryName = selectedCategory
    ? selectedCategory.slug === 'other'
      ? `${selectedCategory.name} (Khác)`
      : selectedCategory.name
    : '';

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
      await apiClient.patch(API_ENDPOINTS.ADMIN.POSTS_REORDER, {
        orderedIds: items.map((p) => p.id),
      });
      toast.success(t('Updated article display order!'));
      setOriginalItems(items);
      setDirty(false);
      onSaved?.();
      onClose();
    } catch {
      toast.error(t('Failed to update article order'));
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
                  {t('Arrange Articles by Category')}
                </h2>
                {selectedCategoryName && (
                  <span className="text-[11px] font-bold bg-brand-primary text-white px-2.5 py-0.5 rounded-full">
                    {selectedCategoryName} • {items.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Pick a category, then drag & drop articles into slots #1 → #N to control display order.')}
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

        {/* Category Selector + Highlight Search Toolbar */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-brand-primary shrink-0" />
            <AdminSearchableSelect
              value={selectedCategoryId}
              onChange={(val) => setSelectedCategoryId(val)}
              disabled={loadingCats}
              placeholder={loadingCats ? 'Loading categories...' : 'Select Editorial Category...'}
              searchPlaceholder="Search category..."
              options={categories.map((c) => ({
                value: String(c.id),
                label: c.slug === 'other' ? `${c.name} (Khác)` : c.name,
              }))}
            />
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              placeholder={t('Highlight article by headline or slug...')}
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
          {!selectedCategoryId ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('Select a category above to arrange its articles.')}
            </div>
          ) : loadingPosts ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Loader2 size={26} className="animate-spin text-brand-primary" />
              <span className="text-xs font-semibold">{t('Loading articles...')}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('This category has no articles yet.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {items.map((post, idx) => {
                const isMatch =
                  Boolean(normalizedQuery) &&
                  (post.title.toLowerCase().includes(normalizedQuery) ||
                    post.slug.toLowerCase().includes(normalizedQuery));
                const isDimmed = Boolean(normalizedQuery) && !isMatch;
                const isDragSource = dragIndex === idx;
                const isDragTarget = dragOverIndex === idx && dragIndex !== idx;

                return (
                  <div
                    key={post.id}
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
                    {/* Top row: Rank + Badges + Grip */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                        {post.isHero && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
                            Hero
                          </span>
                        )}
                        {post.isFeatured && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            Pick
                          </span>
                        )}
                      </div>
                      <GripVertical
                        size={15}
                        className="text-slate-400 group-hover:text-brand-primary transition shrink-0"
                      />
                    </div>

                    {/* Thumbnail + Headline */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-14 h-11 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {post.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <BookOpen size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {post.title}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="font-mono truncate">/post/{post.slug}</span>
                      <span className="inline-flex items-center gap-1 font-semibold shrink-0">
                        <Eye size={10} /> {post.views.toLocaleString()}
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
              <span>{t('Order matches live category page.')}</span>
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
