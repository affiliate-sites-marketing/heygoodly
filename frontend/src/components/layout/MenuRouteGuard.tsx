'use client';

import { usePathname, notFound } from 'next/navigation';

function normalizePath(path: string): string {
  const clean = path.split('?')[0].split('#')[0].trim().toLowerCase();
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean || '/';
}

/**
 * Enforces exact-path 404 when an internal route's menu item is disabled in Admin -> Menus.
 * Child/detail routes (e.g. /store/[slug] when /stores is disabled) remain accessible.
 */
export default function MenuRouteGuard({
  disabledRoutes,
  children,
}: {
  disabledRoutes: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (disabledRoutes.length > 0 && pathname) {
    const normalized = normalizePath(pathname);
    if (normalized !== '/' && disabledRoutes.includes(normalized)) {
      notFound();
    }
  }
  return <>{children}</>;
}
