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
import { notify } from '@/lib/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { parseTimestamp, formatET } from '@/lib/dates'
import { parseNaiveET } from '@/lib/recurring'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { clientBilledHours, cleanerPaidHours } from '@/lib/billing-hours'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { applyDiscount, describeDiscount } from '@/lib/discount'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { verifyToken } from '../auth/token'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { bookingId, force } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, tenant_id, start_time, end_time, check_in_time, check_out_time, service_type, hourly_rate, pay_rate, price, notes, max_hours, team_size, team_member_id, client_id, payment_status, fifteen_min_alert_time, discount_percent, one_time_credit_cents, clients(name, phone, email, address), team_members!bookings_team_member_id_fkey(name, pay_rate)')
      .eq('id', bookingId)
      .eq('tenant_id', auth.tid)
      .single()

    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
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

    const tenantId = booking.tenant_id as string
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, telnyx_api_key, telnyx_phone, payment_link')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const now = new Date()

    // Calculate ACTUAL hours worked: check_in_time → check_out_time if set,
    // else check_in_time → now. The check_out_time fallback handles the case
    // where this alert fires AFTER the cleaner has checked out (race / late
    // cron) — without it, we extrapolate past the real end and overcharge.
    // check_in_time is real UTC (parseTimestamp forces UTC on naive input,
    // correct here); start_time is naive-ET (see parseNaiveET's header) --
    // parseTimestamp would misread it as UTC and shift it 4-5h, inflating
    // the actual-hours-worked estimate this computes for client billing.
    const workStart = parseTimestamp(booking.check_in_time as string) || (booking.start_time ? parseNaiveET(booking.start_time as string) : null) || now
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

    // $10 self-booking discount applies at billing for self-booked jobs.
    // Flag is in booking.notes; set by /api/client/book at booking time.
    const SELF_BOOKING_DISCOUNT = 10
    const isSelfBooked = typeof booking.notes === 'string' && /self-booking discount/i.test(booking.notes)
    const selfBookingDiscount = isSelfBooked ? SELF_BOOKING_DISCOUNT : 0

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

    // Record the 30-min alert timestamp on the booking
    await supabaseAdmin
      .from('bookings')
      .update({ fifteen_min_alert_time: now.toISOString() })
      .eq('id', bookingId)

    // --- Notify admin FIRST, then text the client. No client email. ---
    const firstName = clientName.split(' ')[0]

    await smsAdmins(tenantId, smsMessage).catch(err => console.error('30min admin SMS failed:', err))

    await notify({
      tenantId,
      type: '15min_warning' as never,
      title: '30-Min Heads Up',
      message: smsMessage,
      bookingId,
    }).catch(() => {})

    // Client SMS — balance + Stripe pay link sent UP FRONT in the 30-min text.
    // The rating ask rides along; a 1-5 reply routes through the pre_payment_rating
    // flow. Pay link is the tenant's own Stripe link + client_reference_id so the
    // Stripe webhook ties the payment back to this booking.
    const payLink = tenant.payment_link
      ? `${tenant.payment_link}${tenant.payment_link.includes('?') ? '&' : '?'}client_reference_id=${bookingId}`
      : ''
    const payLines = payLink
      ? [
          ``,
          `Pay here: ${payLink}`,
          `Please pay through this link only — credit/debit card, Cash App, or Apple Pay. We appreciate you!`,
        ]
      : []
    const clientSmsText = [
      `Hi ${firstName}! ${cleanerName} is finishing up your clean now 😊`,
      `Your total: $${clientOwes} (${estimatedTotalHours}hrs × $${clientRate}/hr${teamSizeForBilling > 1 ? ` × ${teamSizeForBilling} cleaners` : ''}${adjustmentNote})`,
      ...payLines,
      ``,
      `Payment is due ~30 min before completion. Reply "paid" once sent.`,
      ``,
      `And how'd we do? Reply 1-5 (5 = spotless)!`,
    ].join('\n')
    const clientSmsType = 'pre_payment_rating'

    const confirmedVia: string[] = []
    let smsAttempts = 0
    if (clientId) {
      for (let i = 0; i < 2; i++) {
        smsAttempts++
        const smsResult = await sendClientSMS(clientId, clientSmsText, {
          smsType: clientSmsType,
          bookingId,
        }).catch(err => { console.error(`Client 30min SMS attempt ${i + 1} failed:`, err); return { sent: 0, skipped: 0 } })
        if (smsResult?.sent && smsResult.sent > 0) { confirmedVia.push('SMS'); break }
        if (i === 0) await new Promise(r => setTimeout(r, 60_000))
      }
    }

    // Second admin ping with delivery confirmation
    const confirmLine = confirmedVia.length > 0
      ? `✓ Payment request SENT to ${firstName} via SMS${smsAttempts > 1 ? ` (took ${smsAttempts} attempts)` : ''}`
      : `✗ URGENT: could not reach ${firstName} — CALL ${clientPhone || 'no phone on file'} manually`
    await smsAdmins(tenantId, confirmLine).catch(err => console.error('30min admin confirm SMS failed:', err))

    // Escalate if client SMS failed entirely
    if (confirmedVia.length === 0 && clientId) {
      await supabaseAdmin.from('admin_tasks').insert({
        tenant_id: tenantId,
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
