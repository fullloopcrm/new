import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/token'
import { parseTimestamp } from '@/lib/dates'
import { clientBilledHours, cleanerPaidHours } from '@/lib/billing-hours'
import { effectiveCleanerRate } from '@/lib/cleaner-pay'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'
import { processPayment } from '@/lib/payment-processor'
import { sendPushToClient } from '@/lib/push'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id, lat, lng, payment_method } = await request.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  // Get booking with check-in time + the fields needed to compute the bill.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, check_in_time, check_out_time, hourly_rate, pay_rate, team_size, max_hours, price, service_type_id, team_member_id, referrer_id, client_id, clients(name, address), team_members!bookings_team_member_id_fkey(pay_rate)')
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .single()

  if (!booking || booking.team_member_id !== auth.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (booking.check_out_time) {
    return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
  }

  // Resolve the service's pricing model. ONLY hourly services recompute the
  // client price from elapsed time; flat/per-unit keep the price fixed at
  // booking/quote time. (NYC Maid = all hourly → path below is unchanged.)
  let pricingModel = 'hourly'
  let servicePriceCents: number | null = null
  let minChargeCents: number | null = null
  if (booking.service_type_id) {
    const { data: st } = await supabaseAdmin
      .from('service_types')
      .select('pricing_model, price_cents, min_charge_cents')
      .eq('id', booking.service_type_id as string)
      .eq('tenant_id', auth.tid)
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
    const rawMinutes = Math.max(0, (checkOutTime.getTime() - checkInParsed.getTime()) / 60000)
    hoursWorked = rawMinutes / 60
    const clientHours = clientBilledHours(rawMinutes)
    const cleanerHours = cleanerPaidHours(rawMinutes)
    const cap = typeof booking.max_hours === 'number' && booking.max_hours > 0 ? (booking.max_hours as number) : null
    const billableClient = cap != null ? Math.min(clientHours, cap) : clientHours
    const billableCleaner = cap != null ? Math.min(cleanerHours, cap) : cleanerHours
    actualHours = billableClient
    const member = booking.team_members as unknown as { pay_rate?: number | null } | null
    const baseCleanerRate = member?.pay_rate || (booking.pay_rate as number) || 25
    // $35 NJ / Long Island / Westchester floor by JOB location — NYC Maid tenant ONLY
    // (parity port is tenant-scoped, not global).
    const cleanerRate = isNycMaid(auth.tid)
      ? effectiveCleanerRate(baseCleanerRate, (booking.clients as unknown as { address?: string | null } | null)?.address ?? null)
      : baseCleanerRate
    const clientRate = (booking.hourly_rate as number) || 69
    const teamSize = Math.max(1, (booking.team_size as number) || 1)
    teamMemberPayCents = Math.round(billableCleaner * cleanerRate * 100)
    if (pricingModel === 'hourly') {
      // Time-and-materials: actual hours × rate × crew (NYC Maid path, unchanged).
      updatedPriceCents = Math.round(billableClient * clientRate * teamSize * 100)
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

  // Re-check check_out_time IS NULL in the UPDATE's own WHERE — without this
  // a concurrent duplicate checkout (double-tap, retry) could both pass the
  // "already checked out" guard above and both proceed to processPayment
  // below, charging the client twice for the same job.
  const { data, error } = await supabaseAdmin
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
    .is('check_out_time', null)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
  }

  // Referral commission — if this booking came through an affiliate referrer,
  // ledger their cut on completion. Idempotent via UNIQUE(booking_id); a no-op
  // when there's no referrer.
  if (booking.referrer_id && updatedPriceCents && updatedPriceCents > 0) {
    const { data: ref } = await supabaseAdmin
      .from('referrers')
      .select('id, commission_rate, total_earned, email, name')
      .eq('id', booking.referrer_id as string)
      .eq('tenant_id', auth.tid)
      .single()
    if (ref) {
      const rate = Number(ref.commission_rate) || 0.10
      const commissionCents = Math.round(updatedPriceCents * rate)
      const clientName = (booking.clients as unknown as { name?: string } | null)?.name || null
      const { error: commErr } = await supabaseAdmin.from('referral_commissions').insert({
        tenant_id: auth.tid,
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
        await supabaseAdmin
          .from('referrers')
          .update({ total_earned: (ref.total_earned || 0) + commissionCents })
          .eq('id', ref.id)
          .then(() => {}, () => {})
        await supabaseAdmin.from('notifications').insert({
          tenant_id: auth.tid,
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
        } else if ((ref as { email?: string | null }).email) {
          // Every other tenant with the referral program got the commission
          // ledgered (row above) and the admin got an internal notification
          // (above), but the referrer themselves — the person actually owed
          // the money, and the one this email is meant to keep engaged for
          // future referrals — was never told. The admin-created path
          // (POST /api/referral-commissions) has the identical gap: it only
          // notifies admin via notify(), never the referrer directly. Only
          // the nycmaid-only branch above ever emailed a referrer. Uses the
          // same generic sendEmail() the client-facing reschedule/booking
          // routes already use, gated on the tenant actually having Resend
          // configured (same precondition those routes check).
          const { data: tenantRow } = await supabaseAdmin
            .from('tenants')
            .select('name, resend_api_key, email_from')
            .eq('id', auth.tid)
            .maybeSingle<{ name: string | null; resend_api_key: string | null; email_from: string | null }>()
          if (tenantRow?.resend_api_key) {
            const { sendEmail } = await import('@/lib/email')
            await sendEmail({
              to: (ref as { email: string }).email,
              subject: 'You earned a referral commission',
              html: `<p>Hi ${(ref as { name?: string | null }).name || 'there'}, you just earned $${(commissionCents / 100).toFixed(2)} from ${clientName || 'a'} booking with ${tenantRow.name || 'us'}. Thank you for spreading the word!</p>`,
              resendApiKey: tenantRow.resend_api_key,
              from: tenantRow.email_from || undefined,
            }).catch(() => {})
          }
        }
      }
    }
  }

  // ── NYC Maid parity (tenant-scoped): cleaner-reported payment → shared
  // payment pipeline, client "complete" push, and a loud UNPAID-checkout alert
  // when the cleaner leaves without payment collected. ──
  if (isNycMaid(auth.tid)) {
    const ALLOWED_METHODS = new Set(['credit_card', 'cashapp', 'apple_pay', 'cash'])
    const reportedMethod = typeof payment_method === 'string' && ALLOWED_METHODS.has(payment_method)
      ? payment_method
      : null
    const clientName = (booking.clients as unknown as { name?: string } | null)?.name || 'a client'

    if (reportedMethod && updatedPriceCents) {
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

    if (data.client_id) {
      sendPushToClient(data.client_id, 'Cleaning complete!', 'Your cleaning is finished — thank you!', '/book/dashboard').catch(() => {})
    }

    // Checked out without payment confirmed → loud admin warning immediately.
    if (!reportedMethod && data.payment_status !== 'paid') {
      const clientTotal = updatedPriceCents != null ? (updatedPriceCents / 100).toFixed(0) : '—'
      nmSmsAdmins(`UNPAID CHECKOUT: ${clientName} just checked out ($${clientTotal}) — payment NOT collected. Follow up NOW.`).catch(() => {})
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
            await supabaseAdmin
              .from('bookings')
              .update({ notes: ((data as { notes?: string | null }).notes || '') + `\n\n[GPS check-out flagged: ${dist.toFixed(2)} mi from address]` })
              .eq('id', data.id).eq('tenant_id', auth.tid)
              .then(() => {}, () => {})
            nmSmsAdmins(`GPS MISMATCH on checkout: ${clientName} — ${dist.toFixed(2)} mi from the job address.`).catch(() => {})
          }
        }
      }
    }
  }

  return NextResponse.json({
    booking: data,
    hours_worked: Math.round(hoursWorked * 100) / 100,
    billed_hours: actualHours,
    client_total: updatedPriceCents != null ? Math.round(updatedPriceCents) / 100 : null,
    earnings: teamMemberPayCents != null ? Math.round(teamMemberPayCents) / 100 : 0,
    gps: { lat, lng },
  })
}
