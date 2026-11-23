import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MenuRouteGuard from '@/components/layout/MenuRouteGuard';
import SiteHeadTelemetry from '@/components/seo/SiteHeadTelemetry';
import HolidayThemeOverlay from '@/components/layout/HolidayThemeOverlay';

const BACKEND_BASE = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8081'
).replace(/\/+$/, '');

async function fetchDisabledMenuRoutes(): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/v1/public/menus/disabled-routes`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.data;
    return Array.isArray(list)
      ? list.filter((x): x is string => typeof x === 'string' && x.startsWith('/'))
      : [];
  } catch {
    return [];
  }
}

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const disabledRoutes = await fetchDisabledMenuRoutes();

  return (
    <div className="flex flex-col min-h-screen overflow-x-clip">
      <SiteHeadTelemetry />
      <HolidayThemeOverlay />
      <Header />
      <main className="flex-1 min-w-0">
        <MenuRouteGuard disabledRoutes={disabledRoutes}>
          {children}
        </MenuRouteGuard>
      </main>
      <Footer />
    </div>
  );
}
