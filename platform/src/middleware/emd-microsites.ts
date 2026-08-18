import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// EMD (exact-match-domain) microsites — one-page marketing sites that fund
// into the-florida-maid tenant for record-keeping (tenant_domains) but
// render a dedicated static page with no tenant/CRM machinery: no booking,
// no auth, every CTA links out to thefloridamaid.com. Rewritten directly
// (bypassing rewriteToSite) so these stay statically generatable and never
// force the shared /site/the-florida-maid tree — and by extension
// thefloridamaid.com's own homepage — into dynamic per-request rendering.
export const EMD_MICROSITE_ROUTES: Record<string, string> = {
  'miamibeachmaid.com': '/site/emd-microsites/miami-beach-maid',
  'westpalmbeachmaid.com': '/site/emd-microsites/west-palm-beach-maid',
  'fortlauderdalemaid.com': '/site/emd-microsites/fort-lauderdale-maid',
  'gainesvillemaid.com': '/site/emd-microsites/gainesville-maid',
  'orlandoflmaid.com': '/site/emd-microsites/orlando-maid',
  'pompanobeachmaid.com': '/site/emd-microsites/pompano-beach-maid',
  'tallahasseeflmaid.com': '/site/emd-microsites/tallahassee-maid',
  'cocoabeachmaid.com': '/site/emd-microsites/cocoa-beach-maid',
  'destinmaid.com': '/site/emd-microsites/destin-maid',
  'pensacolamaid.com': '/site/emd-microsites/pensacola-maid',
  'portstluciemaid.com': '/site/emd-microsites/port-st-lucie-maid',
  'verobeachmaid.com': '/site/emd-microsites/vero-beach-maid',
  'coralgablesmaid.com': '/site/emd-microsites/coral-gables-maid',
  'fortmyersmaid.com': '/site/emd-microsites/fort-myers-maid',
  'naplesflmaid.com': '/site/emd-microsites/naples-maid',
  'bocaratonflmaid.com': '/site/emd-microsites/boca-raton-maid',
  'sarasotaflmaid.com': '/site/emd-microsites/sarasota-maid',
  'stpetemaid.com': '/site/emd-microsites/st-pete-maid',
  'daytonabeachmaid.com': '/site/emd-microsites/daytona-beach-maid',
  'panamacitymaid.com': '/site/emd-microsites/panama-city-maid',
  'brandonmaid.com': '/site/emd-microsites/brandon-maid',
  'celebrationmaid.com': '/site/emd-microsites/celebration-maid',
  'clermontmaid.com': '/site/emd-microsites/clermont-maid',
  'coralspringsmaid.com': '/site/emd-microsites/coral-springs-maid',
  'delandmaid.com': '/site/emd-microsites/deland-maid',
  'lakemarymaid.com': '/site/emd-microsites/lake-mary-maid',
  'longwoodmaid.com': '/site/emd-microsites/longwood-maid',
  'sanfordmaid.com': '/site/emd-microsites/sanford-maid',
  'thevillagesmaid.com': '/site/emd-microsites/the-villages-maid',
  'wellingtonmaid.com': '/site/emd-microsites/wellington-maid',
  'wesleychapelmaid.com': '/site/emd-microsites/wesley-chapel-maid',
  'westonflmaid.com': '/site/emd-microsites/weston-maid',
  'wintergardenmaid.com': '/site/emd-microsites/winter-garden-maid',
  'winterparkmaid.com': '/site/emd-microsites/winter-park-maid',
  'oviedomaid.com': '/site/emd-microsites/oviedo-maid',
  'palmbeachgardensflmaid.com': '/site/emd-microsites/palm-beach-gardens-maid',
  'parklandmaid.com': '/site/emd-microsites/parkland-maid',
  'riverviewmaid.com': '/site/emd-microsites/riverview-maid',
  'windermeremaid.com': '/site/emd-microsites/windermere-maid',
  'altamontespringsmaid.com': '/site/emd-microsites/altamonte-springs-maid',
  'brentmaid.com': '/site/emd-microsites/brent-maid',
  'cordovaparkmaid.com': '/site/emd-microsites/cordova-park-maid',
  'easthillmaid.com': '/site/emd-microsites/east-hill-maid',
  'ensleymaid.com': '/site/emd-microsites/ensley-maid',
  'ferrypassmaid.com': '/site/emd-microsites/ferry-pass-maid',
  'northhillmaid.com': '/site/emd-microsites/north-hill-maid',
  'pacemaid.com': '/site/emd-microsites/pace-maid',
  'gulfbreezemaid.com': '/site/emd-microsites/gulf-breeze-maid',
  'perdidokeymaid.com': '/site/emd-microsites/perdido-key-maid',
  'warringtonmaid.com': '/site/emd-microsites/warrington-maid',
}

/**
 * Rewrites a known EMD domain's "/" and "/sitemap.xml" to its dedicated
 * static page, and returns 410 Gone for every other path. Returns null only
 * for "/robots.txt" (falls through to the host-aware passthrough below) or
 * for a host that isn't an EMD domain at all.
 */
export function getEmdMicrositeRewrite(cleanHost: string, req: NextRequest): NextResponse | null {
  const emdRoute = EMD_MICROSITE_ROUTES[cleanHost.replace(/^www\./, '')]
  if (!emdRoute) return null

  const { pathname } = req.nextUrl
  // sitemap.xml needs its own EMD-specific rewrite (Next.js supports nested
  // sitemap.ts generation) — without this it falls through to the
  // tenant_domains lookup below, which resolves to the-florida-maid and
  // serves ITS sitemap (thefloridamaid.com URLs) instead of this microsite's
  // own.
  if (pathname === '/' || pathname === '/sitemap.xml' || pathname === '/llms.txt') {
    const url = req.nextUrl.clone()
    url.pathname = pathname === '/' ? emdRoute : `${emdRoute}${pathname}`
    return NextResponse.rewrite(url)
  }

  // robots.txt doesn't need an EMD-specific rewrite: Next.js doesn't support
  // nested robots.ts, but the root src/app/robots.ts is already host-aware
  // (reads the Host header directly) and falls through correctly via
  // rewriteToSite's own robots.txt passthrough.
  if (pathname === '/robots.txt') return null

  // Every other path is a leaked tenant-site URL. These are one-page
  // microsites — nothing but "/" is supposed to exist, so any other path
  // that used to fall through to the-florida-maid's real routes (services,
  // blog posts, /referral, etc.) got indexed by Google as if it belonged to
  // this domain. 410, not a redirect — the whole point is these URLs stop
  // existing, not that they point somewhere else.
  return new NextResponse('Gone', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
