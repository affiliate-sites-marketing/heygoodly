import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

import { SITE_SLUG, SITE_URL } from '@/constants/site';
import { parseCustomHeadHtml } from '@/components/seo/parseCustomHeadHtml';
import { getBrandCssVariablesStyle, resolveBrandPalette } from '@/lib/brandTheme';

const BACKEND_BASE = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080'
).replace(/\/api\/v1\/?$/, '');

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

async function fetchPublicSettingsMap(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/v1/settings/public`, {
      next: { revalidate: 5 },
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data?.settings || json?.data || {};
    }
  } catch {
    // Fallback gracefully if backend is temporarily unreachable during build
  }
  return {};
}

export async function generateMetadata(): Promise<Metadata> {
  const map = await fetchPublicSettingsMap();

  const siteName = map.site_name || 'HeyGoodly';
  const title = map.meta_title || map.default_meta_title || `${siteName} — Independent Product Reviews & Smart Deals Journal`;
  const description =
    map.meta_description ||
    map.default_meta_description ||
    'Unbiased laboratory product evaluations, vetted shopping discounts, and independent technology reviews to help consumers save wisely.';
  const canonicalBase = map.canonical_url || SITE_URL;
  const favicon = map.site_favicon || undefined;
  const ogImage = map.og_image || undefined;
  const noIndex = map.no_index === 'true';

  return {
    title,
    description,
    metadataBase: new URL(canonicalBase),
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      siteName,
      locale: 'en_US',
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const map = await fetchPublicSettingsMap();
  const customHeadNodes = parseCustomHeadHtml(map.custom_head_code);
  const brandPalette = resolveBrandPalette(
    map.brand_theme_preset,
    map.brand_primary_color,
    map.brand_hover_color
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable}`}
      style={getBrandCssVariablesStyle(brandPalette)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem('${SITE_SLUG}:theme');if(m==='dark'){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}}catch(e){}`,
          }}
        />
        {customHeadNodes}
      </head>
      <body className={`${inter.className} min-h-screen bg-[#F8F8F6] text-[#171717] antialiased selection:bg-brand-primary selection:text-white transition-colors duration-200`}>
        <ThemeProvider initialSettings={map}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
