/**
 * Payment processor — tenant-aware port of nycmaid's payment-processor.ts.
 *
 * Canonical path for non-Stripe (Zelle / Venmo / admin-confirmed) payments:
 *   1. Compute expected balance from booking (actual_hours or check-in elapsed)
 *   2. Sum prior payments → decide partial vs paid (95% threshold)
 *   3. Insert payments row
 *   4. If partial: mark booking partial + open admin_tasks + notify — return early
 *   5. If paid: mark paid, auto-payout team member via Stripe Connect if possible
 *   6. SMS team member (bilingual, finish-up message), SMS client (confirmation),
 *      SMS admins via admin-contacts.
 *
 * Multi-tenant: every DB read/write scopes by tenant_id. Stripe key comes from
 * tenant.stripe_api_key first, falls back to env.
 */
import Stripe from 'stripe'
import { supabaseAdmin } from './supabase'
import { sendSMS } from './sms'
import { smsAdmins } from './admin-contacts'
import { notify } from './notify'
import { decryptSecret } from './secret-crypto'
import { postPaymentRevenue } from './finance/post-revenue'
import { postPayoutToLedger } from './finance/post-labor'
import { cleanerAlreadyPaid, claimCleanerPayout, finalizeCleanerPayout, releaseCleanerPayout } from './finance/cleaner-payout'
import { effectiveCleanerRate } from './cleaner-pay'
import { applyDiscount, applyCredit } from './discount'
import { isNycMaid } from './nycmaid/tenant'
import { parseTimestamp } from './dates'
import type { Tenant } from './tenant'

type TenantPaymentFields = Pick<
  Tenant,
  'id' | 'name' | 'stripe_api_key' | 'telnyx_api_key' | 'telnyx_phone'
>

export interface ProcessPaymentInput {
  tenant: TenantPaymentFields | { id: string }
  bookingId: string
  clientId: string                     // ignored — derived from the tenant-verified booking row instead (see processPayment)
  method: string                       // 'zelle' | 'venmo' | 'cashapp' | 'cash' | 'manual' | ...
  amountCents: number
  referenceId: string
  senderName?: string | null
}

export interface ProcessPaymentResult {
  status: 'paid' | 'partial'
  totalReceivedCents: number
  expectedCents: number
  tipCents: number
  cleanerPaidCents: number
}

const PARTIAL_THRESHOLD = 0.95

function getStripe(apiKey: string | null | undefined): Stripe {
  // Per-tenant keys are stored encrypted; decryptSecret() passes plaintext through.
  const key = apiKey ? decryptSecret(apiKey) : process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe not configured')
  return new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

async function hydrateTenant(input: TenantPaymentFields | { id: string }): Promise<TenantPaymentFields | null> {
  const anyT = input as Record<string, unknown>
  if (anyT.stripe_api_key !== undefined && anyT.telnyx_api_key !== undefined) {
    return input as TenantPaymentFields
  }
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name, stripe_api_key, telnyx_api_key, telnyx_phone')
    .eq('id', (input as { id: string }).id)
    .single()
  return data
}

export async function processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult | null> {
  const tenant = await hydrateTenant(input.tenant)
  if (!tenant) return null
  const tenantId = tenant.id

  const { bookingId, method, amountCents, referenceId } = input
  const label = method.charAt(0).toUpperCase() + method.slice(1)

  // Tenant-scoped booking lookup with joined relations
  const { data: booking } = await supabaseAdmin
    .from('bookings')  // tenant-scope-ok: row-scoped by globally-unique bookingId
    .select(`
      id,
      team_member_id,
      client_id,
      team_member_pay,
      actual_hours,
      hourly_rate,
      pay_rate,
      price,
      discount_percent,
      one_time_credit_cents,
      check_in_time,
      start_time,
      clients:clients(name, phone, address),
      team_members:team_members!bookings_team_member_id_fkey(name, phone, sms_consent, stripe_account_id, hourly_rate, pay_rate, preferred_language)
    `)
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()

  if (!booking) return null

  // clientId comes from the tenant-verified booking row, never from the
  // caller — input.clientId is ignored so an internal-key-gated caller (e.g.
  // admin/payments/finalize-match, whose key is global across all tenants)
  // can't attribute this payment to an unowned/cross-tenant client id.
  const clientId = booking.client_id as string

  const clientJoin = booking.clients as unknown as { name: string; phone?: string; address?: string | null } | null
  const teamMember = booking.team_members as unknown as {
    name: string
    phone: string | null
    sms_consent: boolean | null
    stripe_account_id: string | null
    hourly_rate: number | null
    pay_rate: number | null
    preferred_language: string | null
  } | null

  const clientName = clientJoin?.name || 'Client'

  // Expected balance in cents — mirror nycmaid logic:
  //   actual_hours × hourly_rate  OR  (now - check_in) rounded up to .5h buffer
  const clientRate = (booking.hourly_rate as number | null) || 69
  let expectedCents = 0
  // Bill ACTUAL hours worked first (matches standalone nycmaid). Only fall back
  // to the booked estimate (price) when actual isn't known yet, then to
  // check-in-elapsed. Previously `price` won first → long jobs billed the
  // estimate (under-billed overruns). parseTimestamp: check_in_time is naive.
  //
  // The admin-set discount_percent + one_time_credit_cents apply on the two
  // recompute-from-raw-rate branches below, same as every other collection
  // point (team-portal/checkout, Stripe webhook, 15min-alert) -- without this,
  // an admin discount/credit set on the booking got silently dropped the
  // moment actual_hours was recorded or a check-in-elapsed estimate was used,
  // even though it's still sitting on the row (nycmaid 6ec48424 parity). The
  // `price` branch is left untouched -- it already reflects whatever discount
  // was baked in at creation (including the separate automatic recurring-type
  // discount, see recurring-discount.ts), and re-applying discount_percent on
  // top of it here would double-discount.
  if (booking.actual_hours) {
    const rawCents = Math.round((booking.actual_hours as number) * clientRate * 100)
    expectedCents = applyCredit(applyDiscount(rawCents, booking.discount_percent as number | null), booking.one_time_credit_cents as number | null)
  } else if (booking.price && booking.price > 0) {
    expectedCents = booking.price as number
  } else if (booking.check_in_time) {
    const checkIn = parseTimestamp(booking.check_in_time as string) || new Date(booking.check_in_time as string)
    const rawMinutes = Math.max(0, (Date.now() - checkIn.getTime()) / (1000 * 60))
    // Round up to next 30 min with a 30 min buffer (nycmaid rule)
    const estHours = Math.max(0.5, Math.ceil((rawMinutes + 30) / 30) * 0.5)
    const rawCents = Math.round(estHours * clientRate * 100)
    expectedCents = applyCredit(applyDiscount(rawCents, booking.discount_percent as number | null), booking.one_time_credit_cents as number | null)
  }

  // Sum prior payments for this booking (tenant-scoped)
  const { data: priorPayments } = await supabaseAdmin
    .from('payments')
    .select('amount_cents')
    .eq('booking_id', bookingId)
    .eq('tenant_id', tenantId)
  const priorCents = (priorPayments || []).reduce((s, p) => s + ((p.amount_cents as number) || 0), 0)
  const totalReceivedCents = priorCents + amountCents

  const isPartial = expectedCents > 0 && totalReceivedCents < expectedCents * PARTIAL_THRESHOLD
  const tipCents = !isPartial && expectedCents > 0 ? Math.max(0, totalReceivedCents - expectedCents) : 0
  const tipAmount = (tipCents / 100).toFixed(2)

  // Record payment (tenant-scoped). Capture the id so revenue can post to the
  // ledger immediately (idempotent; safe for both partial and full).
  const { data: paymentRow, error: paymentInsertErr } = await supabaseAdmin
    .from('payments')
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      client_id: clientId,
      amount_cents: amountCents,
      tip_cents: isPartial ? 0 : tipCents,
      method,
      status: isPartial ? 'partial' : 'completed',
      payment_sender_name: input.senderName || null,
      reference_id: referenceId,
    })
    .select('id')
    .single()

  // Duplicate (tenant_id, booking_id, reference_id) -- a retried/redelivered
  // call with the same reference_id (double-tapped checkout button, a client
  // retry after a timeout, a redelivered finalize-match reconciliation
  // request). The original call already posted revenue/payout/SMS; treat this
  // one as an idempotent no-op instead of double-posting to the ledger and
  // re-transferring funds. See migration 065_unique_payments_reference.sql.
  if (paymentInsertErr?.code === '23505') {
    console.warn(`[payment-processor] duplicate ${label} delivery ignored (booking ${bookingId}, ref ${referenceId})`)
    // Base the reported status on priorCents alone (the true recorded total)
    // rather than isPartial/totalReceivedCents above, which double-count this
    // duplicate call's amountCents on top of the already-recorded payment.
    const dedupIsPartial = expectedCents > 0 && priorCents < expectedCents * PARTIAL_THRESHOLD
    return { status: dedupIsPartial ? 'partial' : 'paid', totalReceivedCents: priorCents, expectedCents, tipCents: 0, cleanerPaidCents: 0 }
  }
  if (paymentInsertErr) console.error(`[payment-processor] ${label} insert failed:`, paymentInsertErr)
  if (paymentRow?.id) {
    postPaymentRevenue({ tenantId, paymentId: paymentRow.id })
      .catch(err => console.error('[payment-processor] revenue post failed:', err))
  }

  if (isPartial) {
    const shortfallCents = expectedCents - totalReceivedCents
    const shortfall = (shortfallCents / 100).toFixed(0)
    const totalReceived = (totalReceivedCents / 100).toFixed(0)
    const totalExpected = (expectedCents / 100).toFixed(0)

    await supabaseAdmin
      .from('bookings')
      .update({ payment_status: 'partial', partial_payment_cents: totalReceivedCents })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)

    await supabaseAdmin
      .from('admin_tasks')
      .insert({
        tenant_id: tenantId,
        type: 'payment_partial',
        priority: 'high',
        title: `Partial ${label} from ${clientName}: $${totalReceived}/$${totalExpected}`,
        description: `Client still owes $${shortfall}. Team member NOT paid yet. Contact client manually.`,
        related_type: 'booking',
        related_id: bookingId,
      })
      .then(() => {}, () => {})

    notify({
      tenantId,
      type: 'payment_due',
      title: `Partial payment — ${clientName} owes $${shortfall}`,
      message: `${clientName} sent $${totalReceived} of $${totalExpected} via ${label}. Team member NOT paid yet. Admin contact required.`,
      bookingId,
    }).catch(() => {})

    return { status: 'partial', totalReceivedCents, expectedCents, tipCents: 0, cleanerPaidCents: 0 }
  }

  // Full payment — mark booking paid
  await supabaseAdmin
    .from('bookings')
    .update({ payment_status: 'paid', payment_method: method, payment_date: new Date().toISOString(), tip_amount: tipCents })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)

  // Team member auto-pay via Stripe Connect. Guarded by the shared booking-keyed
  // idempotency check so a repeat call (or a Stripe-webhook payout for the same
  // booking) never double-pays the cleaner.
  let cleanerPaidCents = 0
  if (teamMember?.stripe_account_id && booking.team_member_id && !(await cleanerAlreadyPaid(tenantId, bookingId))) {
    try {
      let payAmountCents: number | null = (booking.team_member_pay as number | null) || null
      if (!payAmountCents) {
        // Booking-level pay_rate is an admin override and must win over the team
        // member's own default rate, not lose to it (see cleaner-pay-rate-override
        // port from nycmaid 2428c8c4 — same precedence bug, same 5 call sites).
        let rate = (booking.pay_rate as number | null) || teamMember.pay_rate || teamMember.hourly_rate || 25
        // $35 NJ / Long Island / Westchester floor by JOB location — NYC Maid tenant ONLY
        // (parity with team-portal/checkout + stripe webhook payout paths).
        if (isNycMaid(tenantId)) rate = effectiveCleanerRate(rate, clientJoin?.address ?? null)
        if (booking.actual_hours) {
          payAmountCents = Math.round((booking.actual_hours as number) * rate * 100)
        } else if (booking.check_in_time) {
          const checkIn = parseTimestamp(booking.check_in_time as string) || new Date(booking.check_in_time as string)
          const rawMinutes = Math.max(0, (Date.now() - checkIn.getTime()) / (1000 * 60))
          const estHours = Math.max(0.5, Math.round(rawMinutes / 30) * 0.5)
          payAmountCents = Math.round(estHours * rate * 100)
        }
      }

      if (tipCents > 0 && payAmountCents) payAmountCents += tipCents

      if (payAmountCents && payAmountCents > 0) {
        // CLAIM the single payout slot BEFORE moving money. A conflict on the
        // UNIQUE(tenant_id, booking_id) index means another path already claimed
        // this booking's payout → do not transfer. Closes the concurrency window.
        const claim = await claimCleanerPayout({
          tenantId,
          bookingId,
          teamMemberId: booking.team_member_id as string,
          amountCents: payAmountCents - tipCents,
          tipCents,
        })
        if (claim.claimed && claim.payoutId) {
          try {
            const stripe = getStripe(tenant.stripe_api_key)
            // Defense in depth on top of the DB-level claim above: an explicit
            // Stripe-side idempotency key (mirrors webhooks/stripe/route.ts's
            // cleaner payout) means a retried call with the same
            // bookingId+referenceId can't double-transfer to the cleaner even
            // if something replays this path after a crash/retry.
            const transfer = await stripe.transfers.create({
              amount: payAmountCents,
              currency: 'usd',
              destination: teamMember.stripe_account_id,
              description: `${label} payment for ${clientName} service${tipCents > 0 ? ` (includes $${tipAmount} tip)` : ''}`,
              metadata: { booking_id: bookingId, tenant_id: tenantId },
            }, {
              idempotencyKey: `cleaner-payout:${bookingId}:${referenceId}`,
            })

            let payoutId: string | null = null
            let isInstant = false
            try {
              const payout = await stripe.payouts.create(
                { amount: payAmountCents, currency: 'usd', method: 'instant' },
                { stripeAccount: teamMember.stripe_account_id, idempotencyKey: `cleaner-instant-payout:${bookingId}:${referenceId}` },
              )
              payoutId = payout.id
              isInstant = true
            } catch {
              // standard schedule fallback — Stripe will pay on default cadence
            }

            cleanerPaidCents = payAmountCents

            await finalizeCleanerPayout({
              tenantId,
              payoutId: claim.payoutId,
              amountCents: payAmountCents - tipCents,
              tipCents,
              stripeTransferId: transfer.id,
              stripePayoutId: payoutId,
              instant: isInstant,
            })
            postPayoutToLedger({ tenantId, payoutId: claim.payoutId })
              .catch(err => console.error('[payment-processor] payout ledger post failed:', err))

            await supabaseAdmin
              .from('bookings')
              .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString(), team_member_pay: payAmountCents })
              .eq('id', bookingId)
              .eq('tenant_id', tenantId)
          } catch (transferErr) {
            // Transfer failed after we claimed the slot — release the pending claim
            // so a legitimate retry can re-pay, then surface the error.
            await releaseCleanerPayout(tenantId, claim.payoutId).catch(() => {})
            throw transferErr
          }
        }
      }
    } catch (err) {
      console.error(`[payment-processor] team member auto-pay from ${label} failed:`, err)
    }
  }

  // Team member finish-up SMS (bilingual)
  if (teamMember?.phone && teamMember.sms_consent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
    const isEs = teamMember.preferred_language === 'es'
    const tipLine = tipCents > 0
      ? (isEs
        ? `\n¡El cliente dejó $${tipAmount} de propina!`
        : `\nClient left a $${tipAmount} tip!`)
      : ''
    const cleanerSms = isEs
      ? `Pago confirmado para ${clientName}. Por favor termine y haga check-out en los próximos 30 minutos. ¡Gracias!${tipLine}`
      : `Payment confirmed for ${clientName}. Please finish up and check out within the next 30 minutes. Thank you!${tipLine}`

    sendSMS({
      to: teamMember.phone,
      body: cleanerSms,
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch(err => console.error('[payment-processor] team member SMS failed:', err))
  }

  // Client confirmation SMS
  const { data: clientRecord } = await supabaseAdmin
    .from('clients')
    .select('phone')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()
  if (clientRecord?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
    const tipThank = tipCents > 0
      ? ` Your generous tip of $${tipAmount} has been passed along — thank you!`
      : ''
    const clientSms = `Payment confirmed — $${(amountCents / 100).toFixed(0)} received via ${label}. Thank you, ${clientName}!${tipThank} 😊`
    sendSMS({
      to: clientRecord.phone as string,
      body: clientSms,
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch(err => console.error('[payment-processor] client SMS failed:', err))
  }

  // Admin notification
  const tipNote = tipCents > 0 ? ` Tip: $${tipAmount}.` : ''
  const payoutNote = cleanerPaidCents > 0
    ? ` Team member auto-paid $${(cleanerPaidCents / 100).toFixed(2)}${tipCents > 0 ? ' (includes tip)' : ''}.`
    : teamMember?.stripe_account_id ? '' : ' Team member not on Stripe — pay manually.'

  const adminMessage =
    `${label} payment CONFIRMED — ${clientName} paid $${(amountCents / 100).toFixed(2)}` +
    `${input.senderName ? ` (from ${input.senderName})` : ''}.${tipNote}${payoutNote}` +
    ` Client + team notified.`

  smsAdmins(tenant, adminMessage).catch(err => console.error('[payment-processor] admin SMS failed:', err))

  notify({
    tenantId,
    type: 'payment_received',
    title: `${label} payment — ${clientName}`,
    message: adminMessage,
    bookingId,
    metadata: {
      amount: `$${(amountCents / 100).toFixed(2)}`,
      paymentMethod: label,
      clientName,
    },
  }).catch(() => {})

  return { status: 'paid', totalReceivedCents, expectedCents, tipCents, cleanerPaidCents }
}
