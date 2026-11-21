'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Plus, ExternalLink, Edit2, Eye, RefreshCw, AlertCircle, ChevronRight, Flame, ArrowRight } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import AdminDevicePreviewFrame from '@/components/admin/AdminDevicePreviewFrame';
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
import { type CategoryData } from '../_lib/data';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { type AdminArticle } from '../../posts/_lib/data';

type CategoryFormState = Pick<CategoryData, 'name' | 'slug' | 'description' | 'sortOrder' | 'isActive'> & {
  imageUrl: string;
};

const FORM_ID = 'category-form';

export default function CategoryForm({ id }: { id?: string }) {
  const isEdit = id !== undefined;
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let mounted = true;
    setLoading(true);

    apiClient
      .get(`${API_ENDPOINTS.ADMIN.CATEGORIES}/${id}`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data;
        if (data && (data.id || data.name)) {
          setCategoryData({
            id: Number(data.id),
            name: data.name || '',
            slug: data.slug || '',
            description: data.description || '',
            articlesCount: Number(data.postCount || 0),
            sortOrder: Number(data.sortOrder || 1),
            isActive: data.isActive !== false,
            imageUrl: data.image || data.imageUrl || '',
          });
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to load category from backend:', err);
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
  if (isEdit && (notFound || !categoryData)) return <FormNotFound backHref={ROUTES.ADMIN.CATEGORIES} entity="Category" />;

  const existing = categoryData || undefined;

  const initial: CategoryFormState = existing
    ? {
        name: existing.name,
        slug: existing.slug,
        description: existing.description,
        sortOrder: existing.sortOrder,
        imageUrl: existing.imageUrl || '',
        isActive: existing.isActive,
      }
    : { name: '', slug: '', description: '', sortOrder: 1, imageUrl: '', isActive: true };

  return <CategoryFormInner key={id ?? 'new'} existing={existing} initial={initial} />;
}

const CATEGORY_FIELD_LABELS: Record<string, string> = {
  name: 'Category Name',
  slug: 'URL Slug',
};

function CategoryFormInner({ existing, initial }: { existing?: CategoryData; initial: CategoryFormState }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [form, setForm] = useState<CategoryFormState>(initial);
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(existing?.slug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [categoryArticles, setCategoryArticles] = useState<AdminArticle[]>([]);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const loadCategoryArticlesOnDemand = async () => {
    if (!existing?.id || articlesLoaded || loadingArticles) return;
    setLoadingArticles(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.POSTS, {
        params: { categoryId: existing.id, size: 20 },
      });
      const list = res.data?.data?.content || res.data?.data;
      if (Array.isArray(list)) {
        setCategoryArticles(
          list.map((p: any): AdminArticle => ({
            id: String(p.id),
            title: p.title || '',
            slug: p.slug || '',
            excerpt: p.excerpt || '',
            content: '',
            imageUrl: p.image || '',
            category: p.categoryName || existing.name,
            categoryId: existing.id,
            author: {
              name: p.authorName || 'HeyGoodly Editorial',
              role: p.authorRole || '',
              avatar: p.authorAvatar || '',
            },
            status: (p.status || 'PUBLISHED') as any,
            views: Number(p.viewCount || 0),
            rating: p.rating ? String(p.rating) : '',
            featured: Boolean(p.isFeatured),
            tags: Array.isArray(p.tags) ? p.tags : [],
            publishedAt: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '',
            readTime: p.readTime || '',
          }))
        );
      }
      setArticlesLoaded(true);
    } catch {
      setCategoryArticles([]);
      setArticlesLoaded(true);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      fieldErrors.name = t('Category name is required');
    }
    const cleanSlug = toValidSlug(form.slug.trim() || form.name);
    if (form.name.trim() && !cleanSlug) {
      fieldErrors.slug = t('URL Slug must contain letters or numbers (e.g. tech).');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      const firstKey = Object.keys(fieldErrors)[0];
      const fieldNames = Object.keys(fieldErrors)
        .map((k) => t(CATEGORY_FIELD_LABELS[k] || k))
        .join(', ');
      toast.error(`${t('Please check required fields')}: ${fieldNames}`);
      scrollToFormField(firstKey);
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: cleanSlug,
      description: form.description?.trim() || '',
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      image: form.imageUrl || '',
    };

    try {
      if (existing) {
        const res = await apiClient.put(`${API_ENDPOINTS.ADMIN.CATEGORIES}/${existing.id}`, payload);
        toast.success(res.data?.message || `Updated category "${form.name}" successfully!`);
      } else {
        const res = await apiClient.post(API_ENDPOINTS.ADMIN.CATEGORIES, payload);
        toast.success(res.data?.message || `Created category "${form.name}" successfully!`);
      }
      router.push(ROUTES.ADMIN.CATEGORIES);
    } catch (err: any) {
      const mappedErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && typeof err.response.data.errors === 'object') {
        Object.assign(mappedErrors, err.response.data.errors);
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to save category.';
      if (err?.response?.data?.code === 'DUPLICATE_RESOURCE' || /slug/i.test(msg)) {
        mappedErrors.slug = msg;
      }
      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        const firstKey = Object.keys(mappedErrors)[0];
        const fieldNames = Object.keys(mappedErrors)
          .map((k) => t(CATEGORY_FIELD_LABELS[k] || k))
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
        onClick={() => {
          setActiveTab('preview');
          loadCategoryArticlesOnDemand();
        }}
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
      title={existing ? `Edit Category: ${existing.name}` : 'Create New Category'}
      description="Configure editorial taxonomy shown in client navigation bars and category landing pages."
      backHref={ROUTES.ADMIN.CATEGORIES}
      backLabel="Back to categories"
      formId={FORM_ID}
      submitLabel={existing ? 'Save Category' : 'Create Category'}
      headerActions={headerActions}
      width="full"
    >
      {activeTab === 'edit' ? (
        <form noValidate id={FORM_ID} onSubmit={handleSave} className="space-y-6">
          <FormQuickGuide
            title="Quick Category Setup"
            description="Only Category Name (*) is required. URL Slug is generated automatically from the category name; Banner Image and Editorial Description are optional."
          />
          <FormErrorBanner errors={errors} fieldLabels={CATEGORY_FIELD_LABELS} />

          {/* ROW 1: CATEGORY INFORMATION (2 COLS) + DISPLAY STATUS (1 COL) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2">
              <FormSection title="Category Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>
                      {t('Category Name')} <span className="text-rose-600 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      data-field="name"
                      value={form.name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          name: nextName,
                          slug: slugTouched ? prev.slug : toValidSlug(nextName),
                        }));
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="e.g. Technology & Computing"
                      className={`${inputClass} ${errors.name ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20 focus:border-rose-500' : ''}`}
                    />
                    {errors.name && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {errors.name}
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
                          slug: toValidSlug(prev.slug || prev.name),
                        }));
                      }}
                      placeholder={toValidSlug(form.name) || 'e.g. tech'}
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
            </div>

            <div className="lg:col-span-1">
              <FormSection title="Display & Taxonomy">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Category Active</span>
                    <span className="text-[11px] text-slate-400">Visible in navigation bar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                </label>
              </FormSection>
            </div>
          </div>

          {/* ROW 2: CATEGORY MEDIA (2 COLS) + QUICK CARD PREVIEW (1 COL) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <FormSection title="Category Media & Cover">
                <ImageUpload
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                  folder="categories"
                  label="Category Header Banner (Optional)"
                  description="Wide cover banner displayed at the top of category landing page."
                  aspectRatio="banner"
                />
              </FormSection>
            </div>

            <div className="lg:col-span-1">
              {/* Quick Card Preview */}
              <FormSection title="Quick Card Preview">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs">
                  {form.imageUrl ? (
                    <div className="h-28 w-full overflow-hidden bg-slate-200 relative">
                      <img src={form.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-linear-to-r from-slate-800 to-slate-900 flex items-center justify-center text-white/40 text-xs font-mono">
                      No banner uploaded
                    </div>
                  )}
                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {form.name || 'Category Name'}
                      </h4>
                      <span className="text-[10px] font-mono font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 shrink-0">
                        /{form.slug || 'slug'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {form.description ? form.description.replace(/<[^>]*>?/gm, '') : 'Category overview description...'}
                    </p>
                  </div>
                </div>
              </FormSection>
            </div>
          </div>

          {/* FULL-WIDTH 100% ROW: DESCRIPTION & EDITORIAL NOTES WORD STUDIO */}
          <div className="w-full">
            <FormSection
              title="Description & Editorial Notes"
              description="Microsoft Word Studio Editor • 100% full-width canvas with full Ribbon support for Font Family, Font Size, Data Tables & Affiliate Blocks"
              headerRight={
                <span className="text-[11px] font-bold text-[#2b579a] bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#2b579a] animate-pulse"></span>
                  <span>Word Studio 100%</span>
                </span>
              }
            >
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
                minHeight="420px"
                initialPaperView={false}
                placeholder="Enter category overview, buying guides, and editorial testing criteria..."
              />
            </FormSection>
          </div>

          {/* FULL-WIDTH ROW: ARTICLES IN THIS CATEGORY */}
          {existing && (
            <div className="w-full">
              <FormSection
                title={`Articles in "${existing.name}" (${articlesLoaded ? categoryArticles.length : existing.articlesCount})`}
                headerRight={
                  <div className="flex items-center gap-2">
                    {!articlesLoaded && existing.articlesCount > 0 && (
                      <button
                        type="button"
                        onClick={loadCategoryArticlesOnDemand}
                        disabled={loadingArticles}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw size={11} className={loadingArticles ? 'animate-spin' : ''} />
                        <span>{loadingArticles ? 'Loading...' : 'Load Articles'}</span>
                      </button>
                    )}
                    <Link
                      href={`/admin/posts?category=${encodeURIComponent(existing.name)}`}
                      className="text-xs font-bold text-slate-600 hover:text-brand-primary inline-flex items-center gap-1"
                    >
                      <span>Manage All</span>
                      <ExternalLink size={11} />
                    </Link>
                    <Link
                      href={`/admin/posts/create?category=${encodeURIComponent(existing.name)}`}
                      className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Plus size={12} />
                      <span>Write Article</span>
                    </Link>
                  </div>
                }
              >
                {!articlesLoaded && existing.articlesCount > 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                    <p>This category contains <strong>{existing.articlesCount}</strong> assigned articles in PostgreSQL.</p>
                    <button
                      type="button"
                      onClick={loadCategoryArticlesOnDemand}
                      disabled={loadingArticles}
                      className="inline-flex items-center gap-1.5 font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      <RefreshCw size={13} className={loadingArticles ? 'animate-spin' : ''} />
                      <span>{loadingArticles ? 'Fetching articles...' : 'Click to load category articles on demand'}</span>
                    </button>
                  </div>
                ) : categoryArticles.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-100">
                    {categoryArticles.map((art) => (
                      <div
                        key={art.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-2xs transition gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {art.imageUrl ? (
                            <img src={art.imageUrl} alt={art.title} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                              <BookOpen size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-brand-primary transition-colors">
                              {art.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{art.author?.name}</span>
                              <span>•</span>
                              <span>{art.publishedAt}</span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">{art.status}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/post/${art.slug}`}
                            target="_blank"
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition shadow-2xs"
                            title="Preview on live site"
                          >
                            <Eye size={12} />
                          </Link>
                          <Link
                            href={`/admin/posts/${art.id}/edit`}
                            className="w-7 h-7 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white flex items-center justify-center transition shadow-2xs"
                            title="Edit article"
                          >
                            <Edit2 size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                    <p>No articles currently assigned to this category.</p>
                    <Link
                      href={`/admin/posts/create?category=${encodeURIComponent(existing.name)}`}
                      className="inline-flex items-center gap-1.5 font-bold text-brand-primary hover:underline"
                    >
                      <Plus size={13} />
                      <span>Write the first article in &ldquo;{existing.name}&rdquo;</span>
                    </Link>
                  </div>
                )}
              </FormSection>
            </div>
          )}
        </form>
      ) : (
        /* LIVE CLIENT CATEGORY LANDING PAGE PREVIEW (1:1 with /category/[slug]) */
        <AdminDevicePreviewFrame
          title="Client Category Landing Page Preview"
          urlPath={`/category/${form.slug || 'category-name'}`}
        >
          {(device) => {
            const isMobile = device === 'mobile';
            const isTablet = device === 'tablet';
            const displayName = form.name.trim() || 'Category Title';
            const hasHtmlDesc = Boolean(form.description && /<[a-z][\s\S]*>/i.test(form.description));

            return (
              <div className={`bg-[#f4f5f7] text-[#171717] ${isMobile ? 'p-3.5 space-y-4' : isTablet ? 'p-5 space-y-6' : 'p-8 space-y-7'}`}>
                <div className="max-w-7xl mx-auto space-y-5">
                  {/* 1. Breadcrumb */}
                  <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>Home</span>
                    <ChevronRight size={12} className="shrink-0" />
                    <span>Categories</span>
                    <ChevronRight size={12} className="shrink-0" />
                    <span className="text-slate-900 font-semibold truncate">{displayName}</span>
                  </nav>

                  {/* 2. Category Header Banner (1:1 with client /category/[slug]) */}
                  <div className={`bg-white border border-slate-200 rounded-2xl ${isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-9'} shadow-2xs`}>
                    <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row items-center justify-between gap-6'}`}>
                      <div className="space-y-3.5 max-w-3xl flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-brand-primary text-white font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-sm shadow-xs">
                            Editorial Desk
                          </span>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                            {categoryArticles.length} Published Articles
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h1 className={`${isMobile ? 'text-2xl' : isTablet ? 'text-3xl' : 'text-4xl'} font-black text-slate-950 tracking-tight font-editorial`}>
                            {displayName}
                          </h1>
                          {form.description ? (
                            hasHtmlDesc ? (
                              <div
                                className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 leading-relaxed prose prose-sm max-w-none`}
                                dangerouslySetInnerHTML={{ __html: form.description }}
                              />
                            ) : (
                              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600 leading-relaxed`}>
                                {form.description}
                              </p>
                            )
                          ) : (
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 italic`}>
                              Explore in-depth buying guides, objective lab reviews, and the best verified promo codes for {displayName}.
                            </p>
                          )}
                        </div>
                      </div>

                      {form.imageUrl && (
                        <div className={`${isMobile ? 'w-full h-36' : 'w-64 h-36'} rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={form.imageUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Toolbar & Sorting */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Flame size={15} className="text-brand-primary" />
                      <span>Editorial Articles ({categoryArticles.length})</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="px-3 py-1.5 rounded-lg font-bold bg-brand-primary text-white shadow-2xs">
                        Latest
                      </span>
                      <span className="px-3 py-1.5 rounded-lg font-bold text-slate-600">
                        Popular
                      </span>
                    </div>
                  </div>

                  {/* 4. Article Grid (1 col mobile, 2 cols iPad, 3 cols desktop) */}
                  {categoryArticles.length > 0 ? (
                    <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : isTablet ? 'grid-cols-2 gap-5' : 'grid-cols-3 gap-6'}`}>
                      {categoryArticles.map((art) => (
                        <div
                          key={art.id}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                        >
                          <div>
                            {art.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={art.imageUrl}
                                alt={art.title}
                                className="w-full h-40 object-cover border-b border-slate-100"
                              />
                            ) : (
                              <div className="w-full h-40 bg-slate-100 border-b border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                {displayName}
                              </div>
                            )}
                            <div className="p-4 space-y-2">
                              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-brand-primary">
                                {displayName}
                              </span>
                              <h4 className="font-editorial text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                                {art.title}
                              </h4>
                            </div>
                          </div>

                          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate">{art.author?.name || 'Editorial Team'}</span>
                            <span className="shrink-0">{art.publishedAt || 'Today'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                      No published articles assigned to this category yet.
                    </div>
                  )}

                  {/* 5. Editorial Archive Callout */}
                  <div className={`bg-white border border-slate-200 rounded-2xl ${isMobile ? 'p-5' : 'p-8'} text-center space-y-3 shadow-2xs`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block">
                      Editorial Archive
                    </span>
                    <h3 className={`font-editorial ${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-slate-900 tracking-tight`}>
                      Explore More In-Depth Product Reviews &amp; Guides
                    </h3>
                    <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                      Browse our full library of laboratory benchmarks, hands-on product evaluations, and smart consumer buying guides across all categories.
                    </p>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs">
                        <span>Explore Full Editorial Archive</span>
                        <ArrowRight size={14} />
                      </span>
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
