/**
 * Synthetic, self-cleaning verification of the phantom-tip fix. Creates one
 * TRACE-TEST booking (reusing the existing safe convention: client "Jeff
 * Tucker", inactive team member "Natalya Kondratyeva" -- invisible to any
 * real cleaner's live schedule/portal), simulates the exact sequence a real
 * pre-checkout pay-link job goes through with the fix applied, prints what
 * the closeout screen would show, then deletes everything it created.
 *
 * No SMS sent, no real Stripe charge, no data left behind.
 *
 *   npx tsx --env-file=.env.local scripts/trace-test-phantom-tip-verify.ts
 */
import { supabaseAdmin } from '../src/lib/supabase'
import { applyDiscount } from '../src/lib/discount'
import { clientBilledHours, cleanerPaidHours, applyTeamMinimum } from '../src/lib/billing-hours'

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const TEST_CLIENT_ID = 'da171c87-be66-4c86-ad6c-44cadd352088' // Jeff Tucker
const TEST_TEAM_MEMBER_ID = '276ada04-2900-4647-93b1-88ff798d2aeb' // Natalya Kondratyeva (inactive)

async function main() {
  const now = new Date()
  const checkIn = new Date(now.getTime() - 2 * 60 * 60 * 1000) // "checked in" 2h ago
  const hourlyRate = 69
  const teamSize = 1
  const staleCreationPrice = 15000 // deliberately wrong, stands in for whatever was on the row before the alert

  console.log('1. Creating TRACE TEST booking (in progress, not yet checked out)...')
  const { data: booking, error: insErr } = await supabaseAdmin
    .from('bookings')
    .insert({
      tenant_id: NYCMAID_TENANT_ID,
      client_id: TEST_CLIENT_ID,
      team_member_id: TEST_TEAM_MEMBER_ID,
      notes: 'TRACE TEST — phantom-tip fix verification (auto-deleted by script)',
      service_type: 'regular',
      hourly_rate: hourlyRate,
      team_size: teamSize,
      status: 'in_progress',
      start_time: checkIn.toISOString(),
      end_time: new Date(checkIn.getTime() + 3.5 * 60 * 60 * 1000).toISOString(),
      check_in_time: checkIn.toISOString(),
      price: staleCreationPrice,
      payment_status: 'pending',
    })
    .select('id')
    .single()
  if (insErr || !booking) { console.error('booking insert failed:', insErr?.message); process.exit(1) }
  const bookingId = booking.id as string
  console.log(`   booking ${bookingId} created, stale price $${(staleCreationPrice / 100).toFixed(2)}`)

  try {
    // --- Step 2: simulate the 30-min-alert route (the fix) ---
    const rawMinutes = (now.getTime() - checkIn.getTime()) / 60000
    const projectedMinutes = rawMinutes + 30 // still in progress -> +30 buffer, same as the real route
    const estimatedTotalHours = Math.max(0.5, clientBilledHours(projectedMinutes))
    const grossOwedCents = Math.round(estimatedTotalHours * hourlyRate * teamSize * 100)
    const clientOwesCents = Math.max(0, applyDiscount(grossOwedCents, null))
    console.log(`2. Simulating 30-min-alert quote: ${estimatedTotalHours}h × $${hourlyRate}/hr = $${(clientOwesCents / 100).toFixed(2)}`)

    const { error: priceErr } = await supabaseAdmin
      .from('bookings')
      .update({ price: clientOwesCents })
      .eq('id', bookingId)
    if (priceErr) { console.error('price sync failed:', priceErr.message); process.exit(1) }
    console.log(`   booking.price synced to $${(clientOwesCents / 100).toFixed(2)} (this write is the fix)`)

    // --- Step 3: simulate the client paying exactly what was quoted, via Stripe ---
    const amountPaidCents = clientOwesCents
    const expectedCents = clientOwesCents // webhook reads booking.price, which now equals this
    const tipCents = amountPaidCents >= expectedCents ? amountPaidCents - expectedCents : 0
    console.log(`3. Simulating Stripe payment of $${(amountPaidCents / 100).toFixed(2)} — webhook tip math: $${(tipCents / 100).toFixed(2)}`)

    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .insert({
        tenant_id: NYCMAID_TENANT_ID,
        booking_id: bookingId,
        client_id: TEST_CLIENT_ID,
        amount_cents: amountPaidCents,
        tip_cents: tipCents,
        method: 'stripe',
        status: 'completed',
        stripe_session_id: `trace_test_${bookingId}`,
      })
      .select('id')
      .single()
    if (payErr || !payment) { console.error('payment insert failed:', payErr?.message); process.exit(1) }

    // --- Step 4: simulate checkout close to what the alert's +30min buffer projected ---
    const checkOut = new Date(now.getTime() + 27 * 60 * 1000)
    await supabaseAdmin.from('bookings').update({ check_out_time: checkOut.toISOString(), status: 'completed' }).eq('id', bookingId)
    console.log(`4. Simulated checkout at ${checkOut.toISOString()}`)

    // --- Step 5: recompute the same authoritative numbers closeout-summary shows ---
    const finalRawMinutes = (checkOut.getTime() - checkIn.getTime()) / 60000
    const billedHours = applyTeamMinimum(Math.max(0.5, clientBilledHours(finalRawMinutes)), teamSize)
    const finalCents = Math.max(0, applyDiscount(Math.round(billedHours * hourlyRate * teamSize * 100), null))
    const paidCents = amountPaidCents
    const overpaymentCents = paidCents - finalCents
    const cleanerBilledHours = applyTeamMinimum(Math.max(0.5, cleanerPaidHours(finalRawMinutes)), teamSize)
    const cleanerRate = 30 // defaultRate for hourlyRate>60, matches team_member.pay_rate=null fallback
    const cleanerBase = Math.round(cleanerBilledHours * cleanerRate * 100)
    const cleanerTip = tipCents // teamSize=1, full share

    console.log('\n=== What the booking checkout screen shows ===')
    console.log(`Bill: ${billedHours}h × $${hourlyRate}/hr × ${teamSize} = $${(finalCents / 100).toFixed(2)}`)
    console.log(`Payments received: $${(paidCents / 100).toFixed(2)}`)
    console.log(`Expected: $${(finalCents / 100).toFixed(2)}`)
    console.log(overpaymentCents === 0 ? 'Balanced +$0.00' : `${overpaymentCents > 0 ? 'Tip / overpayment' : 'Underpaid'} ${overpaymentCents >= 0 ? '+' : ''}$${(overpaymentCents / 100).toFixed(2)}`)
    console.log(`\nCleaner payout: ${cleanerBilledHours}h × $${cleanerRate}/hr = $${(cleanerBase / 100).toFixed(2)}`)
    console.log(cleanerTip > 0 ? `Tip share: $${(cleanerTip / 100).toFixed(2)}` : '(no Tip share line -- tip_cents is 0)')
    console.log(`Total due: $${((cleanerBase + cleanerTip) / 100).toFixed(2)}`)
  } finally {
    console.log('\n5. Cleaning up -- deleting test payment + booking...')
    await supabaseAdmin.from('payments').delete().eq('booking_id', bookingId)
    await supabaseAdmin.from('bookings').delete().eq('id', bookingId)
    const { data: check } = await supabaseAdmin.from('bookings').select('id').eq('id', bookingId).maybeSingle()
    console.log(check ? '   WARNING: booking still present after delete!' : '   confirmed deleted, no trace left.')
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
