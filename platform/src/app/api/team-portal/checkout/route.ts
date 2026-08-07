import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/token'
import { parseTimestamp } from '@/lib/dates'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { computeCheckoutPricing } from '@/lib/checkout-pricing'
import { smsAdmins } from '@/lib/admin-contacts'
import { processPayment } from '@/lib/payment-processor'
import { cleanerAlreadyPaid, claimCleanerPayout, finalizeCleanerPayout, releaseCleanerPayout } from '@/lib/finance/cleaner-payout'
import { claimGlobalPayout, finalizeGlobalPayout, getStorageFinancialAccount, ensureFinancialAccountFunded, createOutboundPayment } from '@/lib/finance/global-payouts'
import { postPayoutToLedger } from '@/lib/finance/post-labor'
import { decryptSecret } from '@/lib/secret-crypto'
import { sendPushToClient } from '@/lib/push'
import { bumpSalesPartnerTotalOrFlag } from '@/lib/sales-partner-ledger'
import { escapeHtml } from '@/lib/escape-html'
import { notify } from '@/lib/nycmaid/notify'
import { applyPropertyToBookingClient } from '@/lib/client-properties'
import { autoPostJobCompletion } from '@/lib/social'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id, lat, lng, payment_method } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  // tenantDb auto-scopes every query to auth.tid (the tenant HMAC-bound in the
  // portal token). SELECT/UPDATE/INSERT are tenant-filtered/stamped automatically.
  const db = tenantDb(auth.tid)

  // Get booking with check-in time + the fields needed to compute the bill.
  const { data: booking } = await db
    .from('bookings')
    .select('id, check_in_time, check_out_time, hourly_rate, pay_rate, team_size, max_hours, price, discount_percent, one_time_credit_cents, service_type_id, recurring_type, team_member_id, referrer_id, sales_partner_id, client_id, clients(name, address, sales_partner_id), client_properties(address, latitude, longitude), team_members!bookings_team_member_id_fkey(name, pay_rate, stripe_account_id, global_payouts_recipient_id)')
    .eq('id', booking_id)
    .single()

  if (!booking || booking.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  applyPropertyToBookingClient(booking as never)

  // Resolve the service's pricing model. ONLY hourly services recompute the
  // client price from elapsed time; flat/per-unit keep the price fixed at
  // booking/quote time. (NYC Maid = all hourly → path below is unchanged.)
  let pricingModel = 'hourly'
  let servicePriceCents: number | null = null
  let minChargeCents: number | null = null
  if (booking.service_type_id) {
    const { data: st } = await db
      .from('service_types')
      .select('pricing_model, price_cents, min_charge_cents')
      .eq('id', booking.service_type_id as string)
      .single()
    if (st) {
      pricingModel = (st.pricing_model as string) || 'hourly'
      servicePriceCents = (st.price_cents as number | null) ?? null
      minChargeCents = (st.min_charge_cents as number | null) ?? null
    }
  }

  // Compute the bill at checkout (the 30-min alert + Stripe webhook rely on these
  // persisted values). Client billed hours round up past 10 min; cleaner paid
  // hours past 15 min (billing-hours grace windows). Honor a client max_hours cap.
  const checkOutTime = new Date()
  let actualHours: number | null = null
  let teamMemberPayCents: number | null = null
  let updatedPriceCents: number | null = (booking.price as number) ?? null
  let hoursWorked = 0

  const checkInParsed = booking.check_in_time ? parseTimestamp(booking.check_in_time as string) : null
  if (checkInParsed) {
    hoursWorked = Math.max(0, (checkOutTime.getTime() - checkInParsed.getTime()) / 60000) / 60
    const member = booking.team_members as unknown as { pay_rate?: number | null } | null
    // Booking-level pay_rate is an admin override and must win over the team
    // member's own default rate (nycmaid 2428c8c4 precedence parity).
    const baseCleanerRate = (booking.pay_rate as number | null) || member?.pay_rate || 25
    // $35 NJ / Long Island / Westchester floor by JOB location — NYC Maid tenant ONLY
    // (parity port is tenant-scoped, not global).
    const cleanerRate = isNycMaid(auth.tid)
      ? effectiveCleanerRate(baseCleanerRate, (booking.clients as unknown as { address?: string | null } | null)?.address ?? null)
      : baseCleanerRate

    // Canonical checkout math (client 10-min / cleaner 15-min grace, team
    // minimum, max_hours cap, discount_percent-vs-recurringType resolution) —
    // same function BookingsAdmin.tsx's Check Out flows use. This route used
    // to hand-roll its own copy that had drifted from it (this file's own git
    // history: missing team-minimum floor, then a discount double-application
    // bug independently re-introduced here even after checkout-pricing.ts was
    // fixed) — consolidating stops the two from silently diverging again.
    const pricing = computeCheckoutPricing({
      checkInIso: booking.check_in_time as string,
      checkOutIso: checkOutTime.toISOString(),
      hourlyRate: booking.hourly_rate as number | null,
      cleanerHourlyRate: cleanerRate,
      discountPercent: booking.discount_percent as number | null,
      oneTimeCreditCents: booking.one_time_credit_cents as number | null,
      recurringType: booking.recurring_type as string | null,
      maxHours: booking.max_hours as number | null,
      teamSize: booking.team_size as number | null,
    })
    // actual_hours (stored below) stays the true elapsed/capped time for
    // reporting — the team minimum only feeds the price/pay math, same split
    // BookingsAdmin.tsx's admin check-out uses (actualHours vs billableHours).
    actualHours = pricing.actualHours
    teamMemberPayCents = pricing.cleanerPayCents
    if (pricingModel === 'hourly') {
      // Time-and-materials: actual hours × rate × crew (NYC Maid path, unchanged).
      updatedPriceCents = pricing.priceCents
    } else {
      // Flat / per-unit: price was fixed at booking/quote time — elapsed hours
      // must NOT rewrite it. Fall back to the service's configured price.
      updatedPriceCents = (booking.price as number) ?? servicePriceCents ?? updatedPriceCents
    }
    // Minimum-charge floor (no-op for hourly cleaning where min_charge is unset).
    if (minChargeCents && updatedPriceCents != null && updatedPriceCents < minChargeCents) {
      updatedPriceCents = minChargeCents
    }
  }

  const { data, error } = await db
    .from('bookings')
    .update({
      check_out_time: checkOutTime.toISOString(),
      check_out_lat: lat || null,
      check_out_lng: lng || null,
      status: 'completed',
      actual_hours: actualHours,
      team_member_pay: teamMemberPayCents,
      price: updatedPriceCents,
    })
    .eq('id', booking_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Referral commission — if this booking came through an affiliate referrer,
  // ledger their cut on completion. Idempotent via UNIQUE(booking_id); a no-op
  // when there's no referrer. (Referrer-notification email not ported — flagged.)
  if (booking.referrer_id && updatedPriceCents && updatedPriceCents > 0) {
    const { data: ref } = await db
      .from('referrers')
      .select('id, commission_rate, total_earned, email, name')
      .eq('id', booking.referrer_id as string)
      .single()
    if (ref) {
      const rate = Number(ref.commission_rate) || 0.10
      const commissionCents = Math.round(updatedPriceCents * rate)
      const clientName = (booking.clients as unknown as { name?: string } | null)?.name || null
      const { error: commErr } = await db.from('referral_commissions').insert({
        booking_id: booking.id,
        referrer_id: ref.id,
        client_name: clientName,
        gross_amount_cents: updatedPriceCents,
        commission_rate: rate,
        commission_cents: commissionCents,
        status: 'pending',
      })
      // commErr is expected (and ignored) when a commission already exists for
      // this booking — the UNIQUE(booking_id) constraint makes re-checkout safe.
      if (!commErr) {
        // Atomic increment (migrations/2026_07_13_referrer_ledger_atomic.sql) —
        // two concurrent checkouts crediting the same referrer must not race on
        // a stale total_earned snapshot.
        await supabaseAdmin.rpc('increment_referrer_earned', {
          p_tenant_id: auth.tid,
          p_referrer_id: ref.id,
          p_amount_cents: commissionCents,
        }).then(() => {}, () => {})
        await db.from('notifications').insert({
          type: 'referral_converted',
          title: 'Referral commission',
          message: `Referrer earned $${(commissionCents / 100).toFixed(2)} on ${clientName || 'a'} booking`,
          recipient_type: 'admin',
        }).then(() => {}, () => {})
        // NYC Maid parity: notify the referrer by email that they earned a credit.
        if (isNycMaid(auth.tid) && (ref as { email?: string | null }).email) {
          const { sendEmail } = await import('@/lib/nycmaid/email')
          await sendEmail(
            (ref as { email: string }).email,
            'You earned a referral commission',
            `<p>Hi ${(ref as { name?: string | null }).name || 'there'}, you just earned $${(commissionCents / 100).toFixed(2)} from ${clientName || 'a'} booking. Thank you for spreading the word!</p>`,
          ).catch(() => {})
        }
      }
    }
  }

  // Sales partner commission — two independent, stackable payouts on the same
  // booking: 'direct' when the client booked on the partner's own referral
  // link (booking.sales_partner_id, set at booking creation — see
  // /api/client/book), 'override' when the booking's referrer was recruited
  // by a partner (referrers.recruited_by_sales_partner_id). Mutually
  // exclusive in practice (a booking has either its own sales_partner_id or
  // a referrer_id, not both), checked independently to match nycmaid's rule.
  // Idempotent via UNIQUE(booking_id, sales_partner_id).
  if (updatedPriceCents && updatedPriceCents > 0) {
    const clientName = (booking.clients as unknown as { name?: string } | null)?.name || null
    const grossAmount = updatedPriceCents

    const createPartnerCommission = async (
      salesPartnerId: string,
      source: 'direct' | 'override',
      referrerId: string | null,
    ) => {
      const { data: partner } = await supabaseAdmin
        .from('sales_partners')
        .select('id, commission_rate, email, name')
        .eq('id', salesPartnerId)
        .eq('tenant_id', auth.tid)
        .eq('active', true)
        .maybeSingle()
      if (!partner) return

      const rate = Number(partner.commission_rate) || 0.10
      const commissionCents = Math.round(grossAmount * rate)

      const { error: commErr } = await supabaseAdmin.from('sales_partner_commissions').insert({
        tenant_id: auth.tid,
        booking_id: booking.id,
        sales_partner_id: partner.id,
        source,
        referrer_id: referrerId,
        client_name: clientName,
        gross_amount_cents: grossAmount,
        commission_rate: rate,
        commission_cents: commissionCents,
        status: 'pending',
      })
      // commErr expected (and ignored) when a commission already exists for
      // this (booking, partner) pair — UNIQUE(booking_id, sales_partner_id)
      // makes re-checkout safe.
      if (commErr) return

      bumpSalesPartnerTotalOrFlag(auth.tid, partner.id, 'total_earned', commissionCents, {
        relatedType: 'booking',
        relatedId: booking.id as string,
        partnerName: (partner as { name?: string | null }).name,
      }).catch((err) => console.error('[team-portal-checkout] sales partner ledger flag failed:', err))
      await supabaseAdmin.from('notifications').insert({
        tenant_id: auth.tid,
        type: 'sales_partner_commission',
        title: 'Sales partner commission',
        message: `${(partner as { name?: string | null }).name || 'Partner'} earned $${(commissionCents / 100).toFixed(2)} (${source}) on ${clientName || 'a'} booking`,
        recipient_type: 'admin',
      }).then(() => {}, () => {})
      if (isNycMaid(auth.tid) && (partner as { email?: string | null }).email) {
        const { sendEmail } = await import('@/lib/nycmaid/email')
        await sendEmail(
          (partner as { email: string }).email,
          'You earned a sales partner commission',
          `<p>Hi ${(partner as { name?: string | null }).name || 'there'}, you just earned $${(commissionCents / 100).toFixed(2)} from ${escapeHtml(clientName) || 'a'} booking. Thank you for spreading the word!</p>`,
        ).catch(() => {})
      }
    }

    // booking.sales_partner_id (set at self-book time via /api/client/book)
    // takes precedence; clients.sales_partner_id (set via the admin "Sales
    // Person" dropdown on client creation) is the sticky fallback so an
    // admin-created booking for an already-attributed client still commissions.
    const directPartnerId = (booking.sales_partner_id as string | null)
      || ((booking.clients as unknown as { sales_partner_id?: string | null } | null)?.sales_partner_id ?? null)
    if (directPartnerId) {
      await createPartnerCommission(directPartnerId, 'direct', null)
    } else if (booking.referrer_id) {
      const { data: referrerRow } = await supabaseAdmin
        .from('referrers')
        .select('id, recruited_by_sales_partner_id')
        .eq('id', booking.referrer_id as string)
        .eq('tenant_id', auth.tid)
        .maybeSingle()
      if (referrerRow?.recruited_by_sales_partner_id) {
        await createPartnerCommission(referrerRow.recruited_by_sales_partner_id as string, 'override', referrerRow.id as string)
      }
    }
  }

  // ── NYC Maid parity (tenant-scoped): cleaner-reported payment → shared
  // payment pipeline, client "complete" push, and a loud UNPAID-checkout alert
  // when the cleaner leaves without payment collected.
  // NYC Maid-only for now — other tenants need their own per-tenant settings
  // (Stripe link, Google review link, etc.) before this can go global. ──
  if (isNycMaid(auth.tid)) {
    const ALLOWED_METHODS = new Set(['credit_card', 'cashapp', 'apple_pay', 'cash'])
    const reportedMethod = typeof payment_method === 'string' && ALLOWED_METHODS.has(payment_method)
      ? payment_method
      : null
    const clientName = (booking.clients as unknown as { name?: string } | null)?.name || 'a client'

    // Shared booking-keyed idempotency guard: a repeat checkout for an
    // already-paid booking must not run the payment pipeline again (which would
    // double-pay the cleaner via Stripe Connect).
    if (reportedMethod && updatedPriceCents && !(await cleanerAlreadyPaid(auth.tid, data.id))) {
      // Shared pipeline: marks paid, inserts payment row, transfers the cleaner
      // via Stripe Connect, and notifies client/cleaner/admin — same path as the
      // Stripe webhook. Non-blocking.
      processPayment({
        tenant: { id: auth.tid },
        bookingId: data.id,
        clientId: data.client_id,
        method: reportedMethod as never,
        amountCents: updatedPriceCents,
        referenceId: `cleaner-checkout-${data.id}`,
      }).catch((err) => console.error('processPayment from check-out failed:', err))
    }

    // Direct cleaner payout at checkout — pays the cleaner's earned wage via
    // Stripe Connect the moment they check out, independent of whether the
    // client has paid yet (per Jeff's explicit instruction 2026-08-07: checkout
    // pays the cleaner, full stop). The client's own payment via the 30-min
    // alert's pay link is a separate event handled by the Stripe webhook —
    // idempotent via the same claim table, so paying here never double-pays
    // the cleaner if the client also pays the link before or after this.
    const payoutTeamMember = booking.team_members as unknown as { stripe_account_id?: string | null; global_payouts_recipient_id?: string | null } | null
    if (
      booking.team_member_id &&
      teamMemberPayCents &&
      teamMemberPayCents > 0 &&
      (payoutTeamMember?.global_payouts_recipient_id || payoutTeamMember?.stripe_account_id) &&
      !(await cleanerAlreadyPaid(auth.tid, data.id))
    ) {
      const { data: tenantRow } = await supabaseAdmin
        .from('tenants')
        .select('stripe_api_key')
        .eq('id', auth.tid)
        .single()
      const stripeKey = tenantRow?.stripe_api_key ? decryptSecret(tenantRow.stripe_api_key as string) : process.env.STRIPE_SECRET_KEY

      // Prefer the Global Payouts (v2 Money Management) rail — that's the
      // active recipient system real recipients are actually onboarded onto
      // (team_members.stripe_account_id is the OLDER v1 Connect column and is
      // null for every recipient created through the current onboarding flow).
      if (payoutTeamMember?.global_payouts_recipient_id && stripeKey) {
        const claim = await claimGlobalPayout({
          tenantId: auth.tid,
          bookingId: data.id as string,
          teamMemberId: booking.team_member_id as string,
          amountCents: teamMemberPayCents,
        })
        if (claim.claimed && claim.payoutId) {
          try {
            const stripe = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
            const financialAccount = await getStorageFinancialAccount(stripeKey)
            if (!financialAccount) throw new Error('No Global Payouts Financial Account configured')
            await ensureFinancialAccountFunded(
              stripe, stripeKey, financialAccount.id, teamMemberPayCents,
              `checkout-topup:${data.id}`,
            )
            const outbound = await createOutboundPayment(stripeKey, {
              financialAccountId: financialAccount.id,
              recipientId: payoutTeamMember.global_payouts_recipient_id,
              amountCents: teamMemberPayCents,
              description: `Checkout payout for booking ${data.id}`,
              idempotencyKey: `checkout-gp-payout:${data.id}`,
            })
            await finalizeGlobalPayout({
              tenantId: auth.tid,
              payoutId: claim.payoutId,
              amountCents: teamMemberPayCents,
              tipCents: 0,
              stripeOutboundPaymentId: outbound.id,
            })
            postPayoutToLedger({ tenantId: auth.tid, payoutId: claim.payoutId })
              .catch((err) => console.error('checkout payout ledger post failed:', err))
            await tenantDb(auth.tid)
              .from('bookings')
              .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
              .eq('id', data.id)
              .then(() => {}, () => {})
          } catch (payErr) {
            await releaseCleanerPayout(auth.tid, claim.payoutId).catch(() => {})
            console.error('checkout Global Payouts payout failed:', payErr)
            smsAdmins(auth.tid, `Cleaner payout FAILED at checkout for booking ${data.id} — pay manually.`).catch(() => {})
          }
        }
      } else if (payoutTeamMember?.stripe_account_id && stripeKey) {
        const claim = await claimCleanerPayout({
          tenantId: auth.tid,
          bookingId: data.id as string,
          teamMemberId: booking.team_member_id as string,
          amountCents: teamMemberPayCents,
        })
        if (claim.claimed && claim.payoutId) {
          try {
            const stripe = new Stripe(stripeKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

            const transfer = await stripe.transfers.create({
              amount: teamMemberPayCents,
              currency: 'usd',
              destination: payoutTeamMember.stripe_account_id,
              description: `Checkout payout for booking ${data.id}`,
              metadata: { booking_id: data.id as string, tenant_id: auth.tid },
            }, { idempotencyKey: `checkout-payout:${data.id}` })

            let instantPayoutId: string | null = null
            let isInstant = false
            try {
              const payout = await stripe.payouts.create(
                { amount: teamMemberPayCents, currency: 'usd', method: 'instant' },
                { stripeAccount: payoutTeamMember.stripe_account_id, idempotencyKey: `checkout-instant-payout:${data.id}` },
              )
              instantPayoutId = payout.id
              isInstant = true
            } catch {
              // standard schedule fallback — Stripe will pay on default cadence
            }

            await finalizeCleanerPayout({
              tenantId: auth.tid,
              payoutId: claim.payoutId,
              amountCents: teamMemberPayCents,
              tipCents: 0,
              stripeTransferId: transfer.id,
              stripePayoutId: instantPayoutId,
              instant: isInstant,
            })
            postPayoutToLedger({ tenantId: auth.tid, payoutId: claim.payoutId })
              .catch((err) => console.error('checkout payout ledger post failed:', err))

            await tenantDb(auth.tid)
              .from('bookings')
              .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString() })
              .eq('id', data.id)
              .then(() => {}, () => {})
          } catch (transferErr) {
            await releaseCleanerPayout(auth.tid, claim.payoutId).catch(() => {})
            console.error('checkout cleaner payout failed:', transferErr)
            smsAdmins(auth.tid, `Cleaner payout FAILED at checkout for booking ${data.id} — pay manually.`).catch(() => {})
          }
        }
      }
    }

    if (data.client_id) {
      sendPushToClient(data.client_id, 'Cleaning complete!', 'Your cleaning is finished — thank you!', '/book/dashboard').catch(() => {})
    }

    // Checked out without payment confirmed → loud admin warning immediately.
    if (!reportedMethod && data.payment_status !== 'paid') {
      const clientTotal = updatedPriceCents != null ? (updatedPriceCents / 100).toFixed(0) : '—'
      smsAdmins(auth.tid,`UNPAID CHECKOUT: ${clientName} just checked out ($${clientTotal}) — payment NOT collected. Follow up NOW.`).catch(() => {})
    }

    // GPS distance flag on checkout — flag (don't block) a check-out far from the address.
    if (typeof lat === 'number' && typeof lng === 'number') {
      const addr = (booking.clients as unknown as { address?: string | null } | null)?.address
      if (addr) {
        const { geocodeAddress, calculateDistance, MAX_DISTANCE_MILES } = await import('@/lib/nycmaid/geo')
        const coords = await geocodeAddress(addr).catch(() => null)
        if (coords) {
          const dist = calculateDistance(lat, lng, coords.lat, coords.lng)
          if (dist > MAX_DISTANCE_MILES) {
            await db
              .from('bookings')
              .update({ notes: ((data as { notes?: string | null }).notes || '') + `\n\n[GPS check-out flagged: ${dist.toFixed(2)} mi from address]` })
              .eq('id', data.id)
              .then(() => {}, () => {})
            smsAdmins(auth.tid,`GPS MISMATCH on checkout: ${clientName} — ${dist.toFixed(2)} mi from the job address.`).catch(() => {})
          }
        }
      }
    }
  }

  // Owner Telegram/dashboard alert — global for every tenant, same as the
  // check-in ping. notify() only reaches Telegram if this tenant has its own
  // bot configured, and push is scoped to this tenant's admins.
  {
    const clientName = (booking.clients as unknown as { name?: string } | null)?.name || 'a client'
    const cleanerName = (booking.team_members as unknown as { name?: string | null } | null)?.name || 'Cleaner'
    const clientTotal = updatedPriceCents != null ? (updatedPriceCents / 100).toFixed(0) : '—'
    const cleanerPayAmount = teamMemberPayCents != null ? (teamMemberPayCents / 100).toFixed(2) : '0'
    let checkoutDistanceInfo = ''
    let checkoutFlagged = false
    if (typeof lat === 'number' && typeof lng === 'number') {
      const addr = (booking.clients as unknown as { address?: string | null } | null)?.address
      if (addr) {
        const { geocodeAddress, calculateDistance, MAX_DISTANCE_MILES } = await import('@/lib/nycmaid/geo')
        const coords = await geocodeAddress(addr).catch(() => null)
        if (coords) {
          const dist = calculateDistance(lat, lng, coords.lat, coords.lng)
          checkoutFlagged = dist > MAX_DISTANCE_MILES
          checkoutDistanceInfo = ` • ${dist.toFixed(2)} mi from address${checkoutFlagged ? ' ⚠️' : ''}`
        }
      }
    }
    notify({
      type: 'job_complete',
      title: checkoutFlagged ? `Job Done (GPS Mismatch): ${clientName}` : `Job Done: ${clientName}`,
      message: `${actualHours ?? '?'}hrs by ${cleanerName} • Collect $${clientTotal} → Pay ${cleanerName} $${cleanerPayAmount}${checkoutDistanceInfo}`,
      booking_id: data.id,
      tenantId: auth.tid,
    }).catch((err) => console.error('checkout notify error:', err))
  }

  // Opt-in per tenant (Settings → Social). No-ops silently when disabled, no
  // platform connected, or no after/progress photo exists for this booking yet.
  autoPostJobCompletion(auth.tid, data.id as string).catch((err) =>
    console.error('checkout auto-post error:', err))

  return NextResponse.json({
    booking: data,
    hours_worked: Math.round(hoursWorked * 100) / 100,
    billed_hours: actualHours,
    client_total: updatedPriceCents != null ? Math.round(updatedPriceCents) / 100 : null,
    earnings: teamMemberPayCents != null ? Math.round(teamMemberPayCents) / 100 : 0,
    gps: { lat, lng },
  })
})
