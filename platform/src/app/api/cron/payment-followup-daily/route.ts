import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { safeEqual } from '@/lib/secret-compare'

// Daily payment follow-up for COMPLETED jobs that still haven't been paid.
// Ported from nycmaid (single-tenant) → FullLoop multi-tenant.
//
// Cadence: 8am, 12pm, 6pm ET, every day, until the booking is marked paid.
// Payment is link-based (Stripe), so the webhook flips payment_status to 'paid'
// the moment the client pays — this self-terminates with no manual check-off.
//
// SCOPE: only tenants with BOTH a Telnyx key AND a payment_link set are chased.
// Today that's nycmaid; every other tenant is skipped until it has a link, so
// this is nycmaid-only to start and generalizes for free.
//
// DST-proof: vercel.json fires at the UTC hours covering EDT+EST (12,13,16,17,
// 22,23); the handler only proceeds when the actual ET hour is a send slot.
//
// Safety rails (no-mass-SMS rule):
//   - 14-day recency floor: never chase ancient / migrated bookings.
//   - per-slot idempotency via sms_logs: at most one text per booking per slot.
//   - hard cap per tenant per run, with admin notify if exceeded.
const SEND_SLOTS_ET = new Set([8, 12, 18])
const RECENCY_FLOOR_DAYS = 14
const SLOT_IDEMPOTENCY_MS = 3.5 * 60 * 60 * 1000 // < 4h gap between slots
const MAX_SENDS_PER_RUN = 100
const SMS_TYPE = 'payment_followup_daily'

function toNaive(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function etHour(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0'
  return Number(h) % 24
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if ((!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) && request.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const hour = etHour(now)
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  const dryRun = url.searchParams.get('dry') === '1'
  if (!force && !dryRun && !SEND_SLOTS_ET.has(hour)) {
    return NextResponse.json({ success: true, skipped: 'outside send slot', etHour: hour })
  }

  // Only tenants that can send (Telnyx) AND have a pay link to send.
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, payment_link, owner_phone, phone')
    .eq('status', 'active')
    .not('telnyx_api_key', 'is', null)
    .not('payment_link', 'is', null)

  // bookings.end_time is naive local-ET → compare with a naive string.
  const recencyFloor = toNaive(new Date(now.getTime() - RECENCY_FLOOR_DAYS * 24 * 60 * 60 * 1000))
  const idempotencyCutoff = new Date(now.getTime() - SLOT_IDEMPOTENCY_MS).toISOString()

  const perTenant: { tenant: string; sent: number; wouldText: number; capHit: boolean }[] = []

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_phone || !tenant.payment_link) continue

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

  return NextResponse.json({ success: true, etHour: hour, force, dryRun, tenants: perTenant })
}
