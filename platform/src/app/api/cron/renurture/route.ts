import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { decryptSecret } from '@/lib/secret-crypto'
import { pickNextTouch, RENURTURE_TOUCHES, type RenurtureTouch } from '@/lib/nycmaid/renurture'
import { sendRenurtureTouch, type RenurtureClient } from '@/lib/nycmaid/renurture-send'
import { computeChurnFactsByClient } from '@/lib/client-churn-facts'
import { computeAndSaveCleanerRetention } from '@/lib/cleaner-retention'
import { trackError } from '@/lib/error-tracking'

export const maxDuration = 300

// Renurture win-back — originally a nycmaid-only parity port (Jeff's call
// 2026-07-17), globalized 2026-07-27 now that the nycmaid cutover is
// complete. Runs weekly (see vercel.json), no per-batch human review.
// Copy/branding is resolved per-tenant in renurture-send.ts (tenantSiteUrl,
// tenants.name/phone) — no tenant gating left. Carries the same three
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
    // Retention is a DB rollup, not a send — runs for every active tenant
    // regardless of SMS config, decoupled from the balance/cap gates below.
    await computeAndSaveCleanerRetention(tenant.id).catch(err =>
      trackError(err, { source: 'cron/renurture:retention_failed', tenantId: tenant.id, severity: 'medium' }),
    )

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
  const factsByClient = computeChurnFactsByClient(clients, bookings || [], schedules || [], now)
  let sent = 0

  for (const client of clients as RenurtureClient[]) {
    if (sent >= PER_RUN_CAP) break

    const facts = factsByClient.get(client.id)
    if (!facts) continue

    const alreadySentKeys = sentByClient.get(client.id) || new Set<string>()
    const touch: RenurtureTouch | null = pickNextTouch(facts, alreadySentKeys)
    if (!touch) continue

    const result = await sendRenurtureTouch(tenantId, client, touch)
    if (result === 'sent') sent++
  }

  return sent
}

export { RENURTURE_TOUCHES }
