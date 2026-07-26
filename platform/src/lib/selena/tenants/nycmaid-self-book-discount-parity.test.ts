import { describe, it, expect } from 'vitest'
import { NYCMAID_PROMPT } from './nycmaid'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '@/lib/nycmaid/self-book-discount'

/**
 * Guards against the exact drift that shipped for a while: Yinez's SELF-BOOK
 * OFFER script said $20 (twice — the verbatim opener and the hold-the-line
 * pushback line) while the amount actually deducted at billing
 * (team-portal/15min-alert, via SELF_BOOKING_DISCOUNT_DOLLARS) was $10. The
 * same $20 mislabel independently recurred in admin/bookings/closeout-summary's
 * comments too — this isn't a one-off typo, it's a recurring class of bug
 * whenever the discount amount changes in one place but not every place that
 * quotes it in free text. Every quoted dollar figure in the SELF-BOOK OFFER
 * section must match the single source of truth, or this fails the build
 * instead of shipping a promise Yinez can't back up.
 */
describe('nycmaid self-book discount — prompt vs. enforced amount', () => {
  it('every dollar figure in the SELF-BOOK OFFER section matches SELF_BOOKING_DISCOUNT_DOLLARS', () => {
    // 'SELF-BOOK OFFER' alone also matches an earlier cross-reference ("see
    // SELF-BOOK OFFER below") -- anchor on the full section header instead so
    // this doesn't sweep in unrelated pricing figures ($69/hr etc.) from
    // everything in between.
    const start = NYCMAID_PROMPT.indexOf('SELF-BOOK OFFER (HARD RULE')
    const end = NYCMAID_PROMPT.indexOf('does NOT fire for returning clients')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const section = NYCMAID_PROMPT.slice(start, end)

    const matches = [...section.matchAll(/\$(\d+)/g)]
    // At least the verbatim opener + the pushback line's two mentions.
    expect(matches.length).toBeGreaterThanOrEqual(3)
    for (const m of matches) {
      expect(Number(m[1])).toBe(SELF_BOOKING_DISCOUNT_DOLLARS)
    }
  })
})
