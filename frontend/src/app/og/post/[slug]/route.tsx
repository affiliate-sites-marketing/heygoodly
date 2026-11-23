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

interface PostOgDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string;
  imageUrl?: string;
  category?: { name?: string } | string;
  categoryName?: string;
  authorName?: string;
  author?: { name?: string; role?: string };
  readTime?: string;
  rating?: number | string;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const cleanSlug = decodeURIComponent(slug || '').trim();

  const [post, settings] = await Promise.all([
    fetchBackendData<PostOgDto>(`/api/v1/public/posts/${encodeURIComponent(cleanSlug)}`),
    fetchPublicSettings(),
  ]);

  const origin = resolveSiteOrigin(settings);
  const siteName = resolveSiteName(settings);
  const siteDomain = resolveSiteDomain(origin);
  const brandColor = settings.brand_primary_color || '#C62828';

  const title = (post?.title || cleanSlug.replace(/-/g, ' ') || `${siteName} Editorial Review`).trim();
  const categoryName =
    (typeof post?.category === 'string' ? post.category : post?.category?.name) ||
    post?.categoryName ||
    'Editorial Review';
  const excerpt =
    post?.excerpt?.trim() ||
    stripHtmlToText(post?.content, 145) ||
    `Independent hands-on testing, honest benchmarks, and verified savings from ${siteName}.`;
  const authorName = post?.author?.name || post?.authorName || `${siteName} Editorial`;
  const readTime = post?.readTime || '5 min read';
  const ratingNum = Number(post?.rating);
  const hasRating = Number.isFinite(ratingNum) && ratingNum > 0;

  const coverSrc = await fetchOgCompatibleImage(post?.imageUrl || post?.thumbnail, origin);

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
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
          padding: '48px 56px',
        }}
      >
        {/* Background Cover Image */}
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
              opacity: 0.36,
            }}
          />
        ) : null}

        {/* Editorial Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            background: coverSrc
              ? 'linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.88) 52%, rgba(11,17,32,0.97) 100%)'
              : 'linear-gradient(135deg, #0B1120 0%, #1E293B 60%, #0F172A 100%)',
          }}
        />

        {/* Top Accent Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '8px',
            backgroundColor: brandColor,
          }}
        />

        {/* Top Row: Category + Lab Score + Site Brand */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: brandColor,
                color: '#FFFFFF',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {categoryName}
            </div>
            {hasRating ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(251, 191, 36, 0.16)',
                  border: '1.5px solid rgba(251, 191, 36, 0.45)',
                  color: '#FCD34D',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 800,
                }}
              >
                <span>★ LAB SCORE {ratingNum.toFixed(1)} / 5.0</span>
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '30px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
            }}
          >
            <span>{siteName}</span>
            <span style={{ color: brandColor }}>.</span>
          </div>
        </div>

        {/* Center: Headline + Excerpt */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '1040px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 72 ? '44px' : '54px',
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
            }}
          >
            {title.length > 110 ? `${title.slice(0, 109)}…` : title}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '23px',
              lineHeight: 1.42,
              color: '#CBD5E1',
              fontWeight: 500,
            }}
          >
            {excerpt.length > 150 ? `${excerpt.slice(0, 149)}…` : excerpt}
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '20px',
            borderTop: '1px solid rgba(148,163,184,0.25)',
            fontSize: '18px',
            color: '#CBD5E1',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{authorName}</span>
            <span style={{ color: '#64748B' }}>•</span>
            <span>{readTime}</span>
          </div>
          <span style={{ color: '#94A3B8' }}>{siteDomain}</span>
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
