/**
 * BrandContext — the per-tenant identity values threaded through the SEO content
 * and schema layer so those helpers stop hardcoding "Your Business" / phone / URL
 * and instead render the tenant resolved by middleware.
 *
 * Scope note (L1): this carries the IDENTITY fields only — name, phone, url,
 * city/region. Price and industry-specific wording ("$59/hr", "maid service")
 * are NOT here: tokenizing rich editorial copy would make pages thin. Those come
 * from the L2 per-tenant content-generation pass, keyed to industry + geo data.
 *
 * Every content/schema function takes an optional `brand` and falls back to the
 * neutral default, so a call site that hasn't been threaded yet still compiles
 * and renders (just with the placeholder), making the migration incremental.
 */
import type { SiteConfig } from '@/app/site/template/_config/types'

export interface BrandContext {
  /** Display brand name, e.g. "Sparkle Clean NYC" */
  name: string
  /** OpenGraph siteName; falls back to name */
  siteName: string
  /** Canonical origin, no trailing slash */
  url: string
  /** Human-formatted phone, e.g. "(212) 555-1212" */
  phone: string
  /** Digits only, for tel:/sms: hrefs */
  phoneDigits: string
  /** Human place name, e.g. "New York City" */
  city: string
  /** ISO region code, e.g. "US-NY" */
  region: string
}

/** Neutral fallback so un-threaded call sites still render. */
export const DEFAULT_BRAND: BrandContext = {
  name: 'Your Business',
  siteName: 'Your Business',
  url: 'https://example.com',
  phone: '(555) 555-5555',
  phoneDigits: '5555555555',
  city: 'your area',
  region: 'US-NY',
}

/** Map a resolved SiteConfig onto the BrandContext the SEO layer consumes. */
export function toBrand(config: SiteConfig): BrandContext {
  return {
    name: config.identity.name,
    siteName: config.identity.siteName ?? config.identity.name,
    url: config.identity.url,
    phone: config.contact.phone,
    phoneDigits: config.contact.phoneDigits,
    city: config.geo.placename,
    region: config.geo.region,
  }
}
