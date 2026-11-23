'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { SITE_NAME } from '@/constants/site';
import { Article } from '@/types/deals';
import postService from '@/services/postService';
import categoryService, { CategoryItem } from '@/services/categoryService';
import tagService, { TagItem } from '@/services/tagService';
import Pagination from '@/components/admin/Pagination';
import NewsSideBannersFrame from '@/components/posts/NewsSideBannersFrame';
import {
  BookOpen,
  Clock,
  Calendar,
  ArrowRight,
  Layers,
  ChevronRight,
  Hash,
  X,
  ChevronDown,
  Search,
  Check,
  Newspaper,
  ShieldCheck,
  Store as StoreIcon,
} from 'lucide-react';
import { formatCurrentMonthYear } from '@/lib/utils/formatters';

export type PostDirectoryMode = 'all' | 'review' | 'news';

interface PostsDirectoryViewProps {
  /** When set (e.g. on /reviews or /news), locks the feed to that postType and adapts hero copy. */
  lockedPostType?: 'review' | 'news';
}

export default function PostsDirectoryView({ lockedPostType }: PostsDirectoryViewProps) {
  const currentMonthYear = formatCurrentMonthYear();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTypeFromQuery = useMemo<PostDirectoryMode>(() => {
    if (lockedPostType) return lockedPostType;
    const raw = (searchParams?.get('type') || '').toLowerCase();
    if (raw === 'review' || raw === 'reviews') return 'review';
    if (raw === 'news') return 'news';
    return 'all';
  }, [lockedPostType, searchParams]);

  const [postTypeFilter, setPostTypeFilter] = useState<PostDirectoryMode>(initialTypeFromQuery);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allPostsTotal, setAllPostsTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 9;

  useEffect(() => {
    setPostTypeFilter(initialTypeFromQuery);
  }, [initialTypeFromQuery]);

  // Custom Topics Popover State
  const [isTopicsPopoverOpen, setIsTopicsPopoverOpen] = useState(false);
  const [popoverSearch, setPopoverSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Custom Category Popover State
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsTopicsPopoverOpen(false);
      }
      if (categoryPopoverRef.current && !categoryPopoverRef.current.contains(event.target as Node)) {
        setIsCategoryPopoverOpen(false);
      }
    }
    if (isTopicsPopoverOpen || isCategoryPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTopicsPopoverOpen, isCategoryPopoverOpen]);

  const handleSelectPostType = (nextType: PostDirectoryMode) => {
    if (lockedPostType) return;
    setPostTypeFilter(nextType);
    setCurrentPage(1);
    setAllPostsTotal(null);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (nextType === 'all') {
      params.delete('type');
    } else {
      params.set('type', nextType);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filteredPopoverTags = useMemo(() => {
    if (!popoverSearch.trim()) return allTags;
    const q = popoverSearch.trim().toLowerCase();
    return allTags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [allTags, popoverSearch]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [categories, categorySearch]);

  const toggleCategory = (catSlug: string) => {
    const clean = catSlug.trim();
    if (!clean || clean.toLowerCase() === 'all') {
      setActiveCategories([]);
      setCurrentPage(1);
      return;
    }
    setActiveCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === clean.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.toLowerCase() !== clean.toLowerCase());
      }
      return [...prev, clean];
    });
    setCurrentPage(1);
  };

  const removeCategory = (catSlug: string) => {
    setActiveCategories((prev) => prev.filter((c) => c.toLowerCase() !== catSlug.toLowerCase()));
    setCurrentPage(1);
  };

  const clearAllCategories = () => {
    setActiveCategories([]);
    setCurrentPage(1);
  };

  const toggleTag = (tagName: string) => {
    const clean = tagName.trim();
    if (!clean) return;
    setActiveTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === clean.toLowerCase());
      if (exists) {
        return prev.filter((t) => t.toLowerCase() !== clean.toLowerCase());
      }
      return [...prev, clean];
    });
    setCurrentPage(1);
  };

  const removeTag = (tagName: string) => {
    setActiveTags((prev) => prev.filter((t) => t.toLowerCase() !== tagName.toLowerCase()));
    setCurrentPage(1);
  };

  const clearAllTags = () => {
    setActiveTags([]);
    setCurrentPage(1);
  };

  useEffect(() => {
    let active = true;
    async function loadMeta() {
      const [cats, tags] = await Promise.all([
        categoryService.getCategories('post'),
        tagService.getPublicTags(),
      ]);
      if (!active) return;
      setCategories(cats);
      setAllTags(tags);
    }
    loadMeta();
    return () => {
      active = false;
    };
  }, []);

  const visibleTopics = useMemo(() => {
    if (!allTags || allTags.length === 0) return [];
    const sorted = [...allTags].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if ((b.postsCount || 0) !== (a.postsCount || 0)) return (b.postsCount || 0) - (a.postsCount || 0);
      return a.name.localeCompare(b.name);
    });
    const topSlice = sorted.slice(0, 12);
    const missingSelected = allTags.filter(
      (t) =>
        activeTags.some(
          (at) => at.toLowerCase() === t.name.toLowerCase() || at.toLowerCase() === t.slug.toLowerCase()
        ) && !topSlice.some((v) => v.id === t.id)
    );
    if (missingSelected.length > 0) {
      return [...missingSelected, ...topSlice.slice(0, Math.max(1, 12 - missingSelected.length))];
    }
    return topSlice;
  }, [allTags, activeTags]);

  useEffect(() => {
    let isMounted = true;
    async function fetchPosts() {
      setIsLoading(true);
      const res = await postService.getPosts({
        postType: postTypeFilter,
        categorySlug: activeCategories.length > 0 ? activeCategories.join(',') : undefined,
        tag: activeTags.length > 0 ? activeTags.join(',') : undefined,
        page: currentPage,
        size: pageSize,
        sortBy: 'newest',
      });

      if (isMounted) {
        setArticles(res.items);
        setTotalPages(Math.max(1, res.totalPages));
        setTotalCount(res.total);
        if (activeCategories.length === 0 && activeTags.length === 0) {
          setAllPostsTotal(res.total);
        }
        setIsLoading(false);
      }
    }

    fetchPosts();
    return () => {
      isMounted = false;
    };
  }, [postTypeFilter, activeCategories, activeTags, currentPage]);

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const isNewsMode = postTypeFilter === 'news';
  const isReviewMode = postTypeFilter === 'review';

  const heroMeta = useMemo(() => {
    if (isNewsMode) {
      return {
        breadcrumb: 'News & Insights',
        eyebrow: `${SITE_NAME} Newsroom & Editorial Desk`,
        title: `Latest News, Trends & Consumer Insights (${currentMonthYear})`,
        subtitle:
          'Curated industry news, consumer reports, product launches, and trending stories updated daily by our editorial desk.',
        sectionHeading: 'Latest News Articles',
        featuredBadge: 'Top Story',
      };
    }
    if (isReviewMode) {
      return {
        breadcrumb: 'Product Reviews',
        eyebrow: `${SITE_NAME} Independent Test Lab`,
        title: `Independent Product Reviews & Buying Guides (${currentMonthYear})`,
        subtitle:
          'Unbiased laboratory tests, comprehensive brand evaluations, and verified merchant offers written by our testing specialists.',
        sectionHeading: 'Product Reviews',
        featuredBadge: 'Featured Review',
      };
    }
    return {
      breadcrumb: 'Editorial Archive & Reviews',
      eyebrow: `${SITE_NAME} Editorial Archive & Test Lab`,
      title: `Product Reviews, Buying Guides & News (${currentMonthYear})`,
      subtitle:
        'Explore hands-on product reviews linked with verified merchant deals alongside daily editorial news and consumer insights.',
      sectionHeading: 'Editorial Articles',
      featuredBadge: 'Featured Editorial',
    };
  }, [isNewsMode, isReviewMode, currentMonthYear]);

  const isPostReview = (art: Article) => Boolean(art.storeSlug || art.storeId);

  return (
    <div className="bg-[#f8fafc] min-h-screen py-8 sm:py-12">
      <NewsSideBannersFrame enabled={isNewsMode}>
        <div className="max-w-7xl mx-auto px-4 space-y-8 sm:space-y-10">

          {/* Breadcrumb Navigation */}
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href={ROUTES.PUBLIC.HOME} className="hover:text-brand-primary transition">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-900 font-semibold">{heroMeta.breadcrumb}</span>
          </nav>

          {/* Page Header Banner */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-primary dark:text-brand-primary-light uppercase tracking-widest">
                {isNewsMode ? <Newspaper size={16} /> : isReviewMode ? <ShieldCheck size={16} /> : <BookOpen size={16} />}
                <span>{heroMeta.eyebrow}</span>
              </div>

              {/* Type Switcher Tabs (Only on unified /posts page) */}
              {!lockedPostType && (
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80">
                  <button
                    type="button"
                    onClick={() => handleSelectPostType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      postTypeFilter === 'all'
                        ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen size={13} />
                    <span>All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPostType('review')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      postTypeFilter === 'review'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck size={13} />
                    <span>Reviews</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPostType('news')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      postTypeFilter === 'news'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Newspaper size={13} />
                    <span>News</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
                {heroMeta.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                {heroMeta.subtitle}
              </p>
            </div>

            {/* Editorial Filter Hub: Categories & Topics */}
            <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 space-y-4">
              {/* Category Filter Row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-[11px] shrink-0">
                      <Layers size={13} className="text-brand-primary dark:text-brand-primary-light" />
                      <span>Category</span>
                    </div>

                    {activeCategories.map((cSlug) => {
                      const catObj = categories.find((c) => c.slug.toLowerCase() === cSlug.toLowerCase());
                      const name = catObj ? catObj.name : cSlug;
                      return (
                        <button
                          key={cSlug}
                          type="button"
                          onClick={() => removeCategory(cSlug)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-primary-soft text-brand-primary dark:bg-brand-primary/15 dark:text-brand-primary-light border border-brand-primary-border dark:border-brand-primary/35 hover:bg-brand-primary-soft-hover dark:hover:bg-brand-primary/25 transition cursor-pointer"
                          title={`Remove ${name}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                          <span>{name}</span>
                          <X size={11} className="ml-0.5 text-brand-primary" />
                        </button>
                      );
                    })}

                    {activeCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={clearAllCategories}
                        className="text-[11px] font-semibold text-brand-primary hover:text-brand-primary hover:underline cursor-pointer ml-1"
                      >
                        Clear all ({activeCategories.length})
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline">
                    {categories.length + 1} sections
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {/* Horizontal Scroll of Categories */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={clearAllCategories}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        activeCategories.length === 0
                          ? 'bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white shadow-sm shadow-brand-primary/30 ring-2 ring-brand-primary/20'
                          : 'bg-slate-100/90 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>All</span>
                      {allPostsTotal !== null && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          activeCategories.length === 0
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                        }`}>
                          {allPostsTotal}
                        </span>
                      )}
                    </button>

                    {categories.map((cat) => {
                      const isSelected = activeCategories.some(
                        (c) => c.toLowerCase() === cat.slug.toLowerCase()
                      );
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => toggleCategory(cat.slug)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white shadow-sm shadow-brand-primary/30 font-bold ring-2 ring-brand-primary/20'
                              : 'bg-slate-100/90 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white border border-transparent'
                          }`}
                        >
                          {cat.icon && <span className="text-sm">{cat.icon}</span>}
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pinned "All Categories" Popover Trigger & Dropdown OUTSIDE the overflow-x-auto */}
                  <div className="relative shrink-0" ref={categoryPopoverRef}>
                    <button
                      type="button"
                      onClick={() => setIsCategoryPopoverOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-xs ${
                        activeCategories.length > 0 || isCategoryPopoverOpen
                          ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-slate-900 dark:border-white'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200/80 dark:border-zinc-700/80'
                      }`}
                      aria-expanded={isCategoryPopoverOpen}
                    >
                      <Layers size={13} className={activeCategories.length > 0 ? 'text-brand-primary-light' : 'text-brand-primary'} />
                      <span>All Categories ({categories.length})</span>
                      {activeCategories.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {activeCategories.length}
                        </span>
                      )}
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          isCategoryPopoverOpen ? 'rotate-180 text-brand-primary' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {isCategoryPopoverOpen && (
                      <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-3rem))] sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                        {/* Search Header */}
                        <div className="relative mb-2.5">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                          <input
                            type="text"
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            placeholder={`Search ${categories.length} categories...`}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-xs py-2 pl-8.5 pr-8 rounded-xl border border-slate-200 dark:border-zinc-700/80 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                            autoFocus
                          />
                          {categorySearch && (
                            <button
                              type="button"
                              onClick={() => setCategorySearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-400 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Quick Actions & Count */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 px-1 pb-2 border-b border-slate-100 dark:border-zinc-800 font-medium">
                          <span>Showing {filteredCategories.length} of {categories.length} sections</span>
                          {activeCategories.length > 0 && (
                            <button
                              type="button"
                              onClick={clearAllCategories}
                              className="text-brand-primary dark:text-brand-primary-light hover:underline font-bold cursor-pointer"
                            >
                              Reset ({activeCategories.length})
                            </button>
                          )}
                        </div>

                        {/* Category Scrollable List */}
                        <div className="max-h-80 overflow-y-auto space-y-1 pt-2 pr-1 select-none">
                          {filteredCategories.map((cat) => {
                            const isSel = activeCategories.some(
                              (c) => c.toLowerCase() === cat.slug.toLowerCase()
                            );
                            return (
                              <button
                                type="button"
                                key={cat.id}
                                onClick={() => toggleCategory(cat.slug)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                                  isSel
                                    ? 'bg-brand-primary-soft dark:bg-brand-primary/15 text-brand-primary dark:text-brand-primary-light font-bold border border-brand-primary-border dark:border-brand-primary/35 shadow-xs'
                                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {cat.icon ? <span className="text-sm">{cat.icon}</span> : <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />}
                                  <span className="truncate">{cat.name}</span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <div
                                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                                      isSel
                                        ? 'bg-brand-primary border-brand-primary text-white'
                                        : 'border-slate-300 dark:border-zinc-700'
                                    }`}
                                  >
                                    {isSel && <Check size={11} className="stroke-[3]" />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Topics / Tags Filter Row */}
              {allTags.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100/80 dark:border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 text-[11px] shrink-0">
                        <Hash size={13} className="text-indigo-500 dark:text-indigo-400" />
                        <span>Topics &amp; Themes</span>
                      </div>

                      {activeTags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => removeTag(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-primary-soft text-brand-primary dark:bg-brand-primary/15 dark:text-brand-primary-light border border-brand-primary-border dark:border-brand-primary/35 hover:bg-brand-primary-soft-hover dark:hover:bg-brand-primary/25 transition cursor-pointer"
                          title={`Remove #${t}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                          <span>#{t}</span>
                          <X size={11} className="ml-0.5 text-brand-primary" />
                        </button>
                      ))}

                      {activeTags.length > 1 && (
                        <button
                          type="button"
                          onClick={clearAllTags}
                          className="text-[11px] font-semibold text-brand-primary hover:text-brand-primary hover:underline cursor-pointer ml-1"
                        >
                          Clear all ({activeTags.length})
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline">
                      {allTags.length} topics catalogued
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {/* Popular Topics Horizontal Scroll Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 flex-1 min-w-0">
                      {visibleTopics.map((tag) => {
                        const isSelected = activeTags.some(
                          (t) => t.toLowerCase() === tag.name.toLowerCase() || t.toLowerCase() === tag.slug.toLowerCase()
                        );
                        const dotColor = tag.color || '#6366f1';
                        return (
                          <button
                            type="button"
                            key={tag.id}
                            onClick={() => toggleTag(tag.name)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-bold shadow-xs ring-2 ring-brand-primary/40'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-transparent'
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: dotColor }}
                            />
                            <span>#{tag.name}</span>
                            {typeof tag.postsCount === 'number' && tag.postsCount > 0 && (
                              <span className={`text-[10px] ${isSelected ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-400 dark:text-zinc-500'}`}>
                                ({tag.postsCount})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Pinned "All Topics" Trigger & Unclipped Dropdown Popover */}
                    {allTags.length > visibleTopics.length && (
                      <div className="relative shrink-0" ref={popoverRef}>
                        <button
                          type="button"
                          onClick={() => setIsTopicsPopoverOpen((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-xs ${
                            activeTags.length > 0 || isTopicsPopoverOpen
                              ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-slate-900 dark:border-white'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200/80 dark:border-zinc-700/80'
                          }`}
                          aria-expanded={isTopicsPopoverOpen}
                        >
                          <Hash size={13} className={activeTags.length > 0 ? 'text-brand-primary-light' : 'text-indigo-400'} />
                          <span>All Topics ({allTags.length})</span>
                          {activeTags.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {activeTags.length}
                            </span>
                          )}
                          <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 ${
                              isTopicsPopoverOpen ? 'rotate-180 text-brand-primary' : 'text-slate-400'
                            }`}
                          />
                        </button>

                        {isTopicsPopoverOpen && (
                          <div className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-3rem))] sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                            <div className="relative mb-2.5">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                              <input
                                type="text"
                                value={popoverSearch}
                                onChange={(e) => setPopoverSearch(e.target.value)}
                                placeholder={`Search ${allTags.length} topics & themes...`}
                                className="w-full bg-slate-50 dark:bg-zinc-800/80 text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-xs py-2 pl-8.5 pr-8 rounded-xl border border-slate-200 dark:border-zinc-700/80 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                                autoFocus
                              />
                              {popoverSearch && (
                                <button
                                  type="button"
                                  onClick={() => setPopoverSearch('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-400 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 px-1 pb-2 border-b border-slate-100 dark:border-zinc-800 font-medium">
                              <span>Showing {filteredPopoverTags.length} of {allTags.length} topics</span>
                              {activeTags.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => clearAllTags()}
                                  className="text-brand-primary dark:text-brand-primary-light hover:underline font-bold cursor-pointer"
                                >
                                  Clear selected ({activeTags.length})
                                </button>
                              )}
                            </div>

                            <div className="max-h-80 overflow-y-auto space-y-1 pt-2 pr-1 select-none">
                              {filteredPopoverTags.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                                  No topics matching &quot;{popoverSearch}&quot;
                                </div>
                              ) : (
                                filteredPopoverTags.map((tag) => {
                                  const isSel = activeTags.some(
                                    (t) =>
                                      t.toLowerCase() === tag.name.toLowerCase() ||
                                      t.toLowerCase() === tag.slug.toLowerCase()
                                  );
                                  return (
                                    <button
                                      type="button"
                                      key={tag.id}
                                      onClick={() => toggleTag(tag.name)}
                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                                        isSel
                                          ? 'bg-brand-primary-soft dark:bg-brand-primary/15 text-brand-primary dark:text-brand-primary-light font-bold border border-brand-primary-border dark:border-brand-primary/35 shadow-xs'
                                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border border-transparent'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                          style={{ backgroundColor: tag.color || '#6366f1' }}
                                        />
                                        <span className="truncate">#{tag.name}</span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {typeof tag.postsCount === 'number' && tag.postsCount > 0 && (
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            isSel
                                              ? 'bg-brand-primary-soft-hover dark:bg-brand-primary/30 text-brand-primary-active dark:text-brand-primary-light'
                                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                                          }`}>
                                            {tag.postsCount}
                                          </span>
                                        )}
                                        <div
                                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                                            isSel
                                              ? 'bg-brand-primary border-brand-primary text-white'
                                              : 'border-slate-300 dark:border-zinc-700'
                                          }`}
                                        >
                                          {isSel && <Check size={11} className="stroke-[3]" />}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Featured Editorial Highlight (Only on page 1 with all categories) */}
          {activeCategories.length === 0 && activeTags.length === 0 && currentPage === 1 && featuredArticle && (
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow grid grid-cols-1 lg:grid-cols-12 gap-0 group">
              <div className="lg:col-span-7 relative h-56 sm:h-64 lg:h-auto min-h-[220px] sm:min-h-[280px] overflow-hidden bg-slate-100">
                {featuredArticle.imageUrl ? (
                  <Image
                    src={featuredArticle.imageUrl}
                    alt={featuredArticle.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                    <BookOpen size={48} className="text-white/25" />
                  </div>
                )}
                <span className={`absolute top-4 left-4 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${
                  isPostReview(featuredArticle) ? 'bg-brand-primary' : 'bg-indigo-600'
                }`}>
                  {heroMeta.featuredBadge}
                </span>
              </div>

              <div className="lg:col-span-5 p-5 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="font-extrabold text-brand-primary uppercase tracking-wider">{featuredArticle.category}</span>
                    {featuredArticle.readTime && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {featuredArticle.readTime}</span>
                      </>
                    )}
                    {featuredArticle.publishedAt && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {featuredArticle.publishedAt}</span>
                      </>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-2xl font-black text-slate-950 group-hover:text-brand-primary transition-colors leading-tight">
                    <Link href={ROUTES.PUBLIC.POST_DETAIL(featuredArticle.slug)}>
                      {featuredArticle.title}
                    </Link>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {featuredArticle.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden relative border border-slate-200 bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {featuredArticle.author.avatar ? (
                        <Image
                          src={featuredArticle.author.avatar}
                          alt={featuredArticle.author.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span>{featuredArticle.author.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">{featuredArticle.author.name}</p>
                      <p className="text-[10px] text-slate-500 leading-tight truncate">{featuredArticle.author.role}</p>
                    </div>
                  </div>

                  <Link
                    href={ROUTES.PUBLIC.POST_DETAIL(featuredArticle.slug)}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-brand-primary hover:text-brand-primary-hover shrink-0 whitespace-nowrap"
                  >
                    {isPostReview(featuredArticle) ? 'Read Review' : 'Read Article'}{' '}
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 3 Articles Per Row Grid */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                <span className={`w-2 h-5 rounded-xs inline-block ${isNewsMode ? 'bg-indigo-600' : 'bg-brand-primary'}`} />
                {heroMeta.sectionHeading} ({totalCount})
              </h2>
              <div className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-pulse">
                    <div className="w-full h-44 bg-slate-100 rounded-xl" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                <p className="text-slate-500 font-semibold text-sm">
                  {isNewsMode
                    ? 'No news articles published yet matching your filter criteria.'
                    : isReviewMode
                    ? 'No product reviews published yet matching your filter criteria.'
                    : 'No matching articles found for the selected filter criteria.'}
                </p>
                <div className="flex items-center justify-center gap-4 pt-1">
                  {activeCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { clearAllCategories(); setCurrentPage(1); }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Search across all categories →
                    </button>
                  )}
                  {(activeCategories.length > 0 || activeTags.length > 0 || (!lockedPostType && postTypeFilter !== 'all')) && (
                    <button
                      type="button"
                      onClick={() => {
                        clearAllCategories();
                        setActiveTags([]);
                        if (!lockedPostType) handleSelectPostType('all');
                        setCurrentPage(1);
                      }}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((art) => {
                  const reviewPost = isPostReview(art);
                  return (
                    <div
                      key={art.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-brand-primary-border transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="h-48 overflow-hidden relative bg-slate-100">
                          {art.imageUrl ? (
                            <Image
                              src={art.imageUrl}
                              alt={art.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                              {reviewPost ? (
                                <BookOpen size={36} className="text-white/25" />
                              ) : (
                                <Newspaper size={36} className="text-white/25" />
                              )}
                            </div>
                          )}
                          <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-slate-200">
                            {art.category}
                          </span>
                          {/* Type pill on unified /posts view */}
                          {!lockedPostType && (
                            <span
                              className={`absolute top-3 right-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${
                                reviewPost
                                  ? 'bg-brand-primary/95 text-white'
                                  : 'bg-indigo-600/95 text-white'
                              }`}
                            >
                              {reviewPost ? 'Review' : 'News'}
                            </span>
                          )}
                        </div>

                        <div className="p-5 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {art.readTime && (
                              <span className="flex items-center gap-1"><Clock size={11} /> {art.readTime}</span>
                            )}
                            {art.readTime && art.publishedAt && <span>•</span>}
                            {art.publishedAt && <span>{art.publishedAt}</span>}
                            {reviewPost && art.storeName && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-brand-primary">
                                  <StoreIcon size={10} /> {art.storeName}
                                </span>
                              </>
                            )}
                          </div>

                          <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-brand-primary transition-colors line-clamp-2 leading-snug">
                            <Link href={ROUTES.PUBLIC.POST_DETAIL(art.slug)}>
                              {art.title}
                            </Link>
                          </h3>

                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {art.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-3 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden relative border border-slate-200 bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {art.author.avatar ? (
                              <Image
                                src={art.author.avatar}
                                alt={art.author.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span>{art.author.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{art.author.name}</p>
                            <p className="text-[9px] text-slate-400 leading-tight truncate">{art.author.role}</p>
                          </div>
                        </div>

                        <Link
                          href={ROUTES.PUBLIC.POST_DETAIL(art.slug)}
                          className="text-xs font-bold text-brand-primary group-hover:text-brand-primary-hover inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                        >
                          {reviewPost ? 'Read Review' : 'Read Article'}{' '}
                          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && articles.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            )}
          </div>

        </div>
      </NewsSideBannersFrame>
    </div>
  );
}
