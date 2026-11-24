export type OfferAutoSortRule = 'newest_first' | 'smart_best' | 'highest_discount' | 'codes_first' | 'most_used';

export interface AutoSortableOffer {
  id: number;
  discount?: string | null;
  code?: string | null;
  isExclusive?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
  usesCount?: number;
  expireAt?: string | null;
  createdAt?: string | null;
}

export const OFFER_AUTO_SORT_OPTIONS: ReadonlyArray<{
  value: OfferAutoSortRule;
  label: string;
}> = [
  { value: 'newest_first', label: '🆕 Auto-Sort: Newest Created First' },
  { value: 'smart_best', label: '⚡ Auto-Sort: Smart Best (Recommended)' },
  { value: 'highest_discount', label: '🔥 Auto-Sort: Highest Discount (% / $)' },
  { value: 'codes_first', label: '🏷️ Auto-Sort: Promo Codes First' },
  { value: 'most_used', label: '📈 Auto-Sort: Most Used / Popular' },
];

/**
 * Extracts a comparable numeric savings score from discount badges like
 * "70% OFF", "Up to 50% Off", "$100 OFF", "Buy 1 Get 1", "Free Shipping".
 */
export function parseDiscountScore(raw?: string | null): number {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return 0;

  const pctMatch = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    return Number.isFinite(pct) ? 1000 + pct : 0;
  }

  if (s.includes('bogo') || s.includes('buy 1 get 1') || s.includes('buy one get one')) {
    return 1045;
  }

  const dollarMatch = s.match(/\$\s*(\d+(?:[.,]\d+)?)/);
  if (dollarMatch) {
    const amt = parseFloat(dollarMatch[1].replace(/,/g, ''));
    return Number.isFinite(amt) ? 200 + Math.min(amt, 700) : 0;
  }

  if (s.includes('free shipping') || s.includes('free delivery')) {
    return 120;
  }

  if (s.includes('free')) {
    return 100;
  }

  return 10;
}

function isExpiredOffer(expireAt?: string | null): boolean {
  if (!expireAt) return false;
  const ts = Date.parse(expireAt);
  return Number.isFinite(ts) && ts < Date.now();
}

export function sortOffersAuto<T extends AutoSortableOffer>(
  items: T[],
  rule: OfferAutoSortRule
): T[] {
  return [...items].sort((a, b) => {
    // 1. Always push inactive & expired offers to the bottom
    const activeDiff = Number(b.isActive !== false) - Number(a.isActive !== false);
    if (activeDiff !== 0) return activeDiff;

    const expiredDiff = Number(isExpiredOffer(a.expireAt)) - Number(isExpiredOffer(b.expireAt));
    if (expiredDiff !== 0) return expiredDiff;

    const aHasCode = Boolean(a.code && a.code.trim().length > 0);
    const bHasCode = Boolean(b.code && b.code.trim().length > 0);
    const aExcl = Boolean(a.isExclusive || a.isVerified);
    const bExcl = Boolean(b.isExclusive || b.isVerified);
    const aScore = parseDiscountScore(a.discount);
    const bScore = parseDiscountScore(b.discount);
    const aUses = Number(a.usesCount ?? 0);
    const bUses = Number(b.usesCount ?? 0);

    if (rule === 'newest_first') {
      const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (Number.isFinite(bTs) && Number.isFinite(aTs) && bTs !== aTs) {
        return bTs - aTs;
      }
      return b.id - a.id;
    }

    if (rule === 'highest_discount') {
      if (bScore !== aScore) return bScore - aScore;
      if (Number(bHasCode) !== Number(aHasCode)) return Number(bHasCode) - Number(aHasCode);
      if (Number(bExcl) !== Number(aExcl)) return Number(bExcl) - Number(aExcl);
      return bUses - aUses;
    }

    if (rule === 'codes_first') {
      if (Number(bHasCode) !== Number(aHasCode)) return Number(bHasCode) - Number(aHasCode);
      if (Number(bExcl) !== Number(aExcl)) return Number(bExcl) - Number(aExcl);
      if (bScore !== aScore) return bScore - aScore;
      return bUses - aUses;
    }

    if (rule === 'most_used') {
      if (bUses !== aUses) return bUses - aUses;
      if (bScore !== aScore) return bScore - aScore;
      return Number(bHasCode) - Number(aHasCode);
    }

    // Default: 'smart_best' -> Exclusive/Verified -> Code before Deal -> Highest Discount -> Most Used
    if (Number(bExcl) !== Number(aExcl)) return Number(bExcl) - Number(aExcl);
    if (Number(bHasCode) !== Number(aHasCode)) return Number(bHasCode) - Number(aHasCode);
    if (bScore !== aScore) return bScore - aScore;
    return bUses - aUses;
  });
}
