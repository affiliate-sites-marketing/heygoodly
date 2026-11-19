import { NextRequest } from 'next/server';
import { ROUTES } from '@/constants/routes';
import {
  buildNoIndexRedirect,
  resolveAffiliateRedirect,
  resolvePublicOrigin,
} from '@/lib/affiliateRedirect';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trimmedId = id.trim();

  if (!/^\d+$/.test(trimmedId)) {
    const fallbackUrl = new URL(ROUTES.PUBLIC.STORES, resolvePublicOrigin(request));
    return buildNoIndexRedirect(fallbackUrl.toString());
  }

  return resolveAffiliateRedirect(
    request,
    `/out/${encodeURIComponent(trimmedId)}`,
    ROUTES.PUBLIC.STORES
  );
}
