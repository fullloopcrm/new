import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Apex-canonical tenants: their site is served at the bare apex, NOT www.
// These are ex-standalone builds migrated to FL whose www subdomain isn't
// cleanly served on FL (Vercel treats the apex as primary and 307s www->apex,
// which fights the apex->www redirect below and infinite-loops). Serving them
// at the apex — their original canonical — breaks the loop with no DNS work.
export const APEX_CANONICAL_DOMAINS = new Set<string>([
  'consortiumnyc.com',
  'thenycmarketingcompany.com',
  'thenycinteriordesigner.com',
  'miamibeachmaid.com',
  'westpalmbeachmaid.com',
  'fortlauderdalemaid.com',
  'gainesvillemaid.com',
  'orlandoflmaid.com',
  'pompanobeachmaid.com',
  'tallahasseeflmaid.com',
  'cocoabeachmaid.com',
  'destinmaid.com',
  'pensacolamaid.com',
  'portstluciemaid.com',
  'verobeachmaid.com',
  'coralgablesmaid.com',
  'fortmyersmaid.com',
  'naplesflmaid.com',
  'bocaratonflmaid.com',
  'sarasotaflmaid.com',
  'stpetemaid.com',
  'daytonabeachmaid.com',
  'panamacitymaid.com',
  'brandonmaid.com',
  'celebrationmaid.com',
  'clermontmaid.com',
  'coralspringsmaid.com',
  'delandmaid.com',
  'lakemarymaid.com',
  'longwoodmaid.com',
  'sanfordmaid.com',
  'thevillagesmaid.com',
  'wellingtonmaid.com',
  'wesleychapelmaid.com',
  'westonflmaid.com',
  'wintergardenmaid.com',
  'winterparkmaid.com',
  'oviedomaid.com',
  'palmbeachgardensflmaid.com',
  'parklandmaid.com',
  'riverviewmaid.com',
  'windermeremaid.com',
  'altamontespringsmaid.com',
])

// --- fullloopcrm.com brand consolidation (308) ---
// The FullLoop brand's own domain no longer serves the app independently
// -- both bare and www now forward straight to the main marketing site.
// Must be checked before anything else (MAIN_HOSTS, tenant lookup,
// canonical-www below) so it can't be shadowed or looped by that logic.
export function getBrandConsolidationRedirect(hostname: string, req: NextRequest): NextResponse | null {
  const rawHost = hostname.split(':')[0].toLowerCase()
  if (rawHost === 'fullloopcrm.com' || rawHost === 'www.fullloopcrm.com') {
    return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, 'https://www.homeservicesbusinesscrm.com'), 308)
  }
  return null
}

// --- Canonical www redirect (301) ---
// Every apex domain redirects to its www. equivalent so www is canonical
// everywhere. Excludes: hosts already on www, localhost, raw IPs,
// *.vercel.app preview hosts, and the *.fullloopcrm.com /
// *.homeservicesbusinesscrm.com carrying SUBDOMAINS (a subdomain has no www).
// The bare apex fullloopcrm.com / homeservicesbusinesscrm.com are NOT excluded
// — they don't end with the leading-dot suffix — so they flip to www too.
// NOTE: the old www.homeservicesbusinesscrm.com -> apex redirect in
// next.config.ts was removed alongside this; keeping it would infinite-loop.
export function getCanonicalWwwRedirect(hostname: string, req: NextRequest): NextResponse | null {
  const canonicalHost = hostname.split(':')[0].toLowerCase()
  if (
    // Never canonical-redirect API routes. A 301 on a POST is downgraded to GET
    // with the body dropped, so an apex-host admin POST (e.g. Activate) gets
    // bounced to another host as a bodiless GET and 405s. Canonicalization is
    // for pages/SEO, not APIs.
    !req.nextUrl.pathname.startsWith('/api/') &&
    !canonicalHost.startsWith('www.') &&
    !APEX_CANONICAL_DOMAINS.has(canonicalHost) &&
    canonicalHost !== 'localhost' &&
    canonicalHost.includes('.') &&
    !canonicalHost.endsWith('.vercel.app') &&
    !canonicalHost.endsWith('.fullloopcrm.com') &&
    !canonicalHost.endsWith('.homeservicesbusinesscrm.com') &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(canonicalHost)
  ) {
    const url = req.nextUrl.clone()
    url.protocol = 'https'
    url.hostname = `www.${canonicalHost}`
    url.port = ''
    return NextResponse.redirect(url, 301)
  }
  return null
}
