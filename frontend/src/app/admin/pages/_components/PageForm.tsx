'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { SITE_DOMAIN } from '@/constants/site';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import { type StaticPageData } from '../_lib/data';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { Eye, Edit2, Monitor, Tablet, Smartphone, AlertCircle } from 'lucide-react';

interface PageFormState {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  sortOrder: number;
  isActive: boolean;
}

const FORM_ID = 'static-page-form';

export default function PageForm({ id }: { id?: string }) {
  const isEdit = id !== undefined;
  const [pageData, setPageData] = useState<StaticPageData | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let mounted = true;
    setLoading(true);

    apiClient
      .get(`${API_ENDPOINTS.ADMIN.PAGES}/${id}`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data;
        if (data && (data.id || data.title)) {
          setPageData({
            id: Number(data.id),
            title: data.title || '',
            slug: data.slug || '',
            content: data.content || '',
            metaTitle: data.metaTitle || `${data.title} - HeyGoodly`,
            metaDescription: data.metaDescription || `Read about ${data.title} on HeyGoodly.`,
            sortOrder: Number(data.sortOrder || 1),
            isActive: data.isActive !== false,
            updatedAt: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : 'Today',
          });
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to load static page from backend:', err);
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
  if (isEdit && (notFound || !pageData)) return <FormNotFound backHref={ROUTES.ADMIN.PAGES} entity="Page" />;

  const existing = pageData || undefined;

  const initial: PageFormState = existing
    ? {
        title: existing.title,
        slug: existing.slug,
        content: existing.content || '',
        metaTitle: existing.metaTitle || `${existing.title} - HeyGoodly`,
        metaDescription: existing.metaDescription || `Read about ${existing.title} on HeyGoodly.`,
        sortOrder: existing.sortOrder,
        isActive: existing.isActive,
      }
    : {
        title: '',
        slug: '',
        content: '',
        metaTitle: '',
        metaDescription: '',
        sortOrder: 1,
        isActive: true,
      };

  return <PageFormInner key={id ?? 'new'} existing={existing} initial={initial} />;
}

const PAGE_FIELD_LABELS: Record<string, string> = {
  title: 'Page Title',
  slug: 'URL Slug',
  content: 'Document Content (Microsoft Word Studio)',
};

function PageFormInner({ existing, initial }: { existing?: StaticPageData; initial: PageFormState }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [form, setForm] = useState<PageFormState>(initial);
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(existing?.slug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      nextErrors.title = t('Please enter the Page Title.');
    }
    const cleanSlug = toValidSlug(form.slug.trim() || form.title);
    if (form.title.trim() && !cleanSlug) {
      nextErrors.slug = t('URL Slug must contain letters or numbers.');
    }
    const strippedContent = (form.content || '').replace(/<[^>]*>/g, '').trim();
    if (!strippedContent) {
      nextErrors.content = t('Please write the page content.');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstKey = Object.keys(nextErrors)[0];
      const fieldNames = Object.keys(nextErrors)
        .map((k) => t(PAGE_FIELD_LABELS[k] || k))
        .join(', ');
      toast.error(`${t('Please check required fields')}: ${fieldNames}`);
      scrollToFormField(firstKey);
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: cleanSlug,
      content: form.content,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };

    try {
      if (existing) {
        const res = await apiClient.put(`${API_ENDPOINTS.ADMIN.PAGES}/${existing.id}`, payload);
        toast.success(res.data?.message || `Updated page "${form.title}" successfully!`);
      } else {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN.PAGES, payload);
        toast.success(res.data?.message || `Created page "${form.title}" successfully!`);
      }
      router.push(ROUTES.ADMIN.PAGES);
    } catch (err: any) {
      const mappedErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && typeof err.response.data.errors === 'object') {
        Object.assign(mappedErrors, err.response.data.errors);
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to save page.';
      if (err?.response?.data?.code === 'DUPLICATE_RESOURCE' || /slug/i.test(msg)) {
        mappedErrors.slug = msg;
      }
      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const fieldNames = Object.keys(mappedErrors)
          .map((k) => t(PAGE_FIELD_LABELS[k] || k))
          .join(', ');
        toast.error(`${t('Please check required fields')}: ${fieldNames} — ${mappedErrors[firstKey]}`);
        scrollToFormField(firstKey);
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
            ? 'bg-[#2b579a] text-white shadow-2xs'
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
      title={existing ? `Edit Page: ${existing.title}` : 'Create Static Page'}
      description="Publish or update legal disclosures, about information, and compliance policy pages."
      backHref={ROUTES.ADMIN.PAGES}
      backLabel="Back to pages"
      formId={FORM_ID}
      submitLabel={existing ? 'Save Page' : 'Publish Page'}
      headerActions={headerActions}
      width="full"
    >
      {activeTab === 'edit' ? (
        <form noValidate id={FORM_ID} onSubmit={handleSave} className="space-y-6">
          <FormQuickGuide
            title="Quick Static Page Setup"
            description="Only Page Title (*) and Document Content (*) are required. URL Slug and SEO Meta Title are generated automatically from the Page Title."
          />
          <FormErrorBanner errors={errors} fieldLabels={PAGE_FIELD_LABELS} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Column (Left - 2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <FormSection title="Page Content & Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Page Title *</label>
                  <input
                    type="text"
                    data-field="title"
                    value={form.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({
                        ...form,
                        title: val,
                        slug: slugTouched ? form.slug : toValidSlug(val),
                        metaTitle: form.metaTitle || `${val} - HeyGoodly`,
                      });
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g. Editorial Guidelines & Policy"
                    className={`${inputClass} ${errors.title ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.title && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.title}
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
                      setForm({ ...form, slug: val });
                      if (errors.slug) setErrors((prev) => ({ ...prev, slug: '' }));
                    }}
                    onBlur={() => {
                      setForm((prev) => ({
                        ...prev,
                        slug: toValidSlug(prev.slug || prev.title),
                      }));
                    }}
                    placeholder={toValidSlug(form.title) || 'e.g. editorial-guidelines'}
                    className={`${inputClass} font-mono ${errors.slug ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                  />
                  {errors.slug && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.slug}
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection title="Search Engine Optimization (SEO)">
              <div className="space-y-1">
                <label className={labelClass}>Meta Title</label>
                <input
                  type="text"
                  value={form.metaTitle}
                  onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                  placeholder="e.g. Editorial Guidelines - HeyGoodly"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Meta Description</label>
                <textarea
                  rows={3}
                  value={form.metaDescription}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  placeholder="Brief description for search engines..."
                  className={inputClass}
                />
              </div>
            </FormSection>
          </div>

          {/* Sidebar Column (Right - 1 Col) */}
          <div className="lg:col-span-1 space-y-6">
            <FormSection title="Publishing Status">
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Published & Active</span>
                    <span className="text-[11px] text-slate-400">Accessible on live site</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                </label>

                <div className="space-y-1">
                  <label className={labelClass}>Display Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 1 })}
                    className={inputClass}
                  />
                  <span className="text-[11px] text-slate-400">Position in footer / legal list</span>
                </div>
              </div>
            </FormSection>

            {/* Google SERP Preview Card */}
            <FormSection title="Google Search Preview">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                  <span>{SITE_DOMAIN}</span>
                  <span>›</span>
                  <span className="truncate">{form.slug || 'page-slug'}</span>
                </div>
                <h4 className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer truncate">
                  {form.metaTitle || form.title || 'Page Title'}
                </h4>
                <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                  {form.metaDescription || 'Read our official legal disclosure, terms of service, and editorial guidelines on HeyGoodly...'}
                </p>
              </div>
            </FormSection>
          </div>
        </div>

        {/* FULL-WIDTH DEDICATED WORD STUDIO DOCUMENT CANVAS */}
        <div className="w-full" data-field="content">
          <FormSection
            title="Document Content (Microsoft Word Studio)"
            description="Word-style document editor • Full support for Font Family, Font Size, Data Tables, Alignment & A4 Paper View"
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
                setForm({ ...form, content: html });
                if (errors.content) setErrors((prev) => ({ ...prev, content: '' }));
              }}
              minHeight="560px"
              placeholder="Draft terms of service, privacy policy, or editorial about page content here..."
            />
            {errors.content && (
              <p className="text-[11px] font-semibold text-rose-600 mt-2 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.content}
              </p>
            )}
          </FormSection>
        </div>
      </form>
      ) : (
        /* LIVE CLIENT STATIC PAGE PREVIEW VIEW */
        <div className="space-y-6 animate-fadeIn">
          {/* Preview Toolbar with Device Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Eye size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Client Static Page Preview</h3>
                <p className="text-[11px] text-slate-400">Page URL: https://{SITE_DOMAIN}/{form.slug || 'about-us'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  previewDevice === 'desktop' ? 'bg-[#2b579a] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor size={13} />
                <span>Desktop (1000px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  previewDevice === 'tablet' ? 'bg-[#2b579a] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet size={13} />
                <span>Tablet (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  previewDevice === 'mobile' ? 'bg-[#2b579a] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={13} />
                <span>Mobile (375px)</span>
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex justify-center items-start overflow-x-auto py-2">
            <div
              className={`transition-all duration-300 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden ${
                previewDevice === 'desktop'
                  ? 'w-full max-w-[1000px]'
                  : previewDevice === 'tablet'
                  ? 'w-[768px]'
                  : 'w-[375px] border-4 border-slate-800'
              }`}
            >
              {/* Browser mockup header */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-0.5 text-[11px] text-slate-500 font-mono truncate">
                  https://{SITE_DOMAIN}/{form.slug || 'about-us'}
                </div>
              </div>

              {/* Page Content */}
              <div className="p-6 sm:p-12 space-y-6">
                <div className="space-y-2 border-b border-slate-100 pb-6">
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <span>Home</span>
                    <span>/</span>
                    <span className="text-slate-600 font-semibold">{form.title || 'Page Title'}</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
                    {form.title || 'Page Title'}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span>Last updated: Today</span>
                    <span>•</span>
                    <span className={form.isActive ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {form.isActive ? '✓ Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <div
                  className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-p:my-3 prose-p:leading-relaxed prose-a:text-[#2b579a] prose-a:underline"
                  dangerouslySetInnerHTML={{
                    __html: form.content || '<p class="text-slate-400 italic">Page content is being updated...</p>',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminFormPage>
  );
}
