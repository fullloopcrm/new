// Single source of truth for "recompute the client bill + cleaner pay at
// checkout" — shared by every UI that finalizes a booking's actual price.
//
// Ported here from two independently hand-rolled copies inside
// BookingsAdmin.tsx (a 5-minute single grace window used for BOTH client and
// cleaner hours, and no recurring-service discount re-application) — the
// exact kind of "drift across copy-pasted copies" billing-hours.ts warns
// about. This composes the canonical primitives instead: clientBilledHours()/
// cleanerPaidHours() (the real 10-min/15-min dual grace), applyTeamMinimum()
// (2+ cleaner 4hr floor), applyRecurringDiscount() (20%/10% weekly/biweekly-
// monthly), applyDiscount()/applyCredit() (admin overrides).
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
  const priceCents = applyCredit(
    applyDiscount(
      applyRecurringDiscount(
        Math.round(billableClientForPrice * clientRate * teamSize * 100),
        input.recurringType ?? null,
      ),
      input.discountPercent ?? null,
    ),
    input.oneTimeCreditCents ?? null,
  )

  const cleanerRate = input.cleanerHourlyRate || (clientRate <= 60 ? 25 : 30)
  const cleanerPayCents = Math.round(billableCleanerForPay * cleanerRate * 100)

  return { actualHours: billableClientHours, priceCents, cleanerPayCents }
}
