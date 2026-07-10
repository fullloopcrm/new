/**
 * SiteConfig — the per-tenant data that drives the template.
 *
 * The template is a layout shell; every brand-specific value (name, phone,
 * colors, geo, agent, and progressively all visible copy) is read from a
 * SiteConfig. Today a single static default (see ./site.ts) is seeded with
 * the tenant's values so the template renders identically to its source.
 * Phase 3 swaps that static default for a per-tenant loader keyed off the
 * tenant resolved by middleware, aligning with TENANT-CONFIG-SCHEMA.md.
 */

export interface SiteIdentity {
  /** Display brand name, e.g. "the tenant" */
  name: string
  /** Optional legal entity name */
  legalName?: string
  /** Canonical site origin, no trailing slash, e.g. "https://www.example.com" */
  url: string
  /** OpenGraph siteName; falls back to `name` when omitted */
  siteName?: string
  /** Year the business was founded */
  foundedYear?: number
  /** Logo asset path served from /public, e.g. "/logo.png" */
  logo?: string
}

export interface SiteContact {
  /** Human-formatted sales phone, e.g. "(555) 555-5555" */
  phone: string
  /** Sales phone digits only, for tel:/sms: hrefs, e.g. "5555555555" */
  phoneDigits: string
  /** Primary contact email */
  email: string
  /** Optional human-formatted support phone */
  supportPhone?: string
  /** Optional support phone digits for tel:/sms: hrefs */
  supportPhoneDigits?: string
}

export interface SiteGeo {
  /** ISO region code, e.g. "US-NY" */
  region: string
  /** Human place name, e.g. "New York City" */
  placename: string
  lat: number
  lng: number
}

export interface SiteTheme {
  /** Primary brand color (deep navy in nycmaid) */
  primary: string
  /** Secondary shade of primary, used in gradients */
  primaryAlt?: string
  /** Accent color (mint in nycmaid) */
  accent: string
  /** Accent hover shade */
  accentHover?: string
  /** Light surface/background tint */
  surface?: string
}

export interface SiteAgent {
  /** Conversational agent name, e.g. "Assistant" */
  name: string
}

export interface ServiceOption {
  /** Stored value / booking service_type, e.g. "Standard Cleaning" */
  value: string
  /** Short button label, e.g. "Standard" */
  label: string
  /** Default estimated hours for this option */
  hours: number
  /** When true, hidden from the standard picker (e.g. same-day/emergency) */
  emergency?: boolean
}

export interface SiteConfig {
  identity: SiteIdentity
  contact: SiteContact
  geo: SiteGeo
  theme: SiteTheme
  agent: SiteAgent
  /** Star rating shown in trust badges, e.g. 5.0 */
  rating: number
  /** Review count label, e.g. "50+" */
  reviewCount: string
  /** Bookable service options for /book/new — vertical-specific, config-driven */
  services: ServiceOption[]
  /**
   * Which funnel the tenant runs — drives the front-end shape:
   *  'booking'   → book-now CTAs + /book/new
   *  'pipeline'  → quote-first CTAs (request a quote) instead of instant booking
   *  'lead_only' → contact/lead capture only; no booking or pricing surfaced
   */
  funnelMode: 'booking' | 'pipeline' | 'lead_only'
  /**
   * The tenant's trade (e.g. 'cleaning', 'plumbing', 'towing'). Drives
   * industry-aware copy in the content generators so a non-cleaning tenant's
   * site stops reading as a cleaning site. Falls back to 'general'.
   */
  industry: string
}
