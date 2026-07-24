import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { decryptSecret } from '@/lib/secret-crypto'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { pickNextTouch, RENURTURE_TOUCHES, type RenurtureTouch } from '@/lib/nycmaid/renurture'
import { sendRenurtureTouch, type RenurtureClient } from '@/lib/nycmaid/renurture-send'
import { parseNaiveET } from '@/lib/recurring'

export const maxDuration = 300

// Renurture win-back — tenant-aware port from nycmaid (fully automated,
// Jeff's call 2026-07-17 on the source). Runs weekly (see vercel.json), no
// per-batch human review. Gated to nycmaid only for now — same
// isNycMaid() scoping pattern as the rest of this parity copy-over; this is
// not yet generalized as a global platform feature. Carries the same three
// safety nets the source cron does:
//   1. Balance check up front — fails closed (sends nothing) if Telnyx
//      funds look thin, instead of discovering it mid-run.
//   2. Per-run CAP with admin alert.
//   3. renurture_log dedup — each client gets each touch (1/2/3) AT MOST
//      ONCE ever, enforced by a DB unique constraint, not just in-memory
//      logic. A client who rebooks exits the segment naturally and stops
//      receiving touches.
const PER_RUN_CAP = 20
const MIN_BALANCE_USD = 5

async function checkTelnyxBalance(telnyxApiKeyEncrypted: string): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const apiKey = decryptSecret(telnyxApiKeyEncrypted)?.replace(/\s/g, '')
  if (!apiKey) return { ok: false, error: 'telnyx_api_key not configured' }
  try {
    const res = await fetch('https://api.telnyx.com/v2/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return { ok: false, error: `Telnyx balance check failed: ${res.status}` }
    const data = await res.json()
    const balance = parseFloat(data?.data?.balance ?? data?.data?.available_credit ?? 'NaN')
    if (Number.isNaN(balance)) return { ok: false, error: 'Could not parse Telnyx balance response' }
    return { ok: balance >= MIN_BALANCE_USD, balance }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Telnyx balance check threw' }
  }
}

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, telnyx_api_key')
    .eq('status', 'active')
    .limit(1000)

  let totalSent = 0
  const perTenant: Record<string, unknown> = {}

  for (const tenant of tenants || []) {
    if (!isNycMaid(tenant.id)) continue // gated, not yet global — see file header
    if (!tenant.telnyx_api_key) continue

    const balanceCheck = await checkTelnyxBalance(tenant.telnyx_api_key)
    if (!balanceCheck.ok) {
      await notify({
        tenantId: tenant.id,
        type: 'comms_fail',
        title: 'Renurture cron aborted — Telnyx balance',
        message: balanceCheck.error || `Telnyx balance $${balanceCheck.balance} below $${MIN_BALANCE_USD} floor. No renurture messages sent this run.`,
        recipientType: 'admin',
      })
      perTenant[tenant.id] = { sent: 0, reason: 'telnyx_balance', detail: balanceCheck.error }
      continue
    }

    const sent = await processTenant(tenant.id)
    perTenant[tenant.id] = { sent }
    totalSent += sent
  }

  return NextResponse.json({ success: true, sent: totalSent, perTenant })
}

async function processTenant(tenantId: string): Promise<number> {
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, phone, email_marketing_opt_out, sms_marketing_opt_out')
    .eq('tenant_id', tenantId)
    .eq('do_not_service', false)
    .limit(10000)
  if (clientsError || !clients) return 0

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('client_id, status, start_time')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'scheduled', 'in_progress'])
    .limit(10000)

  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules')
    .select('client_id, status')
    .eq('tenant_id', tenantId)
    .limit(10000)

  const { data: alreadySent } = await supabaseAdmin
    .from('renurture_log')
    .select('client_id, touch_key')
    .eq('tenant_id', tenantId)
    .limit(50000)

  const sentByClient = new Map<string, Set<string>>()
  for (const row of alreadySent || []) {
    if (!sentByClient.has(row.client_id)) sentByClient.set(row.client_id, new Set())
    sentByClient.get(row.client_id)!.add(row.touch_key)
  }

  const now = Date.now()
  let sent = 0

  for (const client of clients as RenurtureClient[]) {
    if (sent >= PER_RUN_CAP) break

    const clientBookings = (bookings || []).filter(b => b.client_id === client.id)
    const completedCount = clientBookings.filter(b => b.status === 'completed').length
    // bookings.start_time is a naive America/New_York wall-clock string, not
    // real UTC -- new Date(b.start_time) silently misreads it as UTC and
    // skews every comparison against `now` (a real instant) by the ET/UTC
    // gap (4-5h), same bug class as cron/no-show-check et al.
    const hasUpcoming = clientBookings.some(b => (b.status === 'scheduled' || b.status === 'in_progress') && parseNaiveET(b.start_time).getTime() > now)
    const lastServiceDate = clientBookings
      .filter(b => b.status === 'completed')
      .map(b => parseNaiveET(b.start_time).getTime())
      .sort((a, b) => b - a)[0] ?? null

    const clientSchedules = (schedules || []).filter(s => s.client_id === client.id)
    const scheduleCount = clientSchedules.length
    const hasActiveSchedule = clientSchedules.some(s => s.status === 'active')

    const alreadySentKeys = sentByClient.get(client.id) || new Set<string>()
    const touch: RenurtureTouch | null = pickNextTouch(
      { completedCount, lastServiceDate, hasUpcoming, scheduleCount, hasActiveSchedule },
      alreadySentKeys,
    )
    if (!touch) continue

    const result = await sendRenurtureTouch(tenantId, client, touch)
    if (result === 'sent') sent++
  }

  return sent
}

export { RENURTURE_TOUCHES }
