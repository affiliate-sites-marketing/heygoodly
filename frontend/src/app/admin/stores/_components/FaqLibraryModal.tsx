'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  X,
  Search,
  Check,
  Plus,
  Trash2,
  BookmarkPlus,
  Pencil,
  Loader2,
  Database,
} from 'lucide-react';
import {
  FaqTemplateItem,
  FaqTemplateCategory,
  applyBrandToken,
  extractBrandToken,
} from '@/constants/storeTemplates';
import { storeTemplateService } from '@/services/storeTemplateService';
import { useAdminI18n } from '@/context/AdminI18nContext';
import { useToast } from '@/context/ToastContext';
import { inputClass } from '@/components/admin/AdminFormPage';

interface FaqLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName: string;
  onInsertFaqs: (faqs: Array<{ question: string; answer: string }>) => void;
  onTemplatesChange?: (templates: FaqTemplateItem[]) => void;
}

const DEFAULT_FORM_STATE = {
  category: 'custom' as FaqTemplateCategory,
  title: '',
  questionTemplate: '',
  answerTemplate: '',
  isDefault: false,
};

export default function FaqLibraryModal({
  isOpen,
  onClose,
  brandName,
  onInsertFaqs,
  onTemplatesChange,
}: FaqLibraryModalProps) {
  const { t } = useAdminI18n();
  const { toast } = useToast();
  const [category, setCategory] = useState<'all' | FaqTemplateCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<FaqTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);

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
      .listFaqTemplates()
      .then((list) => {
        if (cancelled) return;
        setTemplates(list);
        onTemplatesChange?.(list);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error(t('Failed to load FAQ library'));
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
      const resolvedQ = applyBrandToken(item.questionTemplate, brandName).toLowerCase();
      const resolvedA = applyBrandToken(item.answerTemplate, brandName).toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        resolvedQ.includes(q) ||
        resolvedA.includes(q)
      );
    });
  }, [templates, category, search, brandName]);

  if (!isOpen) return null;

  const toStoreFaq = (item: FaqTemplateItem) => ({
    question: applyBrandToken(item.questionTemplate, brandName),
    answer: applyBrandToken(item.answerTemplate, brandName),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUseSingle = (item: FaqTemplateItem) => {
    onInsertFaqs([toStoreFaq(item)]);
    onClose();
  };

  const handleInsertSelected = () => {
    const chosen = templates.filter((item) => selectedIds.includes(item.id));
    if (chosen.length === 0) return;
    onInsertFaqs(chosen.map(toStoreFaq));
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

  const handleStartEdit = (item: FaqTemplateItem) => {
    setEditingId(item.id);
    setFormState({
      category: item.category,
      title: item.title,
      questionTemplate: item.questionTemplate,
      answerTemplate: item.answerTemplate,
      isDefault: Boolean(item.isDefault),
    });
    setFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.questionTemplate.trim() || !formState.answerTemplate.trim() || saving) return;

    const payload = {
      category: formState.category,
      title: formState.title.trim() || formState.questionTemplate.trim().slice(0, 48),
      questionTemplate: extractBrandToken(formState.questionTemplate, brandName),
      answerTemplate: extractBrandToken(formState.answerTemplate, brandName),
      isDefault: formState.isDefault,
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await storeTemplateService.updateFaqTemplate(editingId, payload);
        const nextList = templates.map((item) => (item.id === editingId ? updated : item));
        setTemplates(nextList);
        onTemplatesChange?.(nextList);
        toast.success(t('Updated template!'));
      } else {
        const created = await storeTemplateService.createFaqTemplate(payload);
        const nextList = [created, ...templates];
        setTemplates(nextList);
        onTemplatesChange?.(nextList);
        setCategory(created.category);
        toast.success(t('Saved to FAQ Library!'));
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
      await storeTemplateService.deleteFaqTemplate(id);
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

  const categoryTabs: Array<{ id: 'all' | FaqTemplateCategory; label: string }> = [
    { id: 'all', label: t('All') },
    { id: 'promo', label: t('Promo & Checkout') },
    { id: 'shipping', label: t('Shipping') },
    { id: 'returns', label: t('Returns & Warranty') },
    { id: 'discounts', label: t('Discounts') },
    { id: 'custom', label: `${t('My Saved')} (${customCount})` },
  ];

  return (
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
              <HelpCircle size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900">{t('FAQ Library')}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database size={10} />
                  <span>{t('Stored in Database')}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {t('Choose universal FAQ templates and edit them freely for this store.')}
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
              <span>{t('Create Reusable FAQ Template')}</span>
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

        {/* Collapsible Create / Edit FAQ Template Form */}
        {formOpen && (
          <form
            onSubmit={handleSubmitForm}
            className="px-5 py-4 bg-indigo-50/50 border-b border-indigo-100 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-bold text-indigo-950">
                {editingId ? t('Edit Reusable FAQ Template') : t('Create Reusable FAQ Template')}
              </p>
              <span className="text-[11px] text-indigo-700">
                {t('Use {brand} to auto-fill the current store name.')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={formState.category}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    category: e.target.value as FaqTemplateCategory,
                  }))
                }
                className={`${inputClass} text-xs`}
              >
                <option value="promo">{t('Promo & Checkout')}</option>
                <option value="shipping">{t('Shipping')}</option>
                <option value="returns">{t('Returns & Warranty')}</option>
                <option value="discounts">{t('Discounts')}</option>
                <option value="custom">{t('Custom')}</option>
              </select>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Template title (e.g. Membership Discount)"
                className={`${inputClass} text-xs`}
              />
              <input
                type="text"
                required
                value={formState.questionTemplate}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, questionTemplate: e.target.value }))
                }
                placeholder="Question... e.g. Does {brand} offer price matching?"
                className={`${inputClass} text-xs`}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
              <div className="flex-1 space-y-2">
                <textarea
                  rows={2}
                  required
                  value={formState.answerTemplate}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, answerTemplate: e.target.value }))
                  }
                  placeholder="Answer... Use {brand} so it adapts automatically for any store."
                  className={`${inputClass} text-xs w-full resize-y`}
                />
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formState.isDefault}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, isDefault: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('Mark as default FAQ')}</span>
                </label>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setFormState(DEFAULT_FORM_STATE);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
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

        {/* Search & Tabs */}
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
              placeholder={t('Search FAQ templates...')}
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

        {/* FAQ Templates Grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/40 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span>{t('Loading library...')}</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              {t('No matching FAQ templates found.')}
            </div>
          ) : (
            filteredTemplates.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const qPreview = applyBrandToken(item.questionTemplate, brandName);
              const aPreview = applyBrandToken(item.answerTemplate, brandName);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-4 rounded-xl border bg-white space-y-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.title}
                          </span>
                          {item.isDefault && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              {t('Default')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-extrabold text-slate-900">{qPreview}</p>
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
                  <p className="text-xs text-slate-600 leading-relaxed pl-6">{aPreview}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            {t('Use {brand} to auto-fill the current store name.')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition"
            >
              {t('Close')}
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleInsertSelected}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition"
            >
              {t(`Add Selected FAQs (${selectedIds.length})`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
