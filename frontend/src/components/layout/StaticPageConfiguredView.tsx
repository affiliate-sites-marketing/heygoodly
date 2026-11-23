'use client';

import { type ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ShieldAlert } from 'lucide-react';
import { type StaticPageData } from '@/app/admin/pages/_lib/data';
import { ROUTES } from '@/constants/routes';
import { pageService } from '@/services/pageService';

interface StaticPageConfiguredViewProps {
  /** Slug matching `StaticPageData.slug` in Admin -> Static & Policy Pages */
  slug: string;
  /** Optional fallback layout rendered only when the database record has empty content */
  children?: ReactNode;
}

/**
 * Connects public static pages (`/about-us`, `/privacy-policy`, `/terms`,
 * `/affiliate-disclosure`, `/editorial-guidelines`, and `/pages/[slug]`) to
 * PostgreSQL Database via `pageService.getPublicPage(slug)`.
 */
export default function StaticPageConfiguredView({ slug, children }: StaticPageConfiguredViewProps) {
  const [page, setPage] = useState<StaticPageData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const cleanSlug = slug.replace(/^\/+/, '').toLowerCase();

  useEffect(() => {
    let active = true;
    setLoaded(false);
    pageService.getPublicPage(cleanSlug).then((data) => {
      if (active) {
        setPage(data);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [cleanSlug]);

  if (!loaded) {
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-4xl mx-auto px-4 space-y-8 animate-pulse">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
            <div className="h-5 w-40 bg-slate-200 rounded-full" />
            <div className="h-10 w-2/3 bg-slate-200 rounded-xl" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-4/6 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // 1. Page disabled in Database
  if (page && page.isActive === false) {
    return (
      <div className="bg-slate-50 min-h-[60vh] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Page Currently Unavailable</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            This policy or information page has been temporarily unpublished by the editorial administrator.
          </p>
          <Link
            href={ROUTES.PUBLIC.HOME}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline pt-2"
          >
            <ArrowLeft size={14} /> Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // 2. Database has custom HTML content
  if (page && page.content && page.content.trim().length > 0) {
    return (
      <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .static-editor-body .box-delete-btn,
          .static-editor-body .box-edit-deal-btn,
          .static-editor-body .box-edit-btn,
          .static-editor-body .video-edit-btn,
          .static-editor-body .toc-refresh-btn,
          .static-editor-body .editor-only-controls {
            display: none !important;
          }
          .static-editor-body::after {
            content: '';
            display: table;
            clear: both;
          }
          .static-editor-body h1 {
            font-size: 1.875rem;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
            letter-spacing: -0.025em;
            line-height: 1.25;
            scroll-margin-top: 6rem;
          }
          .static-editor-body h2 {
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
            letter-spacing: -0.02em;
            line-height: 1.3;
            scroll-margin-top: 6rem;
          }
          .static-editor-body h3 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            line-height: 1.35;
            scroll-margin-top: 6rem;
          }
          .static-editor-body h4 {
            font-size: 1.05rem;
            font-weight: 700;
            color: #334155;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            line-height: 1.4;
          }
          .static-editor-body h1:first-child,
          .static-editor-body h2:first-child,
          .static-editor-body h3:first-child {
            margin-top: 0;
          }
          .static-editor-body p {
            color: #334155;
            font-size: 15px;
            line-height: 1.75;
            margin: 0.75rem 0;
          }
          .static-editor-body strong,
          .static-editor-body b {
            font-weight: 700;
            color: #0f172a;
          }
          .static-editor-body em,
          .static-editor-body i {
            font-style: italic;
          }
          .static-editor-body u {
            text-decoration: underline;
          }
          .static-editor-body del,
          .static-editor-body s {
            text-decoration: line-through;
          }
          .static-editor-body a {
            color: #2b579a;
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .static-editor-body a:hover {
            color: var(--brand-primary);
          }
          .static-editor-body ul:not(.editorial-checklist) {
            list-style-type: disc;
            margin: 1rem 0;
            padding-left: 1.5rem;
            color: #334155;
          }
          .static-editor-body ul ul {
            list-style-type: circle;
            margin: 0.35rem 0;
          }
          .static-editor-body ol {
            list-style-type: decimal;
            margin: 1rem 0;
            padding-left: 1.5rem;
            color: #334155;
          }
          .static-editor-body li {
            margin-bottom: 0.45rem;
            line-height: 1.7;
          }
          .static-editor-body blockquote {
            border-left: 4px solid #2b579a;
            background: #f8fafc;
            padding: 0.85rem 1.25rem;
            border-radius: 0 0.75rem 0.75rem 0;
            font-style: italic;
            color: #475569;
            margin: 1.25rem 0;
          }
          .static-editor-body hr {
            border: 0;
            border-top: 1px solid #e2e8f0;
            margin: 1.75rem 0;
          }
          .static-editor-body code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.85em;
            background: #f1f5f9;
            color: #0f172a;
            padding: 0.15rem 0.4rem;
            border-radius: 0.375rem;
          }
          .static-editor-body pre {
            background: #0f172a;
            color: #e2e8f0;
            padding: 1rem 1.25rem;
            border-radius: 0.75rem;
            overflow-x: auto;
            margin: 1.25rem 0;
            font-size: 13px;
            line-height: 1.6;
          }
          .static-editor-body pre code {
            background: transparent;
            color: inherit;
            padding: 0;
          }
          .static-editor-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.25rem 0;
            font-size: 14px;
            display: block;
            overflow-x: auto;
          }
          .static-editor-body th,
          .static-editor-body td {
            border: 1px solid #e2e8f0;
            padding: 0.65rem 0.85rem;
            text-align: left;
            vertical-align: top;
          }
          .static-editor-body th {
            background: #f8fafc;
            font-weight: 700;
            color: #0f172a;
          }
          .static-editor-body img {
            border-radius: 0.75rem;
            max-width: 100%;
            height: auto;
          }
          .static-editor-body figure {
            margin: 1.5rem auto;
            max-width: 100%;
          }
          .static-editor-body figcaption {
            text-align: center;
            font-size: 12px;
            color: #64748b;
            margin-top: 0.5rem;
            font-style: italic;
          }
          html.dark .static-editor-body h1,
          html.dark .static-editor-body h2,
          html.dark .static-editor-body h3,
          html.dark .static-editor-body h4,
          html.dark .static-editor-body strong,
          html.dark .static-editor-body b,
          html.dark .static-editor-body th {
            color: #f8fafc !important;
          }
          html.dark .static-editor-body p,
          html.dark .static-editor-body ul,
          html.dark .static-editor-body ol,
          html.dark .static-editor-body li,
          html.dark .static-editor-body td {
            color: #cbd5e1 !important;
          }
          html.dark .static-editor-body a {
            color: #60a5fa !important;
          }
          html.dark .static-editor-body blockquote {
            background: #161d2b !important;
            color: #e2e8f0 !important;
            border-left-color: #60a5fa !important;
          }
          html.dark .static-editor-body code {
            background: #1e293b !important;
            color: #e2e8f0 !important;
          }
          html.dark .static-editor-body th {
            background: #161d2b !important;
          }
          html.dark .static-editor-body th,
          html.dark .static-editor-body td,
          html.dark .static-editor-body hr,
          html.dark .static-editor-body h1 {
            border-color: #242d42 !important;
          }
        `,
          }}
        />
        <div className="max-w-4xl mx-auto px-4 space-y-6 sm:space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-sm space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary bg-brand-primary-soft px-3 py-1 rounded-full uppercase tracking-widest border border-brand-primary-border">
              <FileText size={14} /> Official Policy &amp; Information
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-editorial">
              {page.title}
            </h1>
            {page.updatedAt && (
              <p className="text-xs sm:text-sm text-slate-500">
                Last updated: {page.updatedAt}
              </p>
            )}
          </div>

          <div
            className="article-content static-editor-body bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-sm font-sans text-slate-900 max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </div>
    );
  }

  // 3. Fallback built-in layout only when page exists with empty body
  if (page && children) {
    return <>{children}</>;
  }

  // 4. Not found
  return (
    <div className="bg-slate-50 min-h-[60vh] py-16 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <h1 className="text-xl font-extrabold text-slate-900">Page Not Found</h1>
        <p className="text-xs text-slate-500">The requested page does not exist or has been removed.</p>
        <Link
          href={ROUTES.PUBLIC.HOME}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline pt-2"
        >
          <ArrowLeft size={14} /> Return to Homepage
        </Link>
      </div>
    </div>
  );
}
