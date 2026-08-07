/**
 * 30-min payment alert — ported faithfully from NYC Maid's team/30min-alert
 * (src/app/api/team/30min-alert/route.ts), tenant-adapted for FullLoop.
 *
 * Field mapping vs nycmaid:
 *   cleaners(name, hourly_rate) -> team_members(name, pay_rate)
 *   booking.cleaner_pay_rate    -> booking.pay_rate
 *   smsAdmins(msg)              -> smsAdmins(tenantId, msg)   (tenant-aware)
 *   hardcoded Stripe PAY_LINK   -> tenant.payment_link     (per-tenant)
 *
 * Intentionally NOT ported: the IMAP email-monitor trigger — retired in nycmaid
 * 2026-06-25 (client payments are Stripe-only; the webhook is the confirm path).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { requirePermission } from '@/lib/require-permission'
import { notify } from '@/lib/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { parseTimestamp, formatET } from '@/lib/dates'
import { sendClientSMS } from '@/lib/client-contacts'
import { createPaymentLink } from '@/lib/stripe'
import { clientBilledHours, cleanerPaidHours } from '@/lib/billing-hours'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { applyDiscount, describeDiscount } from '@/lib/discount'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '@/lib/nycmaid/self-book-discount'
import { logCommsFail } from '@/lib/comms-fail'

export const maxDuration = 300

// Auth: team-portal Bearer token (verifyToken, same as checkin/checkout).
// Previously this had ZERO authentication — anyone who knew/guessed a
// bookingId could trigger a real client-facing "pay now" SMS + admin alerts
// on demand (deploy-prep/none-write-routes-triage.md row 6). The team app
// already sends the token (src/app/team/page.tsx handleHeadsUp); this just
// starts checking it.
export async function POST(req: NextRequest) {
  try {
    // Auth: field-staff bearer token. This route fires real admin + client SMS
    // (with a pay link), writes the alert timestamp, and can open admin tasks —
    // it was previously UNAUTHENTICATED, so anyone who knew a bookingId (any
    // tenant) could spam payment texts and drive charges. Gate on a verified,
    // active member; scope the booking to that member's tenant + visibility.
    // Two legitimate callers: a cleaner from their own team-portal session
    // (jobs.view_own, tenant+visibility scoped below), or an admin triggering
    // it manually from the booking edit panel (bookings.edit, sees every
    // booking in their tenant already — visibility check doesn't apply).
    const portalAuth = await requirePortalPermission(req, 'jobs.view_own')
    let tenantId: string
    let isAdminCaller = false
    if (!portalAuth.error) {
      tenantId = portalAuth.auth.tid
    } else {
      const adminAuth = await requirePermission('bookings.edit')
      if (adminAuth.error) return portalAuth.error
      tenantId = adminAuth.tenant.tenantId
      isAdminCaller = true
    }

    const { bookingId, force } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const { data: booking } = (await tenantDb(tenantId)
      .from('bookings')
      .select('id, tenant_id, status, start_time, end_time, check_in_time, check_out_time, service_type, hourly_rate, pay_rate, price, notes, max_hours, team_size, team_member_id, client_id, payment_status, fifteen_min_alert_time, discount_percent, one_time_credit_cents, clients(name, phone, email, address), team_members!bookings_team_member_id_fkey(name, pay_rate)')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()) as { data: {
        id: string; tenant_id: string; status: string | null; team_member_id: string | null; start_time: string; end_time: string | null
        check_in_time: string | null; check_out_time: string | null; service_type: string | null
        hourly_rate: number | null; pay_rate: number | null; price: number | null; notes: string | null
        max_hours: number | null; team_size: number | null; client_id: string | null
        payment_status: string | null; fifteen_min_alert_time: string | null
        discount_percent: number | null; one_time_credit_cents: number | null
        clients: unknown; team_members: unknown
      } | null }

    // Cross-tenant: never confirm a foreign booking even exists.
    if (!booking || booking.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // A cancelled booking should never trigger a real payment-collection SMS
    // with a live Stripe pay link — this route previously had no status check
    // at all, so cancelling a job didn't stop the 30-min alert from still
    // demanding payment from the client.
    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: true, skipped: 'booking cancelled' })
    }

    // Ownership within the tenant: a cleaner caller must have visibility of
    // this booking's assignee (worker=self, lead=crew, manager=all) — managers
    // may also act on an as-yet-unassigned job. An admin caller already has
    // full visibility across their own tenant, so this check doesn't apply.
    if (!isAdminCaller && portalAuth.auth) {
      const auth = portalAuth.auth
      const allowed = new Set(await scopedMemberIds(auth))
      const bookingMemberIds: string[] = booking.team_member_id ? [booking.team_member_id as string] : []
      const { data: extraMembers } = await tenantDb(tenantId)
        .from('booking_team_members') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
        .select('team_member_id')
        .eq('booking_id', bookingId)
      for (const m of extraMembers || []) bookingMemberIds.push(m.team_member_id as string)
      const hasVisibility = bookingMemberIds.some((id) => allowed.has(id))
      if (!hasVisibility && !(bookingMemberIds.length === 0 && auth.role === 'manager')) {
        return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 })
      }
    }

    // Idempotency — if alert already fired in last 30 min and force not set, skip
    if (booking.fifteen_min_alert_time && !force) {
      const alertedAt = new Date(booking.fifteen_min_alert_time as string)
      const minsSince = (Date.now() - alertedAt.getTime()) / 60000
      if (minsSince < 30) {
        return NextResponse.json({
          success: true,
          alreadySent: true,
          alertedAt: booking.fifteen_min_alert_time,
          minutesAgo: Math.round(minsSince),
          message: `Alert already sent ${Math.round(minsSince)} min ago — skipping duplicate`,
        })
      }
    }

    // Already paid — no point alerting
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ success: true, skipped: 'already paid' })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone, stripe_api_key')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const now = new Date()

    // Calculate ACTUAL hours worked: check_in_time → check_out_time if set,
    // else check_in_time → now. The check_out_time fallback handles the case
    // where this alert fires AFTER the cleaner has checked out (race / late
    // cron) — without it, we extrapolate past the real end and overcharge.
    const workStart = parseTimestamp(booking.check_in_time as string) || parseTimestamp(booking.start_time as string) || now
    const workEnd = parseTimestamp(booking.check_out_time as string) || now
    const rawMinutes = Math.max(0, (workEnd.getTime() - workStart.getTime()) / (1000 * 60))
    const actualHours = Math.max(0.5, Math.round(rawMinutes / 30) * 0.5)

    // Estimated total = if checkout already happened, bill actual minutes
    // (no +30 buffer); else project + 30 min for wrap-up.
    const hasCheckedOut = !!parseTimestamp(booking.check_out_time as string)
    const projectedMinutes = hasCheckedOut ? rawMinutes : rawMinutes + 30
    // Client billed hours round up past 10 min; cleaner paid hours past 15 min.
    let estimatedTotalHours = Math.max(0.5, clientBilledHours(projectedMinutes))
    let cleanerEstHours = Math.max(0.5, cleanerPaidHours(projectedMinutes))

    // Honor client-approved max hours cap if set on the booking.
    const maxHours = typeof booking.max_hours === 'number' && booking.max_hours > 0 ? Number(booking.max_hours) : null
    const cappedByMax = maxHours !== null && estimatedTotalHours > maxHours
    if (cappedByMax) estimatedTotalHours = maxHours as number
    if (maxHours !== null && cleanerEstHours > maxHours) cleanerEstHours = maxHours

    const clientRate = booking.hourly_rate || 69
    const teamSizeForBilling = Math.max(1, (booking.team_size as number) || 1)
    // Bill in real cents (e.g. 3.5hr × $75 = $262.50, not $263). Rounding to
    // whole dollars makes the payment-processor see a fake tip because it
    // compares against precise cents.
    const grossOwedCents = Math.round(estimatedTotalHours * clientRate * teamSizeForBilling * 100)
    const grossOwed = (grossOwedCents / 100).toFixed(2)

    // The booking's own discount_percent + one-time credit apply here same as
    // every other collection point (payment-processor, Stripe webhook,
    // team-portal checkout) — otherwise the client is texted a total that
    // doesn't match what they agreed to or what the payment-processor expects
    // (nycmaid 6ec48424/a8efe43f parity).
    const bookingDiscountCents = grossOwedCents - applyDiscount(grossOwedCents, booking.discount_percent as number | null)
    const discountLabel = describeDiscount(booking.discount_percent as number | null)
    const creditCents = (booking.one_time_credit_cents as number | null) || 0

    // Self-booking discount applies at billing for self-booked jobs.
    // Flag is in booking.notes; set by /api/client/book at booking time.
    const isSelfBooked = typeof booking.notes === 'string' && /self-booking discount/i.test(booking.notes)
    const selfBookingDiscount = isSelfBooked ? SELF_BOOKING_DISCOUNT_DOLLARS : 0

    const clientOwesCents = Math.max(0, grossOwedCents - bookingDiscountCents - creditCents - Math.round(selfBookingDiscount * 100))
    const clientOwes = (clientOwesCents / 100).toFixed(2)

    const teamMember = booking.team_members as unknown as { name: string; pay_rate: number | null } | null
    // Booking-level pay_rate is an admin override and must win over the team
    // member's own default rate (nycmaid 2428c8c4 precedence parity).
    const baseCleanerRate = booking.pay_rate || teamMember?.pay_rate || 25
    // $35 NJ / Long Island / Westchester floor by JOB location — NYC Maid tenant ONLY.
    const cleanerRate = isNycMaid(tenantId)
      ? effectiveCleanerRate(baseCleanerRate, (booking.clients as unknown as { address?: string | null } | null)?.address ?? null)
      : baseCleanerRate
    const cleanerOwed = (Math.round(cleanerEstHours * cleanerRate * 100) / 100).toFixed(2)

    const client = booking.clients as unknown as { name: string; phone: string; email: string } | null
    const clientName = client?.name || 'Client'
    const clientPhone = client?.phone || ''
    const clientEmail = client?.email || ''
    const clientId = booking.client_id as string | null
    const cleanerName = teamMember?.name || 'Unassigned'
    const serviceLabel = booking.service_type === 'regular' ? 'Standard' : booking.service_type === 'deep' ? 'Deep' : booking.service_type === 'move_in_out' ? 'Move-in/out' : booking.service_type || 'Cleaning'

    const checkedInAt = formatET(workStart, { hour: 'numeric', minute: '2-digit', hour12: true })

    // Every adjustment that can apply, itemized — a booking can carry an
    // admin-set discount AND a one-time credit AND the self-booking promo all
    // at once (nycmaid 6ec48424/a8efe43f parity).
    const adjustments: string[] = []
    if (bookingDiscountCents > 0) adjustments.push(`${discountLabel || 'discount'} ($${(bookingDiscountCents / 100).toFixed(2)})`)
    if (creditCents > 0) adjustments.push(`one-time credit ($${(creditCents / 100).toFixed(2)})`)
    if (selfBookingDiscount > 0) adjustments.push(`$${selfBookingDiscount} self-booking`)
    const adjustmentNote = adjustments.length > 0 ? `, less ${adjustments.join(', ')}` : ''

    const smsLines = [
      `30-MIN HEADS UP`,
      `${clientName} — ${serviceLabel}`,
      `Cleaner: ${cleanerName}`,
      `Checked in: ${checkedInAt} (${actualHours}hrs so far)`,
      maxHours !== null ? `Est. total: ${estimatedTotalHours}hrs${cappedByMax ? ` (capped at client max ${maxHours}hr)` : ` of max ${maxHours}hr`}` : `Est. total: ${estimatedTotalHours}hrs`,
      ``,
      `Collect $${clientOwes} (${estimatedTotalHours}hrs × $${clientRate}/hr${teamSizeForBilling > 1 ? ` × ${teamSizeForBilling} cleaners` : ''} = $${grossOwed}${adjustmentNote})`,
      `Pay ${cleanerName}: $${cleanerOwed} (${cleanerEstHours}hrs × $${cleanerRate}/hr)`,
    ]

    if (clientPhone) {
      smsLines.push(``, `Client #: ${clientPhone}`)
    }

    const smsMessage = smsLines.join('\n')

    // Atomic claim, not a plain write. The early idempotency check above
    // (line ~104) is a read-then-later-write gap -- fine for the common
    // case, but two requests for the SAME booking close together (e.g. a
    // client whose 20s abort-timeout led them to retry while the FIRST
    // request is still deep in its own Telnyx retry loop below) could both
    // pass that early read before either one's write lands, and both text
    // the client. Same class of race already closed elsewhere this session
    // (bank-transactions/match's atomic claim). force=true bypasses the
    // claim gate entirely (existing manual-override behavior, unchanged).
    //
    // Also persists price: clientOwesCents here -- this is the exact number
    // the client is about to be texted and asked to pay via the adjustable-
    // amount Payment Link. The Stripe webhook's tip math (route.ts, stripe/)
    // computes tip = amount paid − booking.price at the moment the payment
    // arrives; its own comment there flags that a price/hours edit between
    // this alert and the client paying still misreads as a tip, "would need
    // the exact quoted amount stored at alert-time to fully close." Payment
    // for this flow always lands BEFORE checkout (that's the point of a
    // 30-min-heads-up), so without this write, booking.price is whatever
    // stale estimate existed before this alert -- almost always lower than
    // the live, check-in-elapsed clientOwesCents figure being quoted right
    // now -- and every such payment reads as an overpayment "tip" it never
    // was, inflating what the cleaner is shown (and can be marked/paid) as
    // owed. Team-portal checkout already re-syncs price to the true final
    // amount once actual hours are known, so this only ever narrows the
    // window, never claims a more-final number than checkout's own.
    if (!force) {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      // Two sequential attempts instead of a single .or() filter: an
      // .update() chained with .or('col.is.null,col.lt.X').select() matches
      // ZERO rows against this Supabase/PostgREST version even though the
      // identical filter works fine on a plain .select() -- confirmed live
      // (2026-07-24): every 30-min-alert call silently no-opped and returned
      // alreadySent, for every tenant, because the claim query never actually
      // matched. A row is either null or has a stale value, never both, so
      // running .is(null) first and .lt(thirtyMinAgo) as a fallback covers
      // the same two cases the .or() was meant to, with builder methods that
      // are proven to work.
      let claimed = (
        await tenantDb(tenantId)
          .from('bookings')
          .update({ fifteen_min_alert_time: now.toISOString(), price: clientOwesCents })
          .eq('id', bookingId)
          .eq('tenant_id', tenantId)
          .is('fifteen_min_alert_time', null)
          .select('id, fifteen_min_alert_time')
          .maybeSingle()
      ).data
      if (!claimed) {
        claimed = (
          await tenantDb(tenantId)
            .from('bookings')
            .update({ fifteen_min_alert_time: now.toISOString(), price: clientOwesCents })
            .eq('id', bookingId)
            .eq('tenant_id', tenantId)
            .lt('fifteen_min_alert_time', thirtyMinAgo)
            .select('id, fifteen_min_alert_time')
            .maybeSingle()
        ).data
      }
      if (!claimed) {
        // Another request already claimed this alert (or it's within its
        // own 30-min window) -- bail out before sending anything, don't
        // just silently proceed.
        return NextResponse.json({
          success: true,
          alreadySent: true,
          message: 'Alert already in progress or recently sent — skipping duplicate',
        })
      }
    } else {
      await tenantDb(tenantId)
        .from('bookings')
        .update({ fifteen_min_alert_time: now.toISOString(), price: clientOwesCents })
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
    }

    // --- Notify admin FIRST, then text the client. No client email. ---
    const firstName = clientName.split(' ')[0]

    await smsAdmins(tenantId, smsMessage).catch(err => console.error('30min admin SMS failed:', err))

    await notify({
      tenantId,
      type: '15min_warning',
      title: '30-Min Heads Up',
      message: smsMessage,
      bookingId,
    }).catch(() => {})

    // Payment link — a fresh, single-booking Stripe Payment Link is created
    // per alert (never reused across bookings/tenants). It's stored on the
    // booking now so the review-engine reply flow can send it later without
    // creating a second competing link.
    let payLink = ''
    if (tenant.stripe_api_key) {
      try {
        const link = await createPaymentLink({
          amount: clientOwesCents,
          serviceName: serviceLabel,
          bookingId,
          tenantId,
          stripeApiKey: tenant.stripe_api_key,
          adjustableAmount: true,
        })
        payLink = link.url
        await tenantDb(tenantId).from('bookings').update({ payment_link: payLink }).eq('id', bookingId)
      } catch (err) {
        console.error('30min payment link creation failed:', err)
        await logCommsFail({
          tenantId,
          title: '30min payment link creation failed',
          dedupKey: `30min-paylink:${bookingId}`,
          message: err instanceof Error ? err.message : String(err),
          bookingId,
        })
      }
    }
    const payLines = payLink
      ? [
          ``,
          `Pay here: ${payLink}`,
          `Please pay through this link only — credit/debit card, Cash App, or Apple Pay. We appreciate you!`,
        ]
      : []

    // Client message: bill + balance + a 1-5 rating ask, all in ONE text,
    // sent directly every time. Payment is never gated on the reply — the
    // pay link above already went out. A reply is handled separately by
    // review-engine.ts (handleReviewRating): 4-5 schedules a delayed
    // "$20 off, leave a review" text via cron/review-offer; 1-3 alerts the
    // admin on Telegram. Per Jeff's request 2026-08-07.
    const clientSmsType = '30min_payment'
    const clientSmsText = [
      `Hi ${firstName}! Here is your balance for today's cleaning service.`,
      `Total: $${clientOwes}`,
      ...payLines,
      ``,
      `Would you mind please rating your cleaner 1 to 5? We truly appreciate your feedback.`,
    ].join('\n')

    const confirmedVia: string[] = []
    let smsAttempts = 0
    if (clientId) {
      for (let i = 0; i < 2; i++) {
        smsAttempts++
        const smsResult = await sendClientSMS(tenant, clientId, clientSmsText).catch(async err => {
          console.error(`Client 30min SMS attempt ${i + 1} failed:`, err)
          await logCommsFail({
            tenantId,
            title: '30min client SMS threw',
            dedupKey: `30min-sms:${bookingId}`,
            message: `booking=${bookingId} attempt=${i + 1} error=${err instanceof Error ? err.message : String(err)}`,
            bookingId,
          })
          return { sent: 0, skipped: 0 }
        })
        if (smsResult?.sent && smsResult.sent > 0) { confirmedVia.push('SMS'); break }
        if (i === 0) await new Promise(r => setTimeout(r, 60_000))
      }
    }

    // sendClientSMS (src/lib/client-contacts.ts) doesn't write to sms_logs —
    // the review-engine's reply matching depends entirely on a logged
    // sms_type row existing here. Without this, no reply to this text can
    // ever be matched to a booking (see fullloop_nycmaid_review_flow_regression_2026_08_05:
    // this is exactly what commit bf72df19b silently broke on 2026-08-03 by
    // switching off the old smsType-logging sendClientSMS).
    if (confirmedVia.includes('SMS') && clientPhone) {
      await supabaseAdmin.from('sms_logs').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        sms_type: clientSmsType,
        recipient: clientPhone,
        status: 'sent',
      }).then(() => {}, () => {})
    }

    // Second admin ping with delivery confirmation
    const confirmLine = confirmedVia.length > 0
      ? `✓ Payment request SENT to ${firstName} via SMS${smsAttempts > 1 ? ` (took ${smsAttempts} attempts)` : ''}`
      : `✗ URGENT: could not reach ${firstName} — CALL ${clientPhone || 'no phone on file'} manually`
    await smsAdmins(tenantId, confirmLine).catch(err => console.error('30min admin confirm SMS failed:', err))

    // Escalate if client SMS failed entirely
    if (confirmedVia.length === 0 && clientId) {
      await tenantDb(tenantId).from('admin_tasks').insert({ // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        type: 'payment_request_undelivered',
        priority: 'high',
        title: `CALL ${clientName} manually — $${clientOwes} payment request undelivered`,
        description: `SMS failed for booking ${bookingId}. Phone: ${clientPhone || 'none'}. Email on file: ${clientEmail || 'none'}. Cleaner is ~30 min from done.`,
        related_type: 'booking',
        related_id: bookingId,
      }).then(() => {}, () => {})
    }

    // (nycmaid runs an email-monitor poll here; retired — Stripe-only, webhook confirms)

    return NextResponse.json({
      success: true,
      smsSent: true,
      clientNotified: confirmedVia.length > 0,
      confirmedVia,
      actualHours,
      estimatedTotalHours,
      clientOwes,
      cleanerOwed,
    })
  } catch (err) {
    console.error('[15min-alert]', err)
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 })
  }
}
