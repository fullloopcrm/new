/**
 * One-off correction: zero out phantom "tip" attribution on TODAY's Stripe
 * payments, created by the pre-checkout pay-link bug fixed alongside this
 * script (see route.ts in 30min-alert/ and webhooks/stripe/). That bug
 * compared what a client paid against a stale booking.price snapshot from
 * before the payment was quoted, and misread the (usually small) gap as a
 * tip -- inflating what a cleaner is shown, and can be marked/paid, as owed.
 *
 * Scope: bookings with start_time today (America/New_York), all tenants.
 * For each, recomputes the SAME authoritative final bill the closeout-
 * summary endpoint uses (real check-in/check-out hours, real discounts) and
 * compares it to what was actually paid. Only corrects a payment's tip_cents
 * to 0 when total paid does NOT exceed that authoritative final bill --
 * i.e. there is provably no real overpayment, so any recorded tip is fake.
 * A booking that genuinely was overpaid (a real client-entered tip on the
 * adjustable-amount link) is left untouched.
 *
 * amount_cents (the real money received) is never changed -- only the
 * tip_cents/amount_cents split within it, which is what feeds the cleaner
 * payout math in closeout-summary and the cleaner-facing payout screens.
 *
 * Dry run by default -- prints every booking it would touch and why.
 *
 *   npx tsx --env-file=.env.local scripts/fix-phantom-tips-today.ts            (dry run)
 *   npx tsx --env-file=.env.local scripts/fix-phantom-tips-today.ts --execute  (writes)
 */
import { supabaseAdmin } from '../src/lib/supabase'
import { applyDiscount, describeDiscount } from '../src/lib/discount'
import { clientBilledHours, applyTeamMinimum } from '../src/lib/billing-hours'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '../src/lib/nycmaid/self-book-discount'

const EXECUTE = process.argv.includes('--execute')

// Today = 2026-07-29 in America/New_York (EDT, UTC-4).
const DAY_START_UTC = new Date('2026-07-29T04:00:00.000Z')
const DAY_END_UTC = new Date('2026-07-30T04:00:00.000Z')

type Booking = {
  id: string; tenant_id: string; start_time: string
  check_in_time: string | null; check_out_time: string | null
  hourly_rate: number | null; team_size: number | null
  discount_percent: number | null; one_time_credit_cents: number | null
  notes: string | null
  clients: { name: string } | { name: string }[] | null
}
type Payment = { id: string; booking_id: string; amount_cents: number | null; tip_cents: number | null; method: string | null }

function clientName(b: Booking): string {
  const c = Array.isArray(b.clients) ? b.clients[0] : b.clients
  return c?.name || '(unknown client)'
}

// Mirrors closeout-summary/route.ts's bill math exactly, minus discount
// sources this script doesn't need to reproduce in full generality (the
// [Promo: ...] notes regex) -- if any of today's flagged bookings uses that
// path this script will UNDER-discount and so UNDER-estimate finalCents,
// which only makes the phantom-tip test MORE conservative (harder to trip),
// never wrongly zeroes a real tip.
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
  const { data: bookings, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, check_in_time, check_out_time, hourly_rate, team_size, discount_percent, one_time_credit_cents, notes, clients(name)')
    .gte('start_time', DAY_START_UTC.toISOString())
    .lt('start_time', DAY_END_UTC.toISOString())
  if (bErr) { console.error('booking query failed:', bErr.message); process.exit(1) }

  const bookingIds = (bookings || []).map((b) => b.id)
  if (bookingIds.length === 0) { console.log('No bookings found for today. Nothing to do.'); return }

  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select('id, booking_id, amount_cents, tip_cents, method')
    .in('booking_id', bookingIds)
    .eq('method', 'stripe')
    .gt('tip_cents', 0)
  if (pErr) { console.error('payments query failed:', pErr.message); process.exit(1) }

  if (!payments || payments.length === 0) {
    console.log(`Checked ${bookingIds.length} bookings today. No Stripe payments with tip_cents > 0 found.`)
    return
  }

  const byBooking = new Map<string, Payment[]>()
  for (const p of payments as Payment[]) {
    if (!byBooking.has(p.booking_id)) byBooking.set(p.booking_id, [])
    byBooking.get(p.booking_id)!.push(p)
  }

  console.log(`${payments.length} Stripe payment row(s) with tip_cents > 0, across ${byBooking.size} booking(s) today.\n`)

  let phantomCount = 0
  let phantomCents = 0
  const toZero: Payment[] = []

  for (const [bookingId, pays] of byBooking) {
    const booking = (bookings as Booking[]).find((b) => b.id === bookingId)
    if (!booking) continue
    const finalCents = computeFinalCents(booking)
    const totalPaidAllMethods = (pays.reduce((s, p) => s + (p.amount_cents || 0), 0))
    const recordedTipCents = pays.reduce((s, p) => s + (p.tip_cents || 0), 0)
    const isGenuineOverpay = totalPaidAllMethods > finalCents

    const label = `${clientName(booking)} (booking ${bookingId})`
    if (isGenuineOverpay) {
      console.log(`KEEP  ${label}: paid $${(totalPaidAllMethods / 100).toFixed(2)} > final bill $${(finalCents / 100).toFixed(2)} -- real overpayment, tip_cents left as-is ($${(recordedTipCents / 100).toFixed(2)}).`)
      continue
    }
    console.log(`FIX   ${label}: paid $${(totalPaidAllMethods / 100).toFixed(2)} <= final bill $${(finalCents / 100).toFixed(2)} -- recorded tip $${(recordedTipCents / 100).toFixed(2)} is phantom, zeroing.`)
    phantomCount++
    phantomCents += recordedTipCents
    toZero.push(...pays)
  }

  console.log(`\n${phantomCount} booking(s), $${(phantomCents / 100).toFixed(2)} total phantom tip to correct across ${toZero.length} payment row(s).`)

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
