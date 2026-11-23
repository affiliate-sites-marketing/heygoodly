'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { ROUTES } from '@/constants/routes';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import { SITE_DOMAIN, SITE_NAME } from '@/constants/site';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { type MenuItem } from '../_lib/data';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import {
  Monitor,
  Tablet,
  Smartphone,
  Globe,
  ExternalLink,
  Eye,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Menu as MenuIcon,
  X,
  Search,
  Zap,
  ShieldCheck,
  RotateCcw,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

type MenuFormState = Omit<MenuItem, 'id'>;

const FORM_ID = 'menu-form';

const QUICK_PRESETS = [
  { label: 'Stores Hub', title: 'Stores', path: '/stores', type: 'url' as const, position: 'main' as const },
  { label: 'All Categories', title: 'Categories', path: '/categories', type: 'category' as const, position: 'main' as const },
  { label: 'Editor Reviews', title: 'Reviews', path: '/category/reviews', type: 'category' as const, position: 'main' as const },
  { label: 'Top Deals', title: 'Top Deals', path: '/posts', type: 'url' as const, position: 'main' as const },
  { label: 'About Desk', title: 'About Us', path: '/about-us', type: 'page' as const, position: 'footer' as const },
  { label: 'Affiliate Terms', title: 'Affiliate Disclosure', path: '/affiliate-disclosure', type: 'page' as const, position: 'footer' as const },
];

export default function MenuForm({ id }: { id?: string }) {
  const isEdit = id !== undefined;
  const [menuData, setMenuData] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let mounted = true;
    setLoading(true);

    apiClient
      .get(`${API_ENDPOINTS.ADMIN.MENUS}/${id}`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data;
        if (data && (data.id || data.title)) {
          setMenuData({
            id: Number(data.id),
            title: data.title || '',
            position: data.position || 'main',
            targetType: data.targetType || 'url',
            targetValue: data.targetValue || '',
            sortOrder: Number(data.sortOrder ?? 0),
            isActive: data.isActive !== false,
          });
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to load menu item from backend:', err);
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
  if (isEdit && (notFound || !menuData)) return <FormNotFound backHref={ROUTES.ADMIN.MENUS} entity="Menu item" />;

  const existing = menuData || undefined;

  const initial: MenuFormState = existing
    ? {
        title: existing.title,
        position: existing.position,
        targetType: existing.targetType,
        targetValue: existing.targetValue,
        sortOrder: existing.sortOrder,
        isActive: existing.isActive,
      }
    : {
        title: '',
        position: 'main',
        targetType: 'url',
        targetValue: '',
        sortOrder: 0,
        isActive: true,
      };

  return <MenuFormInner key={id ?? 'new'} existing={existing} initial={initial} />;
}

const MENU_FIELD_LABELS: Record<string, string> = {
  title: 'Menu Label / Title',
  targetValue: 'Destination Target',
};

function MenuFormInner({ existing, initial }: { existing?: MenuItem; initial: MenuFormState }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [allMenus, setAllMenus] = useState<MenuItem[]>(() => existing ? [existing] : []);
  const [form, setForm] = useState<MenuFormState>(initial);
  const [targetTouched, setTargetTouched] = useState<boolean>(Boolean(existing?.targetValue));

  // Live Preview Settings
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewTab, setPreviewTab] = useState<'auto' | 'header' | 'footer'>('auto');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine effective preview location
  const effectiveLocation = previewTab === 'auto' ? form.position : previewTab;

  // Compute live navigation list (existing + current item being edited/created)
  const currentPreviewItem: MenuItem = {
    id: existing?.id ?? 999999,
    title: form.title.trim() || 'New Menu Item',
    position: form.position,
    targetType: form.targetType,
    targetValue: form.targetValue.trim() || '/',
    sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
    isActive: form.isActive,
  };

  const otherMenus = allMenus.filter((m) => m.id !== existing?.id);

  const headerMenuItems = [
    ...(form.position === 'main' ? [currentPreviewItem] : []),
    ...otherMenus.filter((m) => m.position === 'main'),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const footerMenuItems = [
    ...(form.position === 'footer' ? [currentPreviewItem] : []),
    ...otherMenus.filter((m) => m.position === 'footer'),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      nextErrors.title = t('Please enter the menu label / title.');
    } else if (form.title.trim().length > 150) {
      nextErrors.title = t('Menu title must not exceed 150 characters.');
    }
    if (!form.targetValue.trim()) {
      nextErrors.targetValue = t('Please enter the destination target path or URL (e.g. /stores).');
    } else if (form.targetValue.trim().length > 500) {
      nextErrors.targetValue = t('Destination target must not exceed 500 characters.');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const fieldNames = Object.keys(nextErrors)
        .map((k) => t(MENU_FIELD_LABELS[k] || k))
        .join(', ');
      toast.error(`${t('Please check required fields')}: ${fieldNames}`);
      scrollToFormField(firstKey);
      return;
    }

    const payload = {
      title: form.title.trim(),
      position: form.position,
      targetType: form.targetType,
      targetValue: form.targetValue.trim(),
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };

    try {
      if (existing) {
        const res = await apiClient.put(`${API_ENDPOINTS.ADMIN.MENUS}/${existing.id}`, payload);
        toast.success(res.data?.message || `Updated menu item "${form.title}" successfully!`);
      } else {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN.MENUS, payload);
        toast.success(res.data?.message || `Created menu item "${form.title}" successfully!`);
      }
      router.push(ROUTES.ADMIN.MENUS);
    } catch (err: any) {
      const mappedErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && typeof err.response.data.errors === 'object') {
        Object.assign(mappedErrors, err.response.data.errors);
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to save menu item.';
      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const fieldNames = Object.keys(mappedErrors)
          .map((k) => t(MENU_FIELD_LABELS[k] || k))
          .join(', ');
        toast.error(`${t('Please check required fields')}: ${fieldNames} — ${mappedErrors[firstKey]}`);
        scrollToFormField(firstKey);
      } else {
        setErrors({ _form: msg });
        toast.error(msg);
      }
    }
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[number]) => {
    setTargetTouched(true);
    setForm({
      ...form,
      title: preset.title,
      targetValue: preset.path,
      targetType: preset.type,
      position: preset.position,
    });
    setErrors({});
  };

  return (
    <AdminFormPage
      title={existing ? `Edit Menu Item: ${existing.title}` : 'Add New Navigation Menu Item'}
      description="Configure navigation link title, target URL, and preview live client layout in real time."
      backHref={ROUTES.ADMIN.MENUS}
      backLabel="Back to menus"
      formId={FORM_ID}
      submitLabel={existing ? 'Save Menu Item' : 'Add to Navigation'}
      width="full"
    >
      <form noValidate id={FORM_ID} onSubmit={handleSave} className="space-y-6">
        {errors._form && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{errors._form}</span>
          </div>
        )}
        <FormErrorBanner errors={errors} fieldLabels={MENU_FIELD_LABELS} />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* =========================================================
              LEFT COLUMN: FORM CONFIGURATION (5 Cols)
             ========================================================= */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* Quick Presets */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand-primary" /> Quick Link Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-brand-primary hover:text-brand-primary transition cursor-pointer shadow-2xs"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            <FormSection title="Menu Item Configuration">
              {/* Menu Title */}
              <div className="space-y-1">
                <label className={labelClass}>Menu Label / Title *</label>
                <input
                  type="text"
                  data-field="title"
                  value={form.title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    const autoTarget = toValidSlug(nextTitle) ? `/${toValidSlug(nextTitle)}` : '';
                    setForm((prev) => ({
                      ...prev,
                      title: nextTitle,
                      targetValue: targetTouched ? prev.targetValue : autoTarget,
                    }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    if (!targetTouched && autoTarget && errors.targetValue) {
                      setErrors((prev) => ({ ...prev, targetValue: '' }));
                    }
                  }}
                  placeholder="e.g. Stores, Top Deals, Tech, About Us"
                  className={`${inputClass} text-base font-bold ${errors.title ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  autoFocus
                />
                {errors.title && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.title}
                  </p>
                )}
                <span className="text-[11px] text-slate-400">
                  Visible link text in the public website navigation bar.
                </span>
              </div>

              {/* Link Target Type & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Target Link Type</label>
                  <AdminSearchableSelect
                    value={form.targetType}
                    onChange={(val) => setForm({ ...form, targetType: val as MenuItem['targetType'] })}
                    options={[
                      { value: 'url', label: 'Custom Path / External URL' },
                      { value: 'category', label: 'Category Landing Page' },
                      { value: 'page', label: 'CMS Content Page' },
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Destination Target *</label>
                  <input
                    type="text"
                    data-field="targetValue"
                    value={form.targetValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetTouched(Boolean(val.trim()));
                      setForm({ ...form, targetValue: val });
                      if (errors.targetValue) setErrors((prev) => ({ ...prev, targetValue: '' }));
                    }}
                    placeholder="e.g. /stores, /category/tech"
                    className={`${inputClass} font-mono ${errors.targetValue ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.targetValue && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.targetValue}
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection title="Placement & Priority">
              <div className="space-y-4">
                
                {/* Position */}
                <div className="space-y-1">
                  <label className={labelClass}>Navigation Bar Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, position: 'main' })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        form.position === 'main'
                          ? 'border-brand-primary bg-rose-50/50 text-brand-primary font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold">Header Main Nav</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Top sticky masthead menu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, position: 'footer' })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        form.position === 'footer'
                          ? 'border-brand-primary bg-rose-50/50 text-brand-primary font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold">Footer Sitemap</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Bottom footer column</span>
                    </button>
                  </div>
                </div>

                {/* Active Checkbox */}
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Link Active (Visible to Public)</span>
                    <span className="text-[11px] text-slate-400">Uncheck to hide without deleting</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                </label>
              </div>
            </FormSection>

          </div>

          {/* =========================================================
              RIGHT COLUMN: LIVE CLIENT WEBSITE PREVIEW (7 Cols)
             ========================================================= */}
          <div className="xl:col-span-7 space-y-4 xl:sticky xl:top-6">
            
            {/* Live Preview Header Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live Client Website Preview
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Real-time Sync
                </span>
              </div>

              {/* Viewport & Tab Switchers */}
              <div className="flex items-center gap-2">
                {/* Location Tab */}
                <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('header')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                      effectiveLocation === 'main'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Header Nav
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('footer')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                      effectiveLocation === 'footer'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Footer Sitemap
                  </button>
                </div>

                {/* Device Switcher */}
                <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] ${
                      viewportMode === 'desktop'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Desktop Preview (1200px)"
                  >
                    <Monitor size={13} />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('tablet')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] ${
                      viewportMode === 'tablet'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="iPad / Tablet Viewport (768px)"
                  >
                    <Tablet size={13} />
                    <span className="hidden sm:inline">iPad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] ${
                      viewportMode === 'mobile'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Mobile Viewport (375px)"
                  >
                    <Smartphone size={13} />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Browser / Device Shell */}
            <div className="bg-slate-900/5 p-3 sm:p-5 rounded-3xl border border-slate-200">
              
              {/* =====================================================
                  DESKTOP & IPAD PREVIEW MODE
                 ===================================================== */}
              {(viewportMode === 'desktop' || viewportMode === 'tablet') && (
                <div
                  className={`bg-white shadow-xl overflow-hidden transition-all duration-200 ${
                    viewportMode === 'tablet'
                      ? 'max-w-[768px] mx-auto rounded-[24px] border-[6px] border-slate-800'
                      : 'rounded-2xl border border-slate-300'
                  }`}
                >
                  
                  {/* Browser Chrome Header */}
                  <div className="bg-[#f0f0ee] border-b border-[#e5e5e3] px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                      <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                    </div>

                    <div className="flex-1 max-w-md bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2 text-xs text-slate-500 font-mono shadow-2xs">
                      <Globe size={12} className="text-slate-400" />
                      <span className="text-slate-700 truncate">
                        https://{SITE_DOMAIN}{form.targetValue || ''}
                      </span>
                    </div>

                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                      Client Preview
                    </div>
                  </div>

                  {/* -------------------------------------------------
                      DESKTOP: HEADER NAVIGATION PREVIEW
                     ------------------------------------------------- */}
                  {effectiveLocation === 'main' ? (
                    <div>
                      {/* Top Utility Bar */}
                      <div className="bg-[#F8F8F6] border-b border-[#E7E7E5] text-[10px] text-[#737373] py-1.5 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                          <span className="font-semibold text-[#171717] shrink-0">Thu, Oct 24, 2026</span>
                          {viewportMode === 'desktop' && (
                            <>
                              <span>•</span>
                              <span className="truncate">The Independent Product Review &amp; Smart Deals Journal</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#737373] shrink-0">
                          <span>About Us</span>
                          <span>Contact</span>
                          {viewportMode === 'desktop' && <span>Editorial Guidelines</span>}
                        </div>
                      </div>

                      {/* Masthead */}
                      <div className={`bg-white py-4 ${viewportMode === 'tablet' ? 'px-4' : 'px-6'} border-b border-[#E7E7E5] flex items-center justify-between gap-4`}>
                        <div>
                          <span className={`font-editorial ${viewportMode === 'tablet' ? 'text-2xl' : 'text-3xl'} font-black text-[#171717] tracking-tight`}>
                            {SITE_NAME}<span className="text-brand-primary">.</span>
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-[#737373] block mt-0.5">
                            Product Reviews &amp; Deals
                          </span>
                        </div>

                        {/* Partner Spotlight Banner in Masthead (Desktop only) */}
                        {viewportMode === 'desktop' && (
                          <div className="flex items-center justify-between gap-3 bg-[#171717] text-white px-4 py-2 rounded-lg text-xs max-w-sm">
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/20 px-1.5 py-0.5 rounded">
                                Partner Deal
                              </span>
                              <div className="font-bold text-[11px] truncate">Featured Partner Promo Up to 65% Off</div>
                            </div>
                            <span className="text-[10px] font-bold bg-brand-primary text-white px-2 py-1 rounded shrink-0">
                              View →
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CLIENT STICKY NAVIGATION BAR (The target of this preview) */}
                      <div className="bg-white border-b-2 border-[#171717] px-4 flex items-center justify-between relative shadow-2xs">
                        <div className="flex items-center overflow-x-auto scrollbar-none py-0 space-x-1">
                          
                          {/* Home Link */}
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#171717] px-3 py-2.5 border-b-2 border-transparent">
                            HOME
                          </div>

                          {/* Dynamic Navigation Items */}
                          {headerMenuItems.map((item) => {
                            const isLiveItem = item.id === (existing?.id ?? 999999);
                            return (
                              <div
                                key={item.id}
                                className={`text-[11px] font-bold tracking-wider uppercase px-3 py-2.5 transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
                                  isLiveItem
                                    ? 'border-brand-primary bg-rose-50 text-brand-primary ring-2 ring-brand-primary/40 rounded-t-lg'
                                    : item.isActive
                                    ? 'border-transparent text-[#171717] hover:text-brand-primary'
                                    : 'border-transparent text-slate-300 line-through'
                                }`}
                              >
                                <span>{item.title || 'Untitled'}</span>
                                {isLiveItem && (
                                  <span className="text-[8px] font-black uppercase tracking-widest bg-brand-primary text-white px-1.5 py-0.2 rounded-full animate-pulse shadow-2xs">
                                    Live
                                  </span>
                                )}
                                {!item.isActive && (
                                  <span className="text-[8px] font-bold text-slate-400">
                                    (Hidden)
                                  </span>
                                )}
                              </div>
                            );
                          })}

                        </div>

                        {/* Search Icon in Header */}
                        <div className="text-[#737373] text-xs font-semibold flex items-center gap-1 pl-3 shrink-0">
                          <Search size={14} />
                          <span className="hidden sm:inline">Search</span>
                        </div>
                      </div>

                      {/* Simulated Page Content (Hero + Featured Deals) */}
                      <div className="p-4 sm:p-6 bg-slate-50 space-y-4">
                        
                        {/* Flash News Banner */}
                        <div className="flex items-center gap-2 bg-[#F8F8F6] border border-[#E7E7E5] px-3 py-1.5 rounded-lg text-xs">
                          <span className="bg-brand-primary text-white font-bold text-[9px] uppercase px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <Zap size={10} className="fill-white" /> Flash News
                          </span>
                          <span className="text-[11px] text-slate-800 font-semibold truncate">
                            Nilight 20-Inch Curved LED Light Bar: 500-Mile Extreme Off-Road Test &amp; 65% Discount
                          </span>
                        </div>

                        {/* Simulated Store Hero Banner */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                              Live Navigation Preview
                            </span>
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                              Target Destination: <span className="font-mono text-brand-primary">{form.targetValue || '/'}</span>
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Clicking this menu item in public will navigate visitors directly to this route.
                            </p>
                          </div>
                          <span className="shrink-0 bg-brand-primary text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-2xs flex items-center gap-1">
                            Visit Link <ExternalLink size={12} />
                          </span>
                        </div>

                      </div>
                    </div>
                  ) : (
                    /* -------------------------------------------------
                        DESKTOP: FOOTER SITEMAP PREVIEW
                       ------------------------------------------------- */
                    <div className="bg-[#171717] text-[#D4D4D0] p-6 space-y-6">
                      <div className={`grid ${viewportMode === 'tablet' ? 'grid-cols-2' : 'grid-cols-3'} gap-6 text-xs`}>
                        
                        {/* Brand Column */}
                        <div className="space-y-2">
                          <div className="font-editorial text-xl font-bold text-white">
                            {SITE_NAME}<span className="text-brand-primary">.</span>
                          </div>
                          <p className="text-[11px] text-[#A8A8A2] leading-relaxed">
                            Independent product review journal and curated deal discovery platform.
                          </p>
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck size={12} /> 100% Tested Promo Codes
                          </div>
                        </div>

                        {/* Editorial Sections */}
                        <div className="space-y-2">
                          <div className="text-white font-bold text-[11px] uppercase tracking-wider border-b border-[#262626] pb-1">
                            Editorial Sections
                          </div>
                          <div className="space-y-1 text-[11px] text-[#A8A8A2]">
                            <div>Technology &amp; Innovations</div>
                            <div>Business &amp; Smart Economy</div>
                            <div>Product Reviews</div>
                          </div>
                        </div>

                        {/* Footer Sitemap (Where this item lives) */}
                        <div className="space-y-2">
                          <div className="text-white font-bold text-[11px] uppercase tracking-wider border-b border-[#262626] pb-1 flex items-center justify-between">
                            <span>Trust &amp; Sitemap</span>
                            <span className="text-[9px] text-brand-primary font-bold">Active Column</span>
                          </div>
                          <div className="space-y-1.5 text-[11px]">
                            {footerMenuItems.map((item) => {
                              const isLiveItem = item.id === (existing?.id ?? 999999);
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between px-2 py-1 rounded transition ${
                                    isLiveItem
                                      ? 'bg-brand-primary/20 border border-brand-primary text-white font-bold'
                                      : item.isActive
                                      ? 'text-[#A8A8A2] hover:text-white'
                                      : 'text-zinc-600 line-through'
                                  }`}
                                >
                                  <span>{item.title || 'Untitled'}</span>
                                  {isLiveItem && (
                                    <span className="text-[8px] bg-brand-primary text-white px-1.5 py-0.2 rounded font-black">
                                      Live Item
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      <div className="border-t border-[#262626] pt-3 text-center text-[10px] text-[#737373]">
                        © 2026 {SITE_NAME}. All rights reserved.
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* =====================================================
                  MOBILE PHONE PREVIEW MODE (375px Device Frame)
                 ===================================================== */}
              {viewportMode === 'mobile' && (
                <div className="max-w-[340px] mx-auto bg-black rounded-[40px] p-3 shadow-2xl border-4 border-slate-700">
                  
                  {/* Phone Screen */}
                  <div className="bg-white rounded-[32px] overflow-hidden min-h-[520px] flex flex-col relative text-slate-900 border border-slate-200">
                    
                    {/* Status Bar */}
                    <div className="bg-slate-900 text-white px-6 pt-2 pb-1.5 flex items-center justify-between text-[11px] font-bold">
                      <span>9:41</span>
                      <div className="w-20 h-4 bg-black rounded-full" />
                      <span>5G 100%</span>
                    </div>

                    {/* Mobile Browser Address Bar */}
                    <div className="bg-[#f0f0ee] border-b border-[#e5e5e3] px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="truncate">{SITE_DOMAIN}{form.targetValue || ''}</span>
                      <RotateCcw size={10} />
                    </div>

                    {/* Mobile Header Bar */}
                    <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between">
                      <span className="font-editorial text-xl font-bold tracking-tight text-[#171717]">
                        {SITE_NAME}<span className="text-brand-primary">.</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {mobileDrawerOpen ? <X size={14} /> : <MenuIcon size={14} />}
                          <span className="text-[10px]">{mobileDrawerOpen ? 'Close' : 'Menu'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Mobile Navigation Drawer */}
                    {mobileDrawerOpen ? (
                      <div className="p-4 bg-white flex-1 space-y-4 animate-fadeIn">
                        
                        {/* Drawer Section Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                            Mobile Navigation Links
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            Tap to inspect
                          </span>
                        </div>

                        {/* Mobile Nav Links List */}
                        <div className="space-y-1.5">
                          {headerMenuItems.map((item) => {
                            const isLiveItem = item.id === (existing?.id ?? 999999);
                            return (
                              <div
                                key={item.id}
                                className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                                  isLiveItem
                                    ? 'bg-rose-50 border border-brand-primary text-brand-primary font-bold shadow-2xs'
                                    : item.isActive
                                    ? 'bg-slate-50 text-slate-800 font-semibold'
                                    : 'bg-slate-50 text-slate-400 line-through'
                                }`}
                              >
                                <span className="uppercase">{item.title || 'Untitled'}</span>
                                {isLiveItem ? (
                                  <span className="text-[9px] font-black bg-brand-primary text-white px-2 py-0.5 rounded-full animate-pulse">
                                    ★ Live
                                  </span>
                                ) : (
                                  <ChevronRight size={12} className="text-slate-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer Link Preview in Mobile */}
                        {form.position === 'footer' && (
                          <div className="pt-3 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Footer Placement Preview
                            </span>
                            <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between">
                              <span className="font-bold">{form.title || 'Footer Item'}</span>
                              <span className="text-[9px] bg-brand-primary text-white px-2 py-0.5 rounded">Footer</span>
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 text-center pt-2">
                          Displays in mobile drawer on phones and tablets.
                        </div>
                      </div>
                    ) : (
                      /* Mobile Screen Content When Drawer is Closed */
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-brand-primary">
                          <MenuIcon size={24} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-800">Mobile Menu Closed</h4>
                        <p className="text-[11px] text-slate-500">
                          Tap the "Menu" button above to open the drawer and inspect your menu item.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMobileDrawerOpen(true)}
                          className="text-xs font-bold text-brand-primary bg-rose-50 py-2 rounded-xl border border-rose-200 cursor-pointer"
                        >
                          Open Mobile Drawer Preview
                        </button>
                      </div>
                    )}

                    {/* Mobile Home Bar */}
                    <div className="p-2 flex justify-center bg-white border-t border-slate-100">
                      <div className="w-28 h-1 bg-slate-300 rounded-full" />
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </form>
    </AdminFormPage>
  );
}
