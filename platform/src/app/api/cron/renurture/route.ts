/**
 * Renurture win-back cron — weekly, all tenants.
 * Tenant-aware port of nycmaid's src/app/api/cron/renurture/route.ts
 * (commits a089465e + 9f55c77e), adapted to loop every active tenant
 * instead of assuming a single business, following the same
 * per-tenant-loop / claim-before-send / naive-ET pattern already
 * established by cron/outreach and cron/retention.
 *
 * Targets two segments per tenant: one-time clients who never rebooked, and
 * lapsed recurring clients whose schedule is no longer active. Each gets a
 * 3-touch escalating sequence (10% / 15% / 20% off) for booking a recurring
 * service once every 30 days. Dedup via renurture_log's unique constraint on
 * (tenant_id, client_id, touch_key) — each client gets each touch at most
 * once, ever.
 *
 * Requires src/lib/migrations/2026_07_18_renurture_log_PROPOSED.sql to be
 * run before this can send anything — until then every tenant's log query
 * errors and that tenant is skipped (fails closed, not silently skipped).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { safeEqual } from '@/lib/secret-compare'
import { toNaiveET } from '@/lib/dates'
import { getCommPrefs } from '@/lib/comms-prefs'
import { emailAdmins, smsAdmins } from '@/lib/admin-contacts'
import { pickNextTouch, type ClientBookingFacts, type RenurtureTouch } from '@/lib/renurture'
import { sendRenurtureTouch, type RenurtureClient, type RenurtureTenant } from '@/lib/renurture-send'

export const maxDuration = 300

const PER_RUN_CAP_PER_TENANT = 20

interface BookingRow {
  client_id: string
  status: string
  start_time: string
}

interface ScheduleRow {
  client_id: string
  status: string
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || !safeEqual(request.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, domain, primary_color, logo_url, address, resend_api_key, email_from, telnyx_api_key, telnyx_phone')
    .eq('status', 'active')
    .limit(1000)

  let totalSent = 0
  let totalEligible = 0
  const perTenant: Record<string, { sent: number; eligible: number }> = {}
  const errors: string[] = []

  for (const tenant of (tenants as RenurtureTenant[] | null) || []) {
    const hasEmail = !!(tenant.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))
    const hasSMS = !!(tenant.telnyx_api_key && tenant.telnyx_phone)
    if (!hasEmail && !hasSMS) continue

    try {
      const result = await processTenant(tenant, hasEmail, hasSMS)
      if (result.eligible > 0) {
        perTenant[tenant.id] = result
        totalSent += result.sent
        totalEligible += result.eligible
      }
    } catch (tenantErr) {
      errors.push(`Tenant ${tenant.name} (${tenant.id}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`)
    }
  }

  return NextResponse.json({ success: true, sent: totalSent, eligible: totalEligible, perTenant, errors: errors.slice(0, 20) })
}

async function processTenant(
  tenant: RenurtureTenant,
  tenantHasEmail: boolean,
  tenantHasSMS: boolean,
): Promise<{ sent: number; eligible: number }> {
  // Gated by the retention (win-back) comms toggle — reuses the existing
  // key (comms-registry.ts) rather than adding a new one; renurture IS a
  // win-back campaign. Per-channel: a tenant can allow SMS but not email
  // win-back messages, or vice versa.
  const prefs = await getCommPrefs(tenant.id)
  const smsAllowed = tenantHasSMS && prefs.comms.retention?.sms !== false
  const emailAllowed = tenantHasEmail && prefs.comms.retention?.email !== false
  if (!smsAllowed && !emailAllowed) return { sent: 0, eligible: 0 }

  const { data: rawClients, error: clientsErr } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, phone, email_marketing_opt_out, sms_marketing_opt_out, do_not_service, status')
    .eq('tenant_id', tenant.id)
    .not('status', 'in', '(inactive,do_not_contact)')
    .neq('do_not_service', true)
    .limit(5000)
  if (clientsErr) throw new Error(`clients query failed: ${clientsErr.message}`)
  const clients = (rawClients as (RenurtureClient & { status: string | null })[] | null) || []
  if (clients.length === 0) return { sent: 0, eligible: 0 }

  const now = new Date()
  const nowNaiveETMs = new Date(toNaiveET(now)).getTime()

  const { data: bookings, error: bookingsErr } = await supabaseAdmin
    .from('bookings')
    .select('client_id, status, start_time')
    .eq('tenant_id', tenant.id)
    .in('status', ['completed', 'paid', 'scheduled', 'confirmed', 'pending', 'in_progress'])
    .limit(20000)
  if (bookingsErr) throw new Error(`bookings query failed: ${bookingsErr.message}`)

  const { data: schedules, error: schedulesErr } = await supabaseAdmin
    .from('recurring_schedules')
    .select('client_id, status')
    .eq('tenant_id', tenant.id)
    .limit(5000)
  if (schedulesErr) throw new Error(`recurring_schedules query failed: ${schedulesErr.message}`)

  const { data: alreadySent, error: logErr } = await supabaseAdmin
    .from('renurture_log')
    .select('client_id, touch_key')
    .eq('tenant_id', tenant.id)
    .limit(20000)
  if (logErr) {
    // Fails closed: if we can't confirm what's already been sent, don't risk
    // re-sending. Table must exist (run 2026_07_18_renurture_log_PROPOSED.sql
    // via leader/Jeff) before this cron can send anything for this tenant.
    await emailAdmins(tenant, 'Renurture cron aborted — dedup log unreadable', `<p>${logErr.message}</p>`).catch(() => {})
    throw new Error(`renurture_log unreadable: ${logErr.message}`)
  }

  const bookingsByClient = new Map<string, BookingRow[]>()
  for (const b of (bookings as BookingRow[] | null) || []) {
    if (!bookingsByClient.has(b.client_id)) bookingsByClient.set(b.client_id, [])
    bookingsByClient.get(b.client_id)!.push(b)
  }
  const schedulesByClient = new Map<string, ScheduleRow[]>()
  for (const s of (schedules as ScheduleRow[] | null) || []) {
    if (!schedulesByClient.has(s.client_id)) schedulesByClient.set(s.client_id, [])
    schedulesByClient.get(s.client_id)!.push(s)
  }
  const sentKeysByClient = new Map<string, Set<string>>()
  for (const row of (alreadySent as { client_id: string; touch_key: string }[] | null) || []) {
    if (!sentKeysByClient.has(row.client_id)) sentKeysByClient.set(row.client_id, new Set())
    sentKeysByClient.get(row.client_id)!.add(row.touch_key)
  }

  const eligible: { client: RenurtureClient; touch: RenurtureTouch }[] = []
  for (const client of clients) {
    const cb = bookingsByClient.get(client.id) || []
    const completed = cb.filter(b => b.status === 'completed' || b.status === 'paid')
    const lastServiceDateMs = completed.length > 0
      ? Math.max(...completed.map(b => new Date(b.start_time.endsWith('Z') || b.start_time.includes('+') ? b.start_time : b.start_time + 'Z').getTime()))
      : null
    const hasUpcoming = cb.some(b => ['scheduled', 'confirmed', 'pending', 'in_progress'].includes(b.status) && b.start_time >= toNaiveET(now))
    const sched = schedulesByClient.get(client.id) || []

    const facts: ClientBookingFacts = {
      completedCount: completed.length,
      lastServiceDateMs,
      hasUpcoming,
      scheduleCount: sched.length,
      hasActiveSchedule: sched.some(s => s.status === 'active'),
    }
    const touch = pickNextTouch(facts, sentKeysByClient.get(client.id) || new Set(), nowNaiveETMs)
    if (touch) eligible.push({ client, touch })
  }

  if (eligible.length > PER_RUN_CAP_PER_TENANT) {
    await emailAdmins(
      tenant,
      `⚠️ Renurture cron: ${eligible.length} eligible, cap=${PER_RUN_CAP_PER_TENANT}`,
      `<p>Renurture cron found <strong>${eligible.length}</strong> clients eligible this run. Cap is ${PER_RUN_CAP_PER_TENANT}. Sending the first ${PER_RUN_CAP_PER_TENANT}; the rest remain eligible and will be picked up next run.</p>`,
    ).catch(() => {})
    await smsAdmins(tenant, `⚠️ Renurture cron blocked at ${PER_RUN_CAP_PER_TENANT}/${eligible.length} eligible. Check admin.`).catch(() => {})
  }

  let sent = 0
  for (const { client, touch } of eligible.slice(0, PER_RUN_CAP_PER_TENANT)) {
    const scopedClient: RenurtureClient = {
      ...client,
      email: emailAllowed ? client.email : null,
      phone: smsAllowed ? client.phone : null,
    }
    const result = await sendRenurtureTouch(tenant, scopedClient, touch)
    if (result.claimed && result.sent) sent++
    // Pacing: stay well under Telnyx's per-window rate limits on a full-cap run.
    await new Promise(r => setTimeout(r, 300))
  }

  return { sent, eligible: eligible.length }
}
