import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  fetchBackendData,
  fetchPublicSettings,
  resolveSiteName,
  resolveSiteOrigin,
  stripHtmlToText,
} from '@/lib/seo/ogServer';

interface StoreMetaDto {
  name?: string;
  slug?: string;
  maxDiscount?: string;
  activeCoupons?: number;
  activeOffersCount?: number;
  shortDescription?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug || '').trim();

  const [store, settings] = await Promise.all([
    fetchBackendData<StoreMetaDto>(`/api/v1/public/stores/${encodeURIComponent(cleanSlug)}`),
    fetchPublicSettings(),
  ]);

  const origin = resolveSiteOrigin(settings);
  const siteName = resolveSiteName(settings);
  const storeName = (store?.name || cleanSlug.replace(/-/g, ' ')).trim();
  const maxDiscount = (store?.maxDiscount || '').trim();
  const activeCount = Number(store?.activeCoupons ?? store?.activeOffersCount ?? 0);
  const year = new Date().getFullYear();

  const title =
    store?.metaTitle?.trim() ||
    `${maxDiscount ? `${maxDiscount} ` : ''}${storeName} Promo Codes & Coupons (${year}) | ${siteName}`;

  const fallbackDesc = `Save with ${activeCount > 0 ? `${activeCount} verified ` : ''}${storeName} promo codes, discount coupons, and deals${
    maxDiscount ? ` (${maxDiscount})` : ''
  } hand-tested daily on ${siteName}.`;
  const description =
    store?.metaDescription?.trim() ||
    store?.shortDescription?.trim() ||
    stripHtmlToText(store?.description, 160) ||
    fallbackDesc;

  const pageUrl = `${origin}/store/${encodeURIComponent(cleanSlug)}`;
  const ogImageUrl = `${origin}/og/store/${encodeURIComponent(cleanSlug)}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: 'website',
      url: pageUrl,
      siteName,
      title,
      description,
      locale: 'en_US',
      alternateLocale: ['en_CA', 'en_GB'],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${storeName} ${maxDiscount ? `${maxDiscount} ` : ''}Promo Codes & Coupons`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      'pinterest-rich-pin': 'true',
    },
  };
}

export default function StoreDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
