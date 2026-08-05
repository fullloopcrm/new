/**
 * Runs a Global Payouts batch: for every completed, client-paid booking whose
 * team member has a global_payouts_recipient_id and hasn't been paid yet,
 * auto-tops-up the tenant's Financial Account from the platform's available
 * Stripe balance (never pending/unsettled — Stripe enforces that, not this
 * code) and sends one OutboundPayment per booking.
 *
 * Mirrors the Connect auto-pay path in webhooks/stripe/route.ts and
 * payment-processor.ts: same claim-before-transfer idempotency guard via
 * team_member_payouts (UNIQUE(tenant_id, booking_id)), just a different
 * rail. Partial funding is not an error — bookings are paid in oldest-first
 * order until the topped-up balance runs out; the rest stay claimed=false
 * and simply retry on the next run.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { decryptSecret } from '@/lib/secret-crypto'
import { cleanerAlreadyPaid, releaseCleanerPayout } from '@/lib/finance/cleaner-payout'
import {
  claimGlobalPayout,
  finalizeGlobalPayout,
  getStorageFinancialAccount,
  ensureFinancialAccountFunded,
  createOutboundPayment,
} from '@/lib/finance/global-payouts'

function getStripe(key: string | null | undefined): Stripe {
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

interface EligibleBooking {
  id: string
  team_member_id: string
  team_member_pay: number | null
}

export async function POST() {
  const { tenant: authTenant, error: authError } = await requirePermission('finance.payroll')
  if (authError) return authError
  const tenantId = authTenant.tenantId

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, stripe_api_key')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const apiKey = tenant.stripe_api_key ? decryptSecret(tenant.stripe_api_key as string) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })
  const stripe = getStripe(tenant.stripe_api_key as string | null)

  const financialAccount = await getStorageFinancialAccount(apiKey)
  if (!financialAccount) {
    return NextResponse.json({ error: 'No Global Payouts Financial Account found for this Stripe account' }, { status: 400 })
  }

  // Eligible: completed, client-paid, cleaner not yet paid, cleaner has a
  // Global Payouts recipient on file. Oldest first so a partial top-up pays
  // the longest-waiting cleaners first.
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, team_member_id, team_member_pay, start_time, team_members!bookings_team_member_id_fkey(global_payouts_recipient_id, name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .eq('payment_status', 'paid')
    .or('team_member_paid.is.null,team_member_paid.eq.false')
    .not('team_member_pay', 'is', null)
    .order('start_time', { ascending: true })

  const eligible = (bookings || []).filter(b => {
    const tm = b.team_members as unknown as { global_payouts_recipient_id: string | null; name: string } | null
    return !!tm?.global_payouts_recipient_id
  }) as unknown as (EligibleBooking & { team_members: { global_payouts_recipient_id: string; name: string } })[]

  if (eligible.length === 0) {
    return NextResponse.json({ toppedUpCents: 0, paid: [], skipped: [], message: 'Nothing owed to any Global Payouts recipient' })
  }

  // Tip isn't folded into team_member_pay for bookings that never went through
  // the Connect branch (it only had a code path there) — pull it separately
  // so Global Payouts recipients get parity with Connect-paid cleaners.
  const { data: paymentRows } = await supabaseAdmin
    .from('payments')
    .select('booking_id, tip_cents')
    .eq('tenant_id', tenantId)
    .in('booking_id', eligible.map(b => b.id))
  const tipByBooking: Record<string, number> = {}
  for (const p of paymentRows || []) {
    tipByBooking[p.booking_id as string] = (tipByBooking[p.booking_id as string] || 0) + ((p.tip_cents as number) || 0)
  }

  const totalOwedCents = eligible.reduce((sum, b) => sum + (b.team_member_pay || 0) + (tipByBooking[b.id] || 0), 0)

  const funding = await ensureFinancialAccountFunded(
    stripe,
    apiKey,
    financialAccount.id,
    totalOwedCents,
    `gp-topup:${tenantId}:${new Date().toISOString().slice(0, 10)}:${totalOwedCents}`,
  )

  const paid: { bookingId: string; teamMemberName: string; amountCents: number }[] = []
  const skipped: { bookingId: string; teamMemberName: string; reason: string }[] = []

  for (const booking of eligible) {
    const tm = booking.team_members
    if (await cleanerAlreadyPaid(tenantId, booking.id)) continue

    const tipCents = tipByBooking[booking.id] || 0
    const amountCents = (booking.team_member_pay || 0) + tipCents
    if (amountCents <= 0) continue

    const claim = await claimGlobalPayout({
      tenantId,
      bookingId: booking.id,
      teamMemberId: booking.team_member_id,
      amountCents: booking.team_member_pay || 0,
      tipCents,
    })
    if (!claim.claimed || !claim.payoutId) {
      skipped.push({ bookingId: booking.id, teamMemberName: tm.name, reason: 'already claimed by another run' })
      continue
    }

    try {
      const outbound = await createOutboundPayment(apiKey, {
        financialAccountId: financialAccount.id,
        recipientId: tm.global_payouts_recipient_id,
        amountCents,
        description: `Cleaner pay — booking ${booking.id}`,
        idempotencyKey: `gp-payout:${booking.id}`,
      })
      await finalizeGlobalPayout({
        tenantId,
        payoutId: claim.payoutId,
        amountCents: booking.team_member_pay || 0,
        tipCents,
        stripeOutboundPaymentId: outbound.id,
      })
      await supabaseAdmin
        .from('bookings')
        .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('tenant_id', tenantId)
      paid.push({ bookingId: booking.id, teamMemberName: tm.name, amountCents })
    } catch (err) {
      // Most common cause here: the top-up above didn't cover this booking
      // (ran out of available platform balance partway through the batch).
      // Release the claim so the next run retries it once more funds exist.
      await releaseCleanerPayout(tenantId, claim.payoutId).catch(() => {})
      skipped.push({ bookingId: booking.id, teamMemberName: tm.name, reason: err instanceof Error ? err.message : 'unknown error' })
    }
  }

  return NextResponse.json({
    financialAccountId: financialAccount.id,
    toppedUpCents: funding.toppedUpCents,
    totalOwedCents,
    paid,
    skipped,
  })
}
