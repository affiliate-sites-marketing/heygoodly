import { NextRequest } from 'next/server';
import { ROUTES } from '@/constants/routes';
import { resolveAffiliateRedirect } from '@/lib/affiliateRedirect';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const targetSlug = slug.toLowerCase().trim().replace(/-store$/, '');
  return resolveAffiliateRedirect(
    request,
    `/go/${encodeURIComponent(targetSlug)}`,
    ROUTES.PUBLIC.STORE_DETAIL(targetSlug)
  );
}
