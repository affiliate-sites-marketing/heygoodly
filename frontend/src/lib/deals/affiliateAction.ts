import { copyToClipboard } from '@/lib/utils/clipboard';
import { ROUTES } from '@/constants/routes';

export interface AffiliateTrackingContext {
  /** Logical page source (auto-detected from window.location.pathname if omitted) */
  source?: 'store_page' | 'review_article' | 'homepage' | 'category_page' | 'tag_page' | 'search_page' | 'coupon_popup' | string;
  /** UI placement (e.g. offer_card, coupon_modal, store_sidebar, review_sidebar) */
  medium?: string;
  /** Source page slug (auto-detected article/store/category slug if omitted) */
  campaign?: string;
  /** Granular SubID / coupon code / slot identifier for affiliate network reconciliation */
  subid?: string;
}

export interface TriggerCouponOptions {
  /** Optional promo / coupon code to auto-copy */
  code?: string;
  /** Merchant store slug used for /go/[slug] redirect */
  storeSlug: string;
  /** Offer or Deal identifier */
  offerId?: string | number;
  /** Direct or custom affiliate URL if available */
  customUrl?: string;
  /** Optional explicit attribution overrides */
  tracking?: AffiliateTrackingContext;
  /** Callback to open the CouponModal dialog in the current tab */
  onOpenModal?: () => void;
}

function detectPageAttribution(): { source: string; campaign?: string } {
  if (typeof window === 'undefined') {
    return { source: 'direct' };
  }

  // 1. Preserve originating internal attribution when visitor navigated from a Review Article or Homepage
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const carriedSource = urlParams.get('utm_source')?.trim();
    const carriedCampaign = urlParams.get('utm_campaign')?.trim();
    if (carriedSource) {
      return {
        source: carriedSource,
        campaign: carriedCampaign || undefined,
      };
    }
  } catch {
    // Ignore malformed query string
  }

  // 2. Otherwise infer from current client pathname
  const pathname = window.location.pathname || '/';
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) {
    return { source: 'homepage', campaign: 'homepage' };
  }
  const parts = clean.split('/');
  const first = parts[0].toLowerCase();
  const second = parts[1] ? decodeURIComponent(parts[1]) : undefined;

  switch (first) {
    case 'post':
    case 'posts':
    case 'article':
    case 'articles':
      return { source: 'review_article', campaign: second };
    case 'store':
    case 'stores':
      return { source: 'store_page', campaign: second };
    case 'category':
    case 'categories':
      return { source: 'category_page', campaign: second };
    case 'tag':
    case 'tags':
      return { source: 'tag_page', campaign: second };
    case 'search':
      return { source: 'search_page' };
    default:
      return { source: 'other', campaign: second || first };
  }
}

/**
 * Appends standardized utm_source, utm_medium, utm_campaign, utm_content & subid
 * parameters onto cloaked affiliate URLs (`/go/...` or `/out/...`) so the backend
 * records exact source attribution and forwards SubID to merchant affiliate networks.
 */
export function appendAffiliateTracking(
  rawUrl: string,
  context: AffiliateTrackingContext = {}
): string {
  if (!rawUrl) return rawUrl;
  try {
    const isRelative = rawUrl.startsWith('/');
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const parsed = new URL(rawUrl, base);

    const detected = detectPageAttribution();
    const source = (context.source || detected.source || 'direct').trim();
    const campaign = (context.campaign || detected.campaign || '').trim();
    const medium = (context.medium || 'offer_card').trim();
    const subid = (
      context.subid ||
      [source, campaign, medium].filter(Boolean).join('_').slice(0, 80)
    ).trim();

    if (source && !parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', source);
    }
    if (medium && !parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', medium);
    }
    if (campaign && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', campaign);
    }
    if (subid && !parsed.searchParams.has('subid')) {
      parsed.searchParams.set('subid', subid);
    }

    return isRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Executes the industry-standard dual-action affiliate conversion flow:
 * 1. Synchronously opens the merchant store in a new background tab
 *    (secures the affiliate cookie, tracks the click with source/subid attribution, and bypasses popup blockers).
 * 2. Automatically copies the coupon code to the user's clipboard.
 * 3. Opens the CouponModal in the current tab with visual confirmation & guidance.
 */
export function triggerDualActionCoupon({
  code,
  storeSlug,
  offerId,
  customUrl,
  tracking,
  onOpenModal,
}: TriggerCouponOptions) {
  const baseDestination =
    customUrl ||
    (offerId ? ROUTES.PUBLIC.OUT_OFFER(offerId) : ROUTES.PUBLIC.GO_AFFILIATE(storeSlug));

  const autoSubId = code
    ? `${storeSlug}_${code}`.slice(0, 80)
    : offerId
    ? `${storeSlug}_offer_${offerId}`.slice(0, 80)
    : storeSlug;

  const destination = appendAffiliateTracking(baseDestination, {
    medium: tracking?.medium || 'offer_card',
    source: tracking?.source,
    campaign: tracking?.campaign,
    subid: tracking?.subid || autoSubId,
  });

  if (typeof window !== 'undefined') {
    try {
      const newWindow = window.open(destination, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.opener = null;
      }
    } catch (error) {
      console.warn('Popup blocked, modal fallback available:', error);
    }
  }

  if (code) {
    copyToClipboard(code);
  }

  if (onOpenModal) {
    onOpenModal();
  }
}
