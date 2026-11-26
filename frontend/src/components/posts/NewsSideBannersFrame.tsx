'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteSettings } from '@/lib/admin/useSiteSettings';

export interface ArticleCustomSideBanners {
  enabled?: boolean;
  leftImg?: string;
  leftUrl?: string;
  leftAlt?: string;
  rightImg?: string;
  rightUrl?: string;
  rightAlt?: string;
}

interface NewsSideBannersFrameProps {
  enabled: boolean;
  customBanners?: ArticleCustomSideBanners;
  children: React.ReactNode;
}

interface BannerItem {
  side: 'left' | 'right';
  imageUrl: string;
  href: string;
  alt: string;
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
 * Wraps News / General article pages with newspaper-style sticky Left & Right side banners on Desktop (xl+),
 * and automatically transforms attached banners into a clean, dismissible Popup Modal on Mobile / Tablet (< xl).
 */
export default function NewsSideBannersFrame({
  enabled,
  customBanners,
  children,
}: NewsSideBannersFrameProps) {
  const { settings } = useSiteSettings();
  const [mobilePopupOpen, setMobilePopupOpen] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const hasCustomOverride = useMemo(() => {
    if (!customBanners) return false;
    return Boolean(customBanners.leftImg?.trim() || customBanners.rightImg?.trim());
  }, [customBanners]);

  const resolvedLeft = useMemo(() => {
    if (hasCustomOverride) {
      if (customBanners?.enabled === false) return null;
      const img = customBanners?.leftImg?.trim() || '';
      if (!img) return null;
      return {
        side: 'left' as const,
        imageUrl: img,
        href: customBanners?.leftUrl?.trim() || '',
        alt: customBanners?.leftAlt?.trim() || '',
      };
    }
    if (!settings.newsSideBannersActive) return null;
    const img = settings.newsLeftBannerImg?.trim() || '';
    if (!img) return null;
    return {
      side: 'left' as const,
      imageUrl: img,
      href: settings.newsLeftBannerUrl?.trim() || '',
      alt: settings.newsLeftBannerAlt?.trim() || '',
    };
  }, [hasCustomOverride, customBanners, settings]);

  const resolvedRight = useMemo(() => {
    if (hasCustomOverride) {
      if (customBanners?.enabled === false) return null;
      const img = customBanners?.rightImg?.trim() || '';
      if (!img) return null;
      return {
        side: 'right' as const,
        imageUrl: img,
        href: customBanners?.rightUrl?.trim() || '',
        alt: customBanners?.rightAlt?.trim() || '',
      };
    }
    if (!settings.newsSideBannersActive) return null;
    const img = settings.newsRightBannerImg?.trim() || '';
    if (!img) return null;
    return {
      side: 'right' as const,
      imageUrl: img,
      href: settings.newsRightBannerUrl?.trim() || '',
      alt: settings.newsRightBannerAlt?.trim() || '',
    };
  }, [hasCustomOverride, customBanners, settings]);

  const popupBanners = useMemo<BannerItem[]>(() => {
    const list: BannerItem[] = [];
    if (resolvedLeft) list.push(resolvedLeft);
    if (resolvedRight && resolvedRight.imageUrl !== resolvedLeft?.imageUrl) {
      list.push(resolvedRight);
    }
    return list;
  }, [resolvedLeft, resolvedRight]);

  const showSideBanners = Boolean(enabled && (resolvedLeft || resolvedRight));

  // Automatically trigger Mobile Popup when viewing on phone/tablet (< 1280px where side rails are hidden)
  useEffect(() => {
    setActiveSlideIdx(0);
    if (!showSideBanners || popupBanners.length === 0 || typeof window === 'undefined') {
      setMobilePopupOpen(false);
      return;
    }

    const isCompactViewport = window.innerWidth < 1280;
    if (!isCompactViewport) {
      setMobilePopupOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setMobilePopupOpen(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [showSideBanners, popupBanners]);

  useEffect(() => {
    if (!mobilePopupOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobilePopupOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobilePopupOpen]);

  if (!showSideBanners) {
    return <>{children}</>;
  }

  const currentPopupBanner = popupBanners[activeSlideIdx] || popupBanners[0];

  return (
    <div className="max-w-[1720px] mx-auto px-3 sm:px-4">
      <div className="flex items-start justify-center gap-5 2xl:gap-7">
        {/* Left Sticky Banner Rail (Desktop xl+) */}
        {resolvedLeft && (
          <aside
            aria-label="Left promotional banner"
            className="hidden xl:block w-[160px] 2xl:w-[200px] shrink-0 sticky top-24 self-start"
          >
            <SideBannerUnit
              imageUrl={resolvedLeft.imageUrl}
              href={resolvedLeft.href}
              alt={resolvedLeft.alt}
              side="left"
            />
          </aside>
        )}

        {/* Main Center Content */}
        <div className="flex-1 min-w-0 max-w-7xl">{children}</div>

        {/* Right Sticky Banner Rail (Desktop xl+) */}
        {resolvedRight && (
          <aside
            aria-label="Right promotional banner"
            className="hidden xl:block w-[160px] 2xl:w-[200px] shrink-0 sticky top-24 self-start"
          >
            <SideBannerUnit
              imageUrl={resolvedRight.imageUrl}
              href={resolvedRight.href}
              alt={resolvedRight.alt}
              side="right"
            />
          </aside>
        )}
      </div>

      {/* Mobile / Tablet Automatic Banner Popup (< xl) */}
      {mobilePopupOpen && currentPopupBanner && (
        <div
          className="xl:hidden fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMobilePopupOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Sponsored Banner"
        >
          <div
            className="relative w-full max-w-[360px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200/90 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Ad Label & Close Button */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Sponsored
              </span>
              <button
                type="button"
                onClick={() => setMobilePopupOpen(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close banner popup"
              >
                <X size={15} />
              </button>
            </div>

            {/* Banner Image & Click Target */}
            <div className="relative bg-slate-100">
              {currentPopupBanner.href ? (
                <a
                  href={currentPopupBanner.href}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  onClick={() => setMobilePopupOpen(false)}
                  className="block"
                >
                  <img
                    src={currentPopupBanner.imageUrl}
                    alt={currentPopupBanner.alt || 'Featured Promotion'}
                    className="w-full max-h-[68vh] object-contain mx-auto block"
                  />
                </a>
              ) : (
                <img
                  src={currentPopupBanner.imageUrl}
                  alt={currentPopupBanner.alt || 'Featured Promotion'}
                  className="w-full max-h-[68vh] object-contain mx-auto block"
                />
              )}

              {/* Prev / Next Controls when both Left & Right banners are attached */}
              {popupBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSlideIdx((prev) => (prev - 1 + popupBanners.length) % popupBanners.length)
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/65 hover:bg-slate-900 text-white flex items-center justify-center shadow-md cursor-pointer"
                    aria-label="Previous banner"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlideIdx((prev) => (prev + 1) % popupBanners.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/65 hover:bg-slate-900 text-white flex items-center justify-center shadow-md cursor-pointer"
                    aria-label="Next banner"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Optional Caption / Direct CTA Footer */}
            {(currentPopupBanner.alt || currentPopupBanner.href || popupBanners.length > 1) && (
              <div className="p-3 bg-white border-t border-slate-100 space-y-2.5">
                {currentPopupBanner.alt && (
                  <p className="text-xs font-bold text-slate-800 text-center line-clamp-2">
                    {currentPopupBanner.alt}
                  </p>
                )}

                {currentPopupBanner.href && (
                  <a
                    href={currentPopupBanner.href}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    onClick={() => setMobilePopupOpen(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <span>Learn More</span>
                    <ExternalLink size={13} />
                  </a>
                )}

                {popupBanners.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-0.5">
                    {popupBanners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveSlideIdx(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === activeSlideIdx ? 'w-5 bg-brand-primary' : 'w-1.5 bg-slate-300'
                        }`}
                        aria-label={`Banner ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
