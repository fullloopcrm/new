// Single source of truth for nycmaid's self-book promo discount (dollars off,
// applied at billing for jobs booked through the client self-book form).
//
// Was $20 in an earlier era; nycmaid_prompt (Yinez's script) and this file's
// own comments drifted out of sync at $20 more than once even after the real
// enforced amount (team-portal/15min-alert) moved to $10 -- see
// nycmaid-self-book-discount-parity.test.ts, which fails the build the next
// time that happens instead of silently shipping a promise Yinez can't back up.
export const SELF_BOOKING_DISCOUNT_DOLLARS = 10
