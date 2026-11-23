'use client';

import React from 'react';
import { useSiteSettings } from '@/lib/admin/useSiteSettings';

interface NewsSideBannersFrameProps {
  enabled: boolean;
  children: React.ReactNode;
}

function SideBannerUnit({
  imageUrl,
  href,
  alt,
  side,
}: {
  imageUrl: string;
  href?: string;
  alt?: string;
  side: 'left' | 'right';
}) {
  const cleanImg = imageUrl.trim();
  if (!cleanImg) return null;

  const cleanHref = href?.trim() || '';
  const resolvedAlt = alt?.trim() || (side === 'left' ? 'Sponsored left banner' : 'Sponsored right banner');

  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-all">
      <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-slate-900/70 text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-xs">
        Ad
      </span>
      <img
        src={cleanImg}
        alt={resolvedAlt}
        loading="lazy"
        className="w-full h-auto max-h-[640px] object-cover block group-hover:scale-[1.015] transition-transform duration-300"
      />
    </div>
  );

  if (cleanHref) {
    return (
      <a
        href={cleanHref}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="block focus:outline-none focus:ring-2 focus:ring-brand-primary/40 rounded-2xl"
        aria-label={resolvedAlt}
      >
        {content}
      </a>
    );
  }

  return content;
}

/**
 * Wraps News pages (directory & article detail) with optional sticky Left & Right
 * promotional side banners configured globally in Admin -> Settings -> Monetization & Ads.
 * Only renders flanking rails on wide desktop screens (xl+) when enabled and configured.
 */
export default function NewsSideBannersFrame({ enabled, children }: NewsSideBannersFrameProps) {
  const { settings } = useSiteSettings();

  const leftImg = settings.newsLeftBannerImg?.trim() || '';
  const rightImg = settings.newsRightBannerImg?.trim() || '';
  const showSideBanners = Boolean(enabled && settings.newsSideBannersActive && (leftImg || rightImg));

  if (!showSideBanners) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-[1720px] mx-auto px-3 sm:px-4">
      <div className="flex items-start justify-center gap-5 2xl:gap-7">
        {/* Left Sticky Banner Rail */}
        {leftImg && (
          <aside
            aria-label="Left promotional banner"
            className="hidden xl:block w-[160px] 2xl:w-[200px] shrink-0 sticky top-24 self-start"
          >
            <SideBannerUnit
              imageUrl={leftImg}
              href={settings.newsLeftBannerUrl}
              alt={settings.newsLeftBannerAlt}
              side="left"
            />
          </aside>
        )}

        {/* Main Center Content */}
        <div className="flex-1 min-w-0 max-w-7xl">{children}</div>

        {/* Right Sticky Banner Rail */}
        {rightImg && (
          <aside
            aria-label="Right promotional banner"
            className="hidden xl:block w-[160px] 2xl:w-[200px] shrink-0 sticky top-24 self-start"
          >
            <SideBannerUnit
              imageUrl={rightImg}
              href={settings.newsRightBannerUrl}
              alt={settings.newsRightBannerAlt}
              side="right"
            />
          </aside>
        )}
      </div>
    </div>
  );
}
