import {
  findIndustryByPageSlug,
  findMetroByPageSlug,
  findCombo,
  industryPath,
  locationPath,
  comboPath,
} from '@/lib/marketing/combos'

// --- 2026-07-28 slug redesign: 301 old marketing-site URLs to the new
// short-tail/nested formats. Main host only — never touches tenant routing
// (the caller gates this on isMainHost(hostname) before calling in).
// Order matters: industry hub (2 segments) before combo (also under
// /industry/*, distinguished by whether the 2nd segment resolves to a metro).
//
// 2026-08-01 incident: this entire function was accidentally deleted by an
// unrelated EMD-microsites commit (e51fe908e), 404ing the site's #1-ranked
// keyword page for over a day before anyone noticed — see
// src/middleware.legacy-redirects.test.ts, which pins this behavior. It now
// lives in its own file specifically so an unrelated middleware.ts edit
// can't collaterally delete it again.
export function redirectLegacyMarketingUrl(pathname: string): string | null {
  // Old flat combo page: /crm-for-{industry}-businesses-in-{metro-shortSlug}
  if (pathname.startsWith('/crm-for-') && pathname.includes('-businesses-in-')) {
    const match = findCombo(pathname.slice(1))
    if (match) return comboPath(match.industry, match.metro)
  }

  // Old industry hub: /industry/crm-for-{industry}-businesses
  const industryMatch = pathname.match(/^\/industry\/(crm-for-.+)$/)
  if (industryMatch) {
    const industry = findIndustryByPageSlug(industryMatch[1])
    if (industry) return industryPath(industry)
  }

  // Old location page: /location/home-service-crm-in-{metro-shortSlug}
  const locationMatch = pathname.match(/^\/location\/(home-service-crm-in-.+)$/)
  if (locationMatch) {
    const metro = findMetroByPageSlug(locationMatch[1])
    if (metro) return locationPath(metro)
  }

  return null
}
