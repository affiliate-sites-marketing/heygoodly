import Script from 'next/script';

interface TrackingScriptsProps {
  settings: Record<string, string>;
}

function extractGtmId(raw?: string): string {
  if (!raw) return '';
  const match = raw.trim().match(/GTM-[A-Z0-9]{4,12}/i);
  return match ? match[0].toUpperCase() : '';
}

function extractGtagId(raw?: string): string {
  if (!raw) return '';
  const match = raw.trim().match(/(?:G|AW|GT|DC)-[A-Z0-9]{4,16}/i);
  return match ? match[0].toUpperCase() : '';
}

function extractNumericId(raw?: string): string {
  if (!raw) return '';
  const match = raw.trim().match(/\d{5,20}/);
  return match ? match[0] : '';
}

/**
 * Server-rendered analytics & tag manager injector (GTM, GA4/gtag, Meta Pixel, Cloudflare).
 * Guarantees Google Tag Manager ("Kiểm thử" / Tag Assistant) detects the container
 * immediately on every page load without React 19 raw <script> warnings.
 */
export default function TrackingScripts({ settings }: TrackingScriptsProps) {
  const gtmId = extractGtmId(settings.gtm_id);
  const gtagId = extractGtagId(settings.gtag_id);
  const fbPixelId = extractNumericId(settings.facebook_pixel);
  const cfToken = (settings.cloudflare_token || '').trim();
  const customHead = (settings.custom_head_code || '').toLowerCase();

  const hasGtmInCustomHead = Boolean(
    gtmId && customHead.includes(`gtm.js?id=${gtmId.toLowerCase()}`)
  );
  const hasGtagInCustomHead = Boolean(
    gtagId && customHead.includes(`gtag/js?id=${gtagId.toLowerCase()}`)
  );

  return (
    <>
      {/* Google Tag Manager (official bootstrap + noscript fallback) */}
      {gtmId && !hasGtmInCustomHead && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      {gtmId && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      )}

      {/* Google Analytics 4 (gtag.js) */}
      {gtagId && !hasGtagInCustomHead && (
        <>
          <Script
            id="google-analytics-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gtagId}');`}
          </Script>
        </>
      )}

      {/* Meta / Facebook Pixel */}
      {fbPixelId && (
        <>
          <Script id="facebook-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {/* Cloudflare Web Analytics */}
      {cfToken && (
        <Script
          id="cloudflare-web-analytics"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: cfToken })}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
