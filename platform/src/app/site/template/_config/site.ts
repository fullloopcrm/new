import type { SiteConfig } from './types'

/**
 * Default site config — NEUTRAL placeholders, not a real brand. The template
 * ships unbranded; per-tenant values override these via the Phase 3 loader.
 * Anything still reading a placeholder here (e.g. "Your Business") is a brand
 * field that has been lifted out of the page body and now awaits tenant data.
 *
 * Colors are intentionally kept as a usable default design palette, not a brand
 * claim — swap per tenant when theming is wired.
 */
export const siteConfig: SiteConfig = {
  identity: {
    name: 'Your Business',
    url: 'https://example.com',
    siteName: 'Your Business',
    logo: '/logo.png',
  },
  contact: {
    phone: '(555) 555-5555',
    phoneDigits: '5555555555',
    email: 'hello@example.com',
    supportPhone: '(555) 555-5556',
    supportPhoneDigits: '5555555556',
  },
  geo: {
    region: 'US',
    placename: 'Your City',
    lat: 0,
    lng: 0,
  },
  theme: {
    primary: '#1E2A4A',
    primaryAlt: '#243352',
    accent: '#A8F0DC',
    accentHover: '#8DE8CC',
    surface: '#F5FBF8',
  },
  agent: { name: 'Assistant' },
  rating: 5.0,
  reviewCount: '50+',
  // Neutral default service options. Per-tenant config overrides these with the
  // tenant's real, vertical-specific offerings (cleaning, towing, pest, etc.).
  services: [
    { value: 'Standard Service', label: 'Standard', hours: 2 },
    { value: 'Extended Service', label: 'Extended', hours: 4 },
    { value: 'Same-Day Emergency', label: 'Same-Day', hours: 2, emergency: true },
  ],
}
