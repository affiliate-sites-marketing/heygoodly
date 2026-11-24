'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  X,
  Search,
  Check,
  Star,
  Plus,
  Trash2,
  BookmarkPlus,
  CheckCircle2,
  Pencil,
  Loader2,
  Database,
  Shuffle,
  UploadCloud,
  Layers,
} from 'lucide-react';
import MediaLibraryModal from '@/components/admin/MediaLibraryModal';
import { mediaService } from '@/services/mediaService';
import { StoreCustomerReview } from '@/types/deals';
import {
  ReviewTemplateItem,
  ReviewTemplateCategory,
  applyBrandToken,
  extractBrandToken,
} from '@/constants/storeTemplates';
import { storeTemplateService } from '@/services/storeTemplateService';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import { useAdminI18n } from '@/context/AdminI18nContext';
import { useToast } from '@/context/ToastContext';
import { inputClass } from '@/components/admin/AdminFormPage';

interface ReviewLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName: string;
  mode: 'append' | 'replace-single';
  onInsertReviews: (reviews: StoreCustomerReview[]) => void;
  onTemplatesChange?: (templates: ReviewTemplateItem[]) => void;
}

const DEFAULT_FORM_STATE = {
  category: 'custom' as ReviewTemplateCategory,
  title: '',
  reviewerName: '',
  reviewerAvatar: '',
  rating: 5,
  reviewDateLabel: '',
  isVerified: true,
  commentTemplate: '',
};

export default function ReviewLibraryModal({
  isOpen,
  onClose,
  brandName,
  mode,
  onInsertReviews,
  onTemplatesChange,
}: ReviewLibraryModalProps) {
  const { t } = useAdminI18n();
  const { toast } = useToast();
  const [category, setCategory] = useState<'all' | ReviewTemplateCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ReviewTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('Image must be smaller than 10MB'));
      return;
    }
    setUploadingAvatar(true);
    try {
      const uploaded = await mediaService.uploadMedia(file, 'avatars', ['avatar', 'reviewer']);
      const url = uploaded?.url || '';
      if (url) {
        setFormState((prev) => ({ ...prev, reviewerAvatar: url }));
        toast.success(t('Avatar uploaded!'));
      }
    } catch {
      toast.error(t('Failed to upload avatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSelectedIds([]);
    setSearch('');
    setFormOpen(false);
    setEditingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setLoading(true);

    storeTemplateService
      .listReviewTemplates()
      .then((list) => {
        if (cancelled) return;
        setTemplates(list);
        onTemplatesChange?.(list);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error(t('Failed to load review library'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const customCount = useMemo(
    () => templates.filter((item) => item.category === 'custom').length,
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      const resolvedComment = applyBrandToken(item.commentTemplate, brandName).toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.reviewerName.toLowerCase().includes(q) ||
        resolvedComment.includes(q)
      );
    });
  }, [templates, category, search, brandName]);

  if (!isOpen) return null;

  const toStoreReview = (item: ReviewTemplateItem): StoreCustomerReview => ({
    reviewerName: item.reviewerName,
    reviewerAvatar: item.reviewerAvatar || '',
    isVerified: item.isVerified,
    rating: item.rating,
    reviewDateLabel: item.reviewDateLabel,
    comment: applyBrandToken(item.commentTemplate, brandName),
    isActive: true,
  });

  const handleInsertRandom = (count = 3) => {
    const pool = filteredTemplates.length > 0 ? filteredTemplates : templates;
    if (pool.length === 0) return;
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const chosen = shuffled.slice(0, Math.min(count, shuffled.length));
    onInsertReviews(chosen.map(toStoreReview));
    onClose();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUseSingle = (item: ReviewTemplateItem) => {
    onInsertReviews([toStoreReview(item)]);
    onClose();
  };

  const handleInsertSelected = () => {
    const chosen = templates.filter((item) => selectedIds.includes(item.id));
    if (chosen.length === 0) return;
    onInsertReviews(chosen.map(toStoreReview));
    onClose();
  };

  const handleToggleCreate = () => {
    if (formOpen && !editingId) {
      setFormOpen(false);
      return;
    }
    setEditingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormOpen(true);
  };

  const handleStartEdit = (item: ReviewTemplateItem) => {
    setEditingId(item.id);
    setFormState({
      category: item.category,
      title: item.title,
      reviewerName: item.reviewerName,
      reviewerAvatar: item.reviewerAvatar || '',
      rating: item.rating,
      reviewDateLabel: item.reviewDateLabel,
      isVerified: item.isVerified,
      commentTemplate: item.commentTemplate,
    });
    setFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.commentTemplate.trim() || saving) return;

    const payload = {
      category: formState.category,
      title:
        formState.title.trim() ||
        `${formState.reviewerName.trim() || 'Shopper'} Review`,
      reviewerName: formState.reviewerName.trim() || 'Verified Buyer',
      reviewerAvatar: formState.reviewerAvatar.trim() || '',
      rating: formState.rating,
      reviewDateLabel: formState.reviewDateLabel.trim() || 'Recently',
      isVerified: formState.isVerified,
      commentTemplate: extractBrandToken(formState.commentTemplate, brandName),
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await storeTemplateService.updateReviewTemplate(editingId, payload);
        const nextList = templates.map((item) => (item.id === editingId ? updated : item));
        setTemplates(nextList);
        onTemplatesChange?.(nextList);
        toast.success(t('Updated template!'));
      } else {
        const created = await storeTemplateService.createReviewTemplate(payload);
        const nextList = [created, ...templates];
        setTemplates(nextList);
        onTemplatesChange?.(nextList);
        setCategory(created.category);
        toast.success(t('Saved to Review Library!'));
      }

      setFormOpen(false);
      setEditingId(null);
      setFormState(DEFAULT_FORM_STATE);
    } catch {
      toast.error(t('Failed to save template'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await storeTemplateService.deleteReviewTemplate(id);
      const nextList = templates.filter((item) => item.id !== id);
      setTemplates(nextList);
      onTemplatesChange?.(nextList);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (editingId === id) {
        setEditingId(null);
        setFormOpen(false);
        setFormState(DEFAULT_FORM_STATE);
      }
      toast.success(t('Deleted template!'));
    } catch {
      toast.error(t('Failed to save template'));
    } finally {
      setDeletingId(null);
    }
  };

  const categoryTabs: Array<{ id: 'all' | ReviewTemplateCategory; label: string }> = [
    { id: 'all', label: `${t('All')} (${templates.length})` },
    { id: 'savings', label: t('Savings & Codes') },
    { id: 'quality', label: t('Quality & Value') },
    { id: 'shipping', label: t('Shipping & Service') },
    { id: 'balanced', label: t('Balanced 4★') },
    { id: 'custom', label: `${t('Custom')} (${customCount})` },
  ];

  return (
    <>
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900">{t('Review Library')}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database size={10} />
                  <span>{t('Stored in Database')}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {t('Choose realistic review templates and edit them freely for this store.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleCreate}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookmarkPlus size={13} />
              <span>{t('Create Reusable Review Template')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
              title={t('Close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Collapsible Create / Edit Template Form */}
        {formOpen && (
          <form
            onSubmit={handleSubmitForm}
            className="px-5 py-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-bold text-indigo-950">
                {editingId
                  ? t('Edit Reusable Review Template')
                  : t('Create Reusable Review Template')}
              </p>
              <span className="text-[11px] text-indigo-700">
                {t('Use {brand} to auto-fill the current store name.')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <AdminSearchableSelect
                value={formState.category}
                onChange={(val) =>
                  setFormState((prev) => ({
                    ...prev,
                    category: val as ReviewTemplateCategory,
                  }))
                }
                options={[
                  { value: 'savings', label: 'Savings & Codes' },
                  { value: 'quality', label: 'Quality & Value' },
                  { value: 'shipping', label: 'Shipping & Service' },
                  { value: 'balanced', label: 'Balanced 4★' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Template title (e.g. Fast delivery)"
                className={`${inputClass} text-xs`}
              />
              <input
                type="text"
                required
                value={formState.reviewerName}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, reviewerName: e.target.value }))
                }
                placeholder="Reviewer Name * (e.g. Alex T.)"
                className={`${inputClass} text-xs`}
              />
              <AdminSearchableSelect
                value={String(formState.rating)}
                searchable={false}
                onChange={(val) =>
                  setFormState((prev) => ({ ...prev, rating: Number(val) }))
                }
                options={[
                  { value: '5', label: '5 ★' },
                  { value: '4', label: '4 ★' },
                  { value: '3', label: '3 ★' },
                ]}
              />
              <input
                type="text"
                value={formState.reviewDateLabel}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, reviewDateLabel: e.target.value }))
                }
                placeholder="e.g. 3 days ago"
                className={`${inputClass} text-xs`}
              />
            </div>
            <textarea
              rows={2}
              required
              value={formState.commentTemplate}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, commentTemplate: e.target.value }))
              }
              placeholder="Write review text... Example: Used a {brand} promo code and saved 20% at checkout!"
              className={`${inputClass} text-xs w-full resize-y`}
            />

            {/* Compact Single-Row Avatar Picker + Verified + Save Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                {/* 40x40 Circular Avatar Preview */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setAvatarPickerOpen(true)}
                    title={t('Choose avatar from Media Library')}
                    className="w-10 h-10 rounded-full overflow-hidden border border-slate-300 bg-white flex items-center justify-center hover:border-indigo-500 transition cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={14} className="animate-spin text-indigo-600" />
                    ) : formState.reviewerAvatar ? (
                      <img
                        src={formState.reviewerAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 w-full h-full flex items-center justify-center">
                        {(formState.reviewerName || 'AV').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>
                  {formState.reviewerAvatar && (
                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, reviewerAvatar: '' }))}
                      title={t('Remove avatar')}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs hover:bg-rose-700 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Inline Upload + Media Library + URL */}
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAvatarFile}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-700 inline-flex items-center gap-1 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <UploadCloud size={12} />
                  <span>{t('Upload')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarPickerOpen(true)}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  <Layers size={12} />
                  <span>{t('Library')}</span>
                </button>
                <input
                  type="text"
                  value={formState.reviewerAvatar}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, reviewerAvatar: e.target.value }))
                  }
                  placeholder={t('Avatar URL (optional)...')}
                  className={`${inputClass} text-[11px] h-8 flex-1 min-w-[140px]`}
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formState.isVerified}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, isVerified: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('Verified Buyer')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setFormState(DEFAULT_FORM_STATE);
                  }}
                  className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  <span>
                    {saving
                      ? t('Saving...')
                      : editingId
                        ? t('Update Template')
                        : t('Save Template')}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-200 space-y-2.5 bg-white">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search review templates...')}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  category === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/40">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span>{t('Loading library...')}</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto">
                <BookOpen size={18} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <p className="text-xs font-bold text-slate-800">
                  {t('No saved reviews in the library yet.')}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t(
                    'Create a reusable review template or click "Save to Library" on any store review.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormState(DEFAULT_FORM_STATE);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition"
              >
                <Plus size={13} />
                <span>{t('Create Reusable Review Template')}</span>
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              {t('No matching review templates found.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const previewComment = applyBrandToken(item.commentTemplate, brandName);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (mode === 'append') toggleSelect(item.id);
                    }}
                    className={`p-4 rounded-xl border bg-white space-y-2.5 transition ${
                      mode === 'append' ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {mode === 'append' && (
                          <span
                            className={`mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={11} />}
                          </span>
                        )}
                        {item.reviewerAvatar ? (
                          <img
                            src={item.reviewerAvatar}
                            alt={item.reviewerName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 border border-emerald-200">
                            {(item.reviewerName || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {item.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-bold text-slate-700">{item.reviewerName}</span>
                            <span>•</span>
                            <span className="text-amber-500 flex items-center">
                              {Array.from({ length: item.rating }).map((_, idx) => (
                                <Star key={idx} size={10} className="fill-amber-400 text-amber-400" />
                              ))}
                            </span>
                            <span>•</span>
                            <span>{item.reviewDateLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(item);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition"
                          title={t('Edit Template')}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(item.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer disabled:opacity-50 transition"
                          title={t('Delete')}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseSingle(item);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer transition"
                        >
                          <Plus size={11} />
                          <span>{t('Use & Edit')}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{previewComment}</p>

                    {item.isVerified && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 size={10} />
                        <span>{t('Verified Buyer')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            {mode === 'append'
              ? t('Use {brand} to auto-fill the current store name.')
              : t('Use & Edit')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition"
            >
              {t('Close')}
            </button>
            {mode === 'append' && (
              <>
                <button
                  type="button"
                  disabled={templates.length === 0}
                  onClick={() => handleInsertRandom(3)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer transition"
                  title={t('Randomly pick 3 templates (with their saved avatars) and insert into this store')}
                >
                  <Shuffle size={12} />
                  <span>{t('Insert Random 3')}</span>
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={handleInsertSelected}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  {t(`Add Selected Reviews (${selectedIds.length})`)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    <MediaLibraryModal
      isOpen={avatarPickerOpen}
      onClose={() => setAvatarPickerOpen(false)}
      onSelect={(url) => {
        setFormState((prev) => ({ ...prev, reviewerAvatar: url }));
        setAvatarPickerOpen(false);
      }}
    />
    </>
  );
}
