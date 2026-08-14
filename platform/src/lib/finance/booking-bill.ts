import { supabaseAdmin } from '@/lib/supabase'
import { applyDiscount, describeDiscount } from '@/lib/discount'
import { clientBilledHours, applyTeamMinimum } from '@/lib/billing-hours'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '@/lib/nycmaid/self-book-discount'

export interface BookingBill {
  grossCents: number
  discounts: Array<{ label: string; cents: number }>
  totalDiscountCents: number
  finalCents: number
  ccCents: number
}

// What a client actually owes on a booking, computed the same way the
// bookings close-out screen computes it (closeout-summary/route.ts) --
// from real billed hours (check-in/check-out, team size, hourly rate) minus
// every itemized discount, NOT from the `bookings.price` column, which is
// only ever a quote from booking time and can legitimately differ once the
// job actually ran (and, separately, once a self-booking/promo discount in
// the notes applies at billing rather than at quote time).
//
// Root-caused 2026-08-14: two routes (bookings/[id]/record-payment and
// unmatched-payments/[id]/resolve) decided payment_status by comparing
// total paid against raw `bookings.price` -- a different, larger number
// than what the close-out screen showed as owed and what its "Mark Paid"
// button actually charged. Grace Wolf and Simon Dolsten each had a $10
// self-booking discount baked into their real bill; their Mark Paid clicks
// paid exactly what the UI said was owed and STILL showed "partial"
// forever, because the two routes were judging "paid in full" against a
// number $10 higher than what was ever actually owed. Both routes now call
// this single function so the amount charged and the amount required to
// call it paid can never disagree again.
export async function computeBookingBill(tenantId: string, bookingId: string): Promise<BookingBill | null> {
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('hourly_rate, team_size, actual_hours, check_in_time, check_out_time, discount_percent, one_time_credit_cents, one_time_credit_reason, notes')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()
  if (error || !booking) return null

  const ci = booking.check_in_time
    ? new Date(((booking.check_in_time as string).endsWith('Z') || (booking.check_in_time as string).includes('+')) ? (booking.check_in_time as string) : booking.check_in_time + 'Z')
    : null
  const co = booking.check_out_time
    ? new Date(((booking.check_out_time as string).endsWith('Z') || (booking.check_out_time as string).includes('+')) ? (booking.check_out_time as string) : booking.check_out_time + 'Z')
    : null
  const rawMinutes = ci ? Math.max(0, ((co || new Date()).getTime() - ci.getTime()) / 60000) : 0
  const teamSize = Math.max(1, booking.team_size || 1)
  const computedHours = ci ? applyTeamMinimum(Math.max(0.5, clientBilledHours(rawMinutes)), teamSize) : (booking.actual_hours || 0)
  const billedHours = (ci && co) ? computedHours : (booking.actual_hours ?? computedHours)

  const hourlyRate = booking.hourly_rate || 79
  const grossCents = Math.round(billedHours * hourlyRate * teamSize * 100)

  const discounts: Array<{ label: string; cents: number }> = []
  const discountedGrossCents = applyDiscount(grossCents, booking.discount_percent as number | null)
  const customDiscountCents = grossCents - discountedGrossCents
  if (customDiscountCents > 0) {
    discounts.push({ label: describeDiscount(booking.discount_percent as number | null) || 'Discount', cents: customDiscountCents })
  }
  const creditCents = (booking.one_time_credit_cents as number | null) || 0
  if (creditCents > 0) {
    discounts.push({ label: (booking.one_time_credit_reason as string | null) || 'One-time credit', cents: creditCents })
  }
  const noteText = (booking.notes as string) || ''
  if (/self-booking discount/i.test(noteText)) {
    discounts.push({ label: 'Self-booking discount', cents: SELF_BOOKING_DISCOUNT_DOLLARS * 100 })
  }
  const promoRe = /\[Promo:\s*\$(\d+)\s+([^\]]+?)\s+(?:discount\s+)?(?:applied|applies(?:\s+at\s+billing)?)\]/gi
  let m: RegExpExecArray | null
  while ((m = promoRe.exec(noteText)) !== null) {
    const dollars = parseInt(m[1], 10)
    const label = m[2].replace(/\s+/g, ' ').trim()
    if (/self-book/i.test(label)) continue // already itemized above -- don't double-count
    discounts.push({ label, cents: dollars * 100 })
  }
  const totalDiscountCents = discounts.reduce((s, d) => s + d.cents, 0)
  const finalCents = Math.max(0, grossCents - totalDiscountCents)
  const ccCents = Math.round(finalCents * 1.04)

  return { grossCents, discounts, totalDiscountCents, finalCents, ccCents }
}
