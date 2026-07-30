// Single source of truth for the-florida-maid's self-book promo discount
// (dollars off, applied at billing for jobs booked through the client
// self-book form). Mirrors src/lib/nycmaid/self-book-discount.ts's pattern —
// site copy (page.tsx, MarketingNav, CTABlock, book-now) all say $20; this
// constant is what team-portal/30min-alert actually enforces at billing.
export const SELF_BOOKING_DISCOUNT_DOLLARS = 20
