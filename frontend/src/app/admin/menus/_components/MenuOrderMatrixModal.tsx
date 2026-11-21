'use client';

import { useState, useEffect } from 'react';
import {
  X,
  GripVertical,
  LayoutGrid,
  Save,
  Loader2,
  Search,
  RotateCcw,
  Menu as MenuIcon,
  ExternalLink,
} from 'lucide-react';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';

interface MatrixMenuItem {
  id: number;
  title: string;
  position: string;
  targetType: string;
  targetValue: string;
  isActive: boolean;
}

interface MenuOrderMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: 'main' | 'footer';
  onSaved?: () => void;
}

export default function MenuOrderMatrixModal({
  isOpen,
  onClose,
  initialPosition = 'main',
  onSaved,
}: MenuOrderMatrixModalProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();

  const [positionTab, setPositionTab] = useState<'main' | 'footer'>(initialPosition);
  const [items, setItems] = useState<MatrixMenuItem[]>([]);
  const [originalItems, setOriginalItems] = useState<MatrixMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPositionTab(initialPosition);
    setHighlightQuery('');
  }, [isOpen, initialPosition]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setDirty(false);
    setDragIndex(null);
    setDragOverIndex(null);

    apiClient
      .get(API_ENDPOINTS.ADMIN.MENUS, {
        params: {
          page: 0,
          size: 100,
          position: positionTab,
          sortBy: 'sortOrder',
          direction: 'asc',
        },
      })
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.content || res.data?.data || [];
        const mapped: MatrixMenuItem[] = Array.isArray(list)
          ? list.map((m: any) => ({
              id: Number(m.id),
              title: String(m.title || ''),
              position: String(m.position || positionTab),
              targetType: String(m.targetType || 'custom'),
              targetValue: String(m.targetValue || ''),
              isActive: m.isActive !== false,
            }))
          : [];
        setItems(mapped);
        setOriginalItems(mapped);
      })
      .catch(() => {
        if (active) {
          toast.error('Failed to load navigation menus');
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, positionTab, toast]);

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
      await apiClient.patch(API_ENDPOINTS.ADMIN.MENUS_REORDER, {
        orderedIds: items.map((m) => m.id),
      });
      toast.success(t('Updated menu display order!'));
      setOriginalItems(items);
      setDirty(false);
      onSaved?.();
      onClose();
    } catch {
      toast.error(t('Failed to update menu order'));
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
                  {t('Arrange Navigation Menu Order')}
                </h2>
                <span className="text-[11px] font-bold bg-brand-primary text-white px-2.5 py-0.5 rounded-full">
                  {positionTab === 'main' ? t('Header Main Nav') : t('Footer Links')} • {items.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('Pick Header or Footer placement, then drag & drop menu items into slots #1 → #N.')}
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

        {/* Placement Tabs + Highlight Search Toolbar */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setPositionTab('main')}
              className={`h-8 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                positionTab === 'main'
                  ? 'bg-white text-brand-primary shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Header Main Nav')}
            </button>
            <button
              type="button"
              onClick={() => setPositionTab('footer')}
              className={`h-8 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                positionTab === 'footer'
                  ? 'bg-white text-brand-primary shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('Footer Links')}
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              placeholder={t('Highlight menu item...')}
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
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Loader2 size={26} className="animate-spin text-brand-primary" />
              <span className="text-xs font-semibold">{t('Loading menu items...')}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              {t('No menu items in this placement.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {items.map((menu, idx) => {
                const isMatch =
                  Boolean(normalizedQuery) &&
                  (menu.title.toLowerCase().includes(normalizedQuery) ||
                    menu.targetValue.toLowerCase().includes(normalizedQuery));
                const isDimmed = Boolean(normalizedQuery) && !isMatch;
                const isDragSource = dragIndex === idx;
                const isDragTarget = dragOverIndex === idx && dragIndex !== idx;

                return (
                  <div
                    key={menu.id}
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
                    {/* Top row: Rank + Status + Grip */}
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
                        {!menu.isActive && (
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

                    {/* Icon + Label */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-brand-primary shrink-0">
                        <MenuIcon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {menu.title}
                        </p>
                        <p className="text-[10px] font-mono text-indigo-600 truncate mt-0.5 inline-flex items-center gap-1 max-w-full">
                          <span className="truncate">{menu.targetValue}</span>
                          {menu.targetValue.startsWith('http') && <ExternalLink size={9} className="shrink-0" />}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                      <span className="uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {menu.targetType}
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
              <span>{t('Order matches live navigation bar.')}</span>
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
