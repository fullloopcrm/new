import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { verifyCronSecret } from '@/lib/cron-auth'
import { isCommEnabled } from '@/lib/comms-prefs'
import { getTenantTimezone, getLocalHour, toTenantNaiveString } from '@/lib/tenant-time'

// Daily payment follow-up for COMPLETED jobs that still haven't been paid.
// Ported from nycmaid (single-tenant) → FullLoop multi-tenant.
//
// Cadence: 8am, 12pm, 6pm in EACH TENANT'S OWN timezone, every day, until the
// booking is marked paid. Payment is link-based (Stripe), so the webhook
// flips payment_status to 'paid' the moment the client pays — this
// self-terminates with no manual check-off.
//
// SCOPE: only tenants with BOTH a Telnyx key AND a payment_link set are chased.
//
// vercel.json fires hourly; each tenant is only processed when it's actually
// one of its own local send-slot hours (was previously a single ET-hardcoded
// gate applied to every tenant regardless of their real timezone).
//
// Safety rails (no-mass-SMS rule):
//   - 14-day recency floor: never chase ancient / migrated bookings.
//   - per-slot idempotency via sms_logs: at most one text per booking per slot.
//   - hard cap per tenant per run, with admin notify if exceeded.
const SEND_SLOTS_LOCAL = new Set([8, 12, 18])
const RECENCY_FLOOR_DAYS = 14
const SLOT_IDEMPOTENCY_MS = 3.5 * 60 * 60 * 1000 // < 4h gap between slots
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

  const idempotencyCutoff = new Date(now.getTime() - SLOT_IDEMPOTENCY_MS).toISOString()

  const perTenant: { tenant: string; sent: number; wouldText: number; capHit: boolean }[] = []
  let skippedWrongHour = 0

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_phone || !tenant.payment_link) continue
    const timezone = getTenantTimezone(tenant)
    const localHour = getLocalHour(timezone, now)
    if (!force && !dryRun && !SEND_SLOTS_LOCAL.has(localHour)) { skippedWrongHour++; continue }
    if (!(await isCommEnabled(tenant.id, 'payment_reminder', 'sms'))) continue

    // end_time is naive tenant-local — compare against a naive string in
    // THIS tenant's own timezone convention.
    const recencyFloor = toTenantNaiveString(timezone, new Date(now.getTime() - RECENCY_FLOOR_DAYS * 24 * 60 * 60 * 1000))

    const { data: unpaid } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, price, end_time, clients(name, phone)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'completed')
      .gt('price', 0)
      .gte('end_time', recencyFloor)
      .not('payment_status', 'in', '("paid","partial")')
      .is('payment_method', null)

    let sent = 0
    let wouldText = 0
    let capHit = false

    for (const booking of unpaid || []) {
      if (sent >= MAX_SENDS_PER_RUN) { capHit = true; break }
      const client = booking.clients as unknown as { name?: string; phone?: string } | null
      if (!booking.client_id || !client?.phone) continue

      // Per-slot idempotency: already chased this booking this slot?
      const { count } = await supabaseAdmin
        .from('sms_logs')
        .select('id', { count: 'exact', head: true })
        .eq('booking_id', booking.id)
        .eq('sms_type', SMS_TYPE)
        .gte('created_at', idempotencyCutoff)
      if (count && count > 0) continue

      const amount = (booking.price / 100).toFixed(2)
      if (dryRun) { wouldText++; continue }

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
        await supabaseAdmin.from('sms_logs').insert({
          tenant_id: tenant.id,
          booking_id: booking.id,
          sms_type: SMS_TYPE,
        })
        sent++
      } catch (err) {
        console.error(`[payment-followup-daily] send failed (tenant ${tenant.id}, booking ${booking.id}):`, err)
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
