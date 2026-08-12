import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { verifyCronSecret } from '@/lib/cron-auth'
import { isCommEnabled } from '@/lib/comms-prefs'
import { getTenantTimezone, getLocalHour, toTenantNaiveString, getTenantNaiveDayBoundaries } from '@/lib/tenant-time'

// Daily payment follow-up for COMPLETED jobs that still haven't been paid.
// Ported from nycmaid (single-tenant) → FullLoop multi-tenant.
//
// Cadence: 8am, 12pm, 5pm in EACH TENANT'S OWN timezone (Jeff's spec — for
// nycmaid that's Eastern), every day starting the day AFTER the job (same-day
// follow-up is covered by the 15min/60min/2hr/4hr/6hr cadence in
// lib/payment-reminder.ts), until the booking is marked paid. Payment is
// link-based (Stripe), so the webhook flips payment_status to 'paid' the
// moment the client pays — this self-terminates with no manual check-off.
//
// SCOPE: only tenants with BOTH a Telnyx key AND a payment_link set are chased.
//
// vercel.json fires hourly; each tenant is only processed when it's actually
// one of its own local send-slot hours (was previously a single ET-hardcoded
// gate applied to every tenant regardless of their real timezone).
//
// Safety rails (no-mass-SMS rule):
//   - 14-day recency floor: never chase ancient / migrated bookings.
//   - per-slot idempotency via sms_logs: at most one text per booking per
//     slot, enforced by a real unique index (migrations/2026_08_12_sms_logs_
//     followup_slot_unique.sql) on (booking_id, sms_type, slot_key), not
//     just an app-level check -- see the claim-before-send comment below.
//   - hard cap per tenant per run, with admin notify if exceeded.
const SEND_SLOTS_LOCAL = new Set([8, 12, 17])
const RECENCY_FLOOR_DAYS = 14
const MAX_SENDS_PER_RUN = 100
const SMS_TYPE = 'payment_followup_daily'

export async function GET(request: Request) {
  // Fails closed through the shared helper — no spoofable Vercel-cron-header
  // bypass (that header isn't cryptographically signed, so any external
  // caller can send it) and no CRON_SECRET-unset silent pass-through.
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  const dryRun = url.searchParams.get('dry') === '1'

  // Only tenants that can send (Telnyx) AND have a pay link to send.
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, payment_link, owner_phone, phone, timezone')
    .eq('status', 'active')
    .not('telnyx_api_key', 'is', null)
    .not('payment_link', 'is', null)

  const perTenant: { tenant: string; sent: number; wouldText: number; capHit: boolean }[] = []
  let skippedWrongHour = 0

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_phone || !tenant.payment_link) continue
    const timezone = getTenantTimezone(tenant)
    const localHour = getLocalHour(timezone, now)
    if (!force && !dryRun && !SEND_SLOTS_LOCAL.has(localHour)) { skippedWrongHour++; continue }
    // Deterministic identity for "this slot", in the tenant's own local
    // calendar date + send hour -- e.g. '2026-08-12-8'. Backs the atomic
    // per-slot claim below via the unique index on
    // sms_logs(booking_id, sms_type, slot_key).
    const slotKey = `${toTenantNaiveString(timezone, now).slice(0, 10)}-${localHour}`
    if (!(await isCommEnabled(tenant.id, 'payment_reminder', 'sms'))) continue

    // end_time is naive tenant-local — compare against a naive string in
    // THIS tenant's own timezone convention.
    const recencyFloor = toTenantNaiveString(timezone, new Date(now.getTime() - RECENCY_FLOOR_DAYS * 24 * 60 * 60 * 1000))
    // Only jobs from a prior calendar day — today's is covered by the
    // 15min/60min/2hr/4hr/6hr same-day cadence, not this daily one.
    const { todayStartNaive } = getTenantNaiveDayBoundaries(timezone, now)

    const { data: unpaid } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, price, end_time, clients(name, phone)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'completed')
      .gt('price', 0)
      .gte('end_time', recencyFloor)
      .lt('end_time', todayStartNaive)
      .not('payment_status', 'in', '("paid","partial")')
      .is('payment_method', null)

    let sent = 0
    let wouldText = 0
    let capHit = false

    for (const booking of unpaid || []) {
      if (sent >= MAX_SENDS_PER_RUN) { capHit = true; break }
      const client = booking.clients as unknown as { name?: string; phone?: string } | null
      if (!booking.client_id || !client?.phone) continue

      const amount = (booking.price / 100).toFixed(2)
      if (dryRun) {
        // Dry-run summary only -- no claim taken, so this is an estimate,
        // not a guarantee (matches the pre-fix behavior for --dry).
        const { count } = await supabaseAdmin
          .from('sms_logs')
          .select('id', { count: 'exact', head: true })
          .eq('booking_id', booking.id)
          .eq('sms_type', SMS_TYPE)
          .eq('slot_key', slotKey)
        if (count && count > 0) continue
        wouldText++
        continue
      }

      // Claim this booking's slot BEFORE sending. The unique index on
      // sms_logs(booking_id, sms_type, slot_key) (migrations/2026_08_12_
      // sms_logs_followup_slot_unique.sql) makes this atomic: only one
      // concurrent/retried cron invocation can win the insert for a given
      // booking+slot, so at most one SMS goes out per slot even if two runs
      // race. A losing insert (23505 unique violation) means another
      // invocation already claimed this slot -- skip, don't send.
      const { error: claimError } = await supabaseAdmin.from('sms_logs').insert({
        tenant_id: tenant.id,
        booking_id: booking.id,
        sms_type: SMS_TYPE,
        recipient: client.phone,
        slot_key: slotKey,
      })
      if (claimError) {
        if (claimError.code === '23505') continue // already sent this slot
        console.error(`[payment-followup-daily] claim insert failed (tenant ${tenant.id}, booking ${booking.id}):`, claimError)
        continue
      }

      const firstName = client.name?.split(' ')[0] || 'there'
      const payLink = `${tenant.payment_link}?client_reference_id=${booking.id}`
      const text = [
        `Hi ${firstName} — just a reminder your balance of $${amount} for your recent service is still open 😊`,
        ``,
        `Pay here: ${payLink}`,
        ``,
        `Thank you! — ${tenant.name}`,
      ].join('\n')

      try {
        await sendSMS({ to: client.phone, body: text, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
        sent++
      } catch (err) {
        console.error(`[payment-followup-daily] send failed (tenant ${tenant.id}, booking ${booking.id}):`, err)
        // Revert the claim -- no text actually went out, so a later slot (or
        // a force-retry) must be able to try this booking again instead of
        // being permanently blocked by a claim for a send that never happened.
        await supabaseAdmin
          .from('sms_logs')
          .delete()
          .eq('tenant_id', tenant.id)
          .eq('booking_id', booking.id)
          .eq('sms_type', SMS_TYPE)
          .eq('slot_key', slotKey)
      }
    }

    if (capHit) {
      await notify({
        tenantId: tenant.id,
        type: 'follow_up',
        title: `Payment follow-up cap reached (${MAX_SENDS_PER_RUN})`,
        message: `More than ${MAX_SENDS_PER_RUN} unpaid completed bookings in the last ${RECENCY_FLOOR_DAYS} days. Some were not texted this slot.`,
      }).catch(() => {})
    }

    perTenant.push({ tenant: tenant.name, sent, wouldText, capHit })
  }

  return NextResponse.json({ success: true, force, dryRun, skippedWrongHour, tenants: perTenant })
}
