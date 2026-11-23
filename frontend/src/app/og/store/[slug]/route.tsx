import { ImageResponse } from 'next/og';
import {
  fetchBackendData,
  fetchOgCompatibleImage,
  fetchPublicSettings,
  resolveSiteDomain,
  resolveSiteName,
  resolveSiteOrigin,
  stripHtmlToText,
} from '@/lib/seo/ogServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StoreOgDto {
  name?: string;
  slug?: string;
  logo?: string;
  logoUrl?: string;
  socialCardImage?: string;
  bannerUrl?: string;
  maxDiscount?: string;
  rating?: number;
  reviewsCount?: number;
  reviewCount?: number;
  activeCoupons?: number;
  activeOffersCount?: number;
  shortDescription?: string;
  description?: string;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const cleanSlug = decodeURIComponent(slug || '').trim();

  const [store, settings] = await Promise.all([
    fetchBackendData<StoreOgDto>(`/api/v1/public/stores/${encodeURIComponent(cleanSlug)}`),
    fetchPublicSettings(),
  ]);

  const origin = resolveSiteOrigin(settings);
  const siteName = resolveSiteName(settings);
  const siteDomain = resolveSiteDomain(origin);
  const brandColor = settings.brand_primary_color || '#C62828';

  const storeName = (store?.name || cleanSlug.replace(/-/g, ' ') || siteName).trim();
  const maxDiscount = (store?.maxDiscount || '').trim();
  const rating = Number(store?.rating || 4.8).toFixed(1);
  const reviewsCount = Number(store?.reviewsCount ?? store?.reviewCount ?? 0);
  const activeOffers = Number(store?.activeCoupons ?? store?.activeOffersCount ?? 0);
  const rawShortDesc =
    store?.shortDescription?.trim() ||
    stripHtmlToText(store?.description, 125) ||
    `Hand-tested ${storeName} promo codes, verified coupons, and exclusive savings updated daily.`;

  const [bannerSrc, logoSrc] = await Promise.all([
    fetchOgCompatibleImage(store?.socialCardImage || store?.bannerUrl, origin),
    fetchOgCompatibleImage(store?.logoUrl || store?.logo, origin),
  ]);

  const initials = storeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'ST';

  const year = new Date().getFullYear();

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          backgroundColor: '#0B1120',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
          padding: '48px 56px',
        }}
      >
        {/* Background Banner Image (if available) */}
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerSrc}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
              opacity: 0.28,
            }}
          />
        ) : null}

        {/* Rich Editorial Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            background: bannerSrc
              ? 'linear-gradient(125deg, rgba(11,17,32,0.95) 0%, rgba(15,23,42,0.86) 55%, rgba(11,17,32,0.92) 100%)'
              : 'linear-gradient(135deg, #0B1120 0%, #131C31 55%, #0F172A 100%)',
          }}
        />

        {/* Top Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '8px',
            background: `linear-gradient(90deg, ${brandColor} 0%, #10B981 100%)`,
          }}
        />

        {/* Header Row: Brand + Verified Badge */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '32px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
              }}
            >
              <span>{siteName}</span>
              <span style={{ color: brandColor }}>.</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '15px',
                fontWeight: 600,
                color: '#94A3B8',
                paddingLeft: '12px',
                borderLeft: '2px solid rgba(148,163,184,0.3)',
              }}
            >
              Verified Promo Codes &amp; Deals
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.16)',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              color: '#34D399',
              padding: '10px 20px',
              borderRadius: '999px',
              fontSize: '16px',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            <span>✓ HAND-TESTED • {year}</span>
          </div>
        </div>

        {/* Center Main Content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            width: '100%',
          }}
        >
          {/* Left: Store Logo + Name + Rating + Short Desc */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              flex: 1,
              maxWidth: '720px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                style={{
                  width: '116px',
                  height: '116px',
                  borderRadius: '26px',
                  backgroundColor: '#FFFFFF',
                  border: '3px solid rgba(255,255,255,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 18px 38px rgba(0,0,0,0.45)',
                }}
              >
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt={storeName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '8px',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: '42px',
                      fontWeight: 900,
                      color: '#0F172A',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '50px',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.08,
                    color: '#FFFFFF',
                  }}
                >
                  {storeName.length > 26 ? `${storeName.slice(0, 25)}…` : storeName}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '20px',
                    color: '#CBD5E1',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#FBBF24', fontWeight: 800 }}>★ {rating}</span>
                  {reviewsCount > 0 ? (
                    <span>• {reviewsCount.toLocaleString()} shopper ratings</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                lineHeight: 1.45,
                color: '#CBD5E1',
                fontWeight: 500,
              }}
            >
              {rawShortDesc.length > 135 ? `${rawShortDesc.slice(0, 134)}…` : rawShortDesc}
            </div>
          </div>

          {/* Right: High-Impact Discount Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              width: '320px',
              padding: '32px 26px',
              borderRadius: '28px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '2px solid rgba(16, 185, 129, 0.45)',
              boxShadow: '0 22px 44px rgba(0,0,0,0.4)',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: '#34D399',
                textTransform: 'uppercase',
              }}
            >
              TOP VERIFIED OFFER
            </span>
            <div
              style={{
                display: 'flex',
                fontSize: maxDiscount.length > 12 ? '34px' : '44px',
                fontWeight: 900,
                color: '#FFFFFF',
                textAlign: 'center',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {maxDiscount || 'Verified Deals'}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '16px',
                color: '#CBD5E1',
                fontWeight: 600,
              }}
            >
              {activeOffers > 0
                ? `${activeOffers} Active Codes & Deals`
                : 'Exclusive Promo Codes'}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '6px',
                width: '100%',
                padding: '14px 20px',
                borderRadius: '14px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              Get Promo Codes →
            </div>
          </div>
        </div>

        {/* Footer Strip */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '20px',
            borderTop: '1px solid rgba(148,163,184,0.22)',
            fontSize: '17px',
            color: '#94A3B8',
            fontWeight: 600,
          }}
        >
          <span>{siteDomain}/store/{cleanSlug}</span>
          <span>Updated Daily • US, Canada &amp; UK Deals</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
      },
    }
  );
}
