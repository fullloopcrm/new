// Single source of truth for "recompute the client bill + cleaner pay at
// checkout" — shared by every UI that finalizes a booking's actual price:
// BookingsAdmin.tsx's Check Out flows and the team-portal checkout route.
//
// Ported here from independently hand-rolled copies (a 5-minute single grace
// window used for BOTH client and cleaner hours, no recurring-service
// discount re-application, and — in the team-portal copy specifically — a
// missing team-minimum floor and, later, a re-introduced discount
// double-application bug even after this file was fixed) — the exact kind of
// "drift across copy-pasted copies" billing-hours.ts warns about. This
// composes the canonical primitives instead: clientBilledHours()/
// cleanerPaidHours() (the real 10-min/15-min dual grace), applyTeamMinimum()
// (2+ cleaner 4hr floor), applyDiscount()/applyCredit() (the final discount +
// one-time credit).
//
// discountPercent vs. recurringType (2026-07-25, Jeff): a booking's
// discount_percent is the FINAL, single discount rate whenever it's set —
// every creation path that knows about recurring_type (admin/recurring-
// schedules, client/recurring, cron/generate-recurring inheriting from the
// schedule) already defaults it to the recurring-frequency rate and lets an
// explicit admin value REPLACE that default, never stack with it. This
// function used to apply the recurring discount AGAIN on top of that
// already-final discountPercent, silently double-discounting every recurring
// booking the moment it went through an actual check-in/check-out recompute
// (e.g. a weekly booking netted ~36% off instead of 20%). The recurring rate
// is now derived fresh ONLY when discountPercent is null/undefined —
// covering sale-to-recurring.ts, the one creation path that never sets it —
// so that path keeps its discount while everyone else stops being doubled.
import { clientBilledHours, cleanerPaidHours, applyTeamMinimum } from './billing-hours'
import { applyDiscount, applyCredit } from './discount'
import { applyRecurringDiscount } from './nycmaid/recurring-discount'

export interface CheckoutPricingInput {
  checkInIso: string
  checkOutIso: string
  hourlyRate: number | null | undefined
  cleanerHourlyRate: number | null | undefined
  discountPercent: number | null | undefined
  oneTimeCreditCents: number | null | undefined
  recurringType: string | null | undefined
  maxHours: number | null | undefined
  teamSize: number | null | undefined
}

export interface CheckoutPricingResult {
  /** True elapsed time, client-grace-rounded and max_hours-capped — NOT
   *  team-minimum-floored. This is what gets stored as the booking's
   *  actual_hours record of how long the job really took. */
  actualHours: number
  priceCents: number
  cleanerPayCents: number
}

function toDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
}

export function computeCheckoutPricing(input: CheckoutPricingInput): CheckoutPricingResult {
  const rawMinutes = Math.max(0, (toDate(input.checkOutIso).getTime() - toDate(input.checkInIso).getTime()) / 60000)

  const clientHours = clientBilledHours(rawMinutes)
  const cleanerHours = cleanerPaidHours(rawMinutes)
  const cap = typeof input.maxHours === 'number' && input.maxHours > 0 ? input.maxHours : null
  const billableClientHours = cap != null ? Math.min(clientHours, cap) : clientHours
  const billableCleanerHours = cap != null ? Math.min(cleanerHours, cap) : cleanerHours

  const teamSize = Math.max(1, input.teamSize || 1)
  // The team minimum only feeds price/pay — actualHours (returned below)
  // stays the true elapsed/capped time for reporting.
  const billableClientForPrice = applyTeamMinimum(billableClientHours, teamSize)
  const billableCleanerForPay = applyTeamMinimum(billableCleanerHours, teamSize)

  const clientRate = input.hourlyRate || 69
  const baseCents = Math.round(billableClientForPrice * clientRate * teamSize * 100)
  // See the discountPercent-vs-recurringType note above: discountPercent
  // (when set) is already the final combined rate, so it alone decides the
  // discount -- applyRecurringDiscount only fires as a fallback for the one
  // creation path (sale-to-recurring.ts) that never persists discountPercent.
  // The two branches keep their own historical rounding conventions
  // (applyDiscount floors to the nearest $5; applyRecurringDiscount
  // plain-rounds) rather than funneling both through one.
  const discountedCents = input.discountPercent != null
    ? applyDiscount(baseCents, input.discountPercent)
    : applyRecurringDiscount(baseCents, input.recurringType ?? null)
  const priceCents = applyCredit(discountedCents, input.oneTimeCreditCents ?? null)

  const cleanerRate = input.cleanerHourlyRate || (clientRate <= 60 ? 25 : 30)
  const cleanerPayCents = Math.round(billableCleanerForPay * cleanerRate * 100)

  return { actualHours: billableClientHours, priceCents, cleanerPayCents }
}
