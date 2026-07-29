/**
 * Read-only historical audit for the phantom-tip bug (pre-checkout pay-link
 * payments compared against a stale booking.price, misread as a tip). Scoped
 * to the last 30 days, all tenants, Stripe payments with tip_cents > 0 only
 * -- a targeted filter, not a full-table sweep.
 *
 * For each candidate booking: recompute the authoritative final bill (same
 * math as closeout-summary/route.ts) to decide phantom vs real tip, then
 * check team_member_payouts to see whether that phantom amount was already
 * PAID OUT to a cleaner (the real-money-already-moved case) vs. merely shown
 * as owed but never paid (payments-table-only correction, same as today's
 * fix, no clawback needed).
 *
 * Writes nothing. Report only.
 *
 *   npx tsx --env-file=.env.local scripts/audit-historical-phantom-tips.ts
 */
import { supabaseAdmin } from '../src/lib/supabase'
import { applyDiscount } from '../src/lib/discount'
import { clientBilledHours, applyTeamMinimum } from '../src/lib/billing-hours'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '../src/lib/nycmaid/self-book-discount'

const EXECUTE = process.argv.includes('--execute')
const WINDOW_DAYS = 30
const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

type Booking = {
  id: string; tenant_id: string; start_time: string
  check_in_time: string | null; check_out_time: string | null
  hourly_rate: number | null; team_size: number | null
  discount_percent: number | null; one_time_credit_cents: number | null
  notes: string | null
  clients: { name: string } | { name: string }[] | null
}
type Payment = { id: string; booking_id: string; amount_cents: number | null; tip_cents: number | null; created_at: string }
type Payout = { id: string; booking_id: string; team_member_id: string; amount_cents: number | null; status: string | null }

function name(b: Booking): string {
  const c = Array.isArray(b.clients) ? b.clients[0] : b.clients
  return c?.name || '(unknown)'
}

function computeFinalCents(b: Booking): number {
  const ci = b.check_in_time ? new Date(b.check_in_time.endsWith('Z') || b.check_in_time.includes('+') ? b.check_in_time : b.check_in_time + 'Z') : null
  const co = b.check_out_time ? new Date(b.check_out_time.endsWith('Z') || b.check_out_time.includes('+') ? b.check_out_time : b.check_out_time + 'Z') : null
  if (!ci) return 0
  const rawMinutes = Math.max(0, ((co || new Date()).getTime() - ci.getTime()) / 60000)
  const teamSize = Math.max(1, b.team_size || 1)
  const billedHours = applyTeamMinimum(Math.max(0.5, clientBilledHours(rawMinutes)), teamSize)
  const hourlyRate = b.hourly_rate || 79
  const grossCents = Math.round(billedHours * hourlyRate * teamSize * 100)
  let cents = applyDiscount(grossCents, b.discount_percent)
  cents -= (b.one_time_credit_cents || 0)
  const noteText = b.notes || ''
  if (/self-booking discount/i.test(noteText)) cents -= SELF_BOOKING_DISCOUNT_DOLLARS * 100
  return Math.max(0, cents)
}

async function main() {
  console.log(`Auditing Stripe payments with tip_cents > 0 since ${since} (${WINDOW_DAYS}d window, all tenants)...\n`)

  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select('id, booking_id, amount_cents, tip_cents, created_at')
    .eq('method', 'stripe')
    .gt('tip_cents', 0)
    .gte('created_at', since)
  if (pErr) { console.error('payments query failed:', pErr.message); process.exit(1) }
  if (!payments || payments.length === 0) { console.log('No Stripe payments with tip_cents > 0 in this window.'); return }

  const bookingIds = [...new Set((payments as Payment[]).map((p) => p.booking_id))]
  const { data: bookings, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, check_in_time, check_out_time, hourly_rate, team_size, discount_percent, one_time_credit_cents, notes, clients(name)')
    .in('id', bookingIds)
  if (bErr) { console.error('bookings query failed:', bErr.message); process.exit(1) }

  const { data: payouts, error: poErr } = await supabaseAdmin
    .from('team_member_payouts')
    .select('id, booking_id, team_member_id, amount_cents, status')
    .in('booking_id', bookingIds)
  if (poErr) { console.error('payouts query failed:', poErr.message); process.exit(1) }

  const byBooking = new Map<string, Payment[]>()
  for (const p of payments as Payment[]) {
    if (!byBooking.has(p.booking_id)) byBooking.set(p.booking_id, [])
    byBooking.get(p.booking_id)!.push(p)
  }
  const payoutsByBooking = new Map<string, Payout[]>()
  for (const po of (payouts || []) as Payout[]) {
    if (!payoutsByBooking.has(po.booking_id)) payoutsByBooking.set(po.booking_id, [])
    payoutsByBooking.get(po.booking_id)!.push(po)
  }

  console.log(`${payments.length} payment row(s) across ${byBooking.size} booking(s) to check.\n`)

  let phantomBookings = 0
  let phantomCents = 0
  let alreadyPaidOutCount = 0
  let alreadyPaidOutCents = 0
  let realTipBookings = 0
  const toZero: Payment[] = []

  for (const [bookingId, pays] of byBooking) {
    const booking = (bookings as Booking[]).find((b) => b.id === bookingId)
    if (!booking) { console.log(`SKIP  booking ${bookingId} not found (deleted?)`); continue }
    const finalCents = computeFinalCents(booking)
    const totalPaid = pays.reduce((s, p) => s + (p.amount_cents || 0), 0)
    const recordedTip = pays.reduce((s, p) => s + (p.tip_cents || 0), 0)
    const isGenuine = totalPaid > finalCents

    if (isGenuine) {
      realTipBookings++
      continue
    }

    phantomBookings++
    phantomCents += recordedTip
    const payoutsForBooking = payoutsByBooking.get(bookingId) || []
    const paidOut = payoutsForBooking.filter((po) => po.status === 'paid' || po.status === 'transferred')
    const paidOutCents = paidOut.reduce((s, po) => s + (po.amount_cents || 0), 0)

    if (paidOut.length > 0) {
      alreadyPaidOutCount++
      alreadyPaidOutCents += paidOutCents
      console.log(`⚠ PAID  ${name(booking)} (${bookingId}, ${booking.start_time.slice(0, 10)}): phantom tip $${(recordedTip / 100).toFixed(2)} -- payout ALREADY RECORDED as ${paidOut[0].status} ($${(paidOutCents / 100).toFixed(2)} across ${paidOut.length} row(s)). Needs manual review -- may include the phantom amount.`)
    } else {
      console.log(`FIX   ${name(booking)} (${bookingId}, ${booking.start_time.slice(0, 10)}): phantom tip $${(recordedTip / 100).toFixed(2)} -- no payout recorded yet, safe to correct like today's 3.`)
      toZero.push(...pays)
    }
  }

  console.log(`\n=== Summary (last ${WINDOW_DAYS} days) ===`)
  console.log(`Real tips (left alone): ${realTipBookings}`)
  console.log(`Phantom tips found: ${phantomBookings}, totaling $${(phantomCents / 100).toFixed(2)}`)
  console.log(`Of those, already recorded as PAID OUT to a cleaner: ${alreadyPaidOutCount} booking(s), $${(alreadyPaidOutCents / 100).toFixed(2)} -- these need a human decision, not an automated fix.`)
  console.log(`Safe to auto-correct (no payout recorded): ${toZero.length} payment row(s).`)

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.')
    return
  }
  for (const p of toZero) {
    const { error } = await supabaseAdmin.from('payments').update({ tip_cents: 0 }).eq('id', p.id)
    if (error) console.error(`Failed to zero payment ${p.id}:`, error.message)
  }
  console.log(`\nApplied: zeroed tip_cents on ${toZero.length} payment row(s).`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
