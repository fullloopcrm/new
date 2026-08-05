/**
 * The public booking-page path referral/sales-partner share links point at.
 * Most tenants (nycmaid + every /site/template tenant) serve booking at
 * /book/new. A few bespoke-site tenants kept an older /book or /portal/book
 * path live instead -- this is a lookup, not a guess, so a share link never
 * points at a path that 404s for that tenant's actual site.
 */
const TENANT_BOOKING_PATH: Record<string, string> = {
  'nyc-mobile-salon': '/book',
  'wash-and-fold-nyc': '/book',
  'the-florida-maid': '/portal/book',
}

export function bookingPathForTenant(slug: string | null | undefined): string {
  return (slug && TENANT_BOOKING_PATH[slug]) || '/book/new'
}
