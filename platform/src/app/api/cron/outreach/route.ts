/**
 * Seasonal outreach cron — Saturdays at 10am ET.
 * For each tenant with SMS configured: send a warm seasonal check-in to clients
 * who are NOT already booked, recurring, or in the active sales pipeline.
 * Tenant-aware port from nycmaid.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getCommPrefs } from '@/lib/comms-prefs'
import { getActiveMoments, pickMessage, qualifiesForMoment, type OutreachMoment } from '@/lib/outreach'
import { nowNaiveET } from '@/lib/recurring'

export const maxDuration = 300

interface ClientRow {
  id: string
  name: string | null
  phone: string | null
  pet_name: string | null
  pet_type: string | null
  do_not_service: boolean | null
  sms_marketing_opt_out: boolean | null
  sms_consent: boolean | null
  outreach_count: number | null
}

interface TenantRow {
  id: string
  name: string
  telnyx_api_key: string | null
  telnyx_phone: string | null
  selena_config: Record<string, unknown> | null
}

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const moments = getActiveMoments()
  if (moments.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No active outreach moment today' })
  }

  // Active tenants with SMS configured.
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, selena_config')
    .eq('status', 'active')

  let totalSent = 0
  const perTenant: Record<string, number> = {}

  for (const tenant of (tenants as TenantRow[] | null) || []) {
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue

    const aiName = (tenant.selena_config?.ai_name as string | undefined) || 'Selena'
    const sentForTenant = await processTenant(tenant, moments, aiName)
    if (sentForTenant > 0) {
      perTenant[tenant.id] = sentForTenant
      totalSent += sentForTenant
    }
  }

  return NextResponse.json({ success: true, sent: totalSent, perTenant, moments: moments.map(m => m.id) })
}

async function processTenant(tenant: TenantRow, moments: OutreachMoment[], aiName: string): Promise<number> {
  // Gated by the retention (win-back) SMS toggle. Off → skip this tenant.
  const prefs = await getCommPrefs(tenant.id)
  if (prefs.comms.retention?.sms === false) return 0

  // 1. Eligible clients: have phone, opted in, not DNS, active.
  const { data: rawClients } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, pet_name, pet_type, do_not_service, sms_marketing_opt_out, sms_consent, outreach_count')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .neq('do_not_service', true)
    .not('phone', 'is', null)
  const clients = (rawClients as ClientRow[] | null) || []
  if (clients.length === 0) return 0

  // 2. Exclude clients with upcoming/active bookings. bookings.start_time is
  // naive-ET (see lib/recurring.ts's nowNaiveET header) -- a true-UTC
  // `new Date().toISOString()` here read as a later clock time than the real
  // ET instant, so a client with a booking genuinely still upcoming (within
  // the ET/UTC gap) silently fell OUT of `scheduledIds` and got an unwanted
  // win-back text despite already having an appointment. Same bug class
  // fixed across this session.
  const nowNaive = nowNaiveET()
  const { data: scheduled } = await supabaseAdmin
    .from('bookings')
    .select('client_id')
    .eq('tenant_id', tenant.id)
    .gte('start_time', nowNaive)
    .in('status', ['scheduled', 'confirmed', 'pending', 'in_progress'])
  const scheduledIds = new Set(((scheduled as Array<{ client_id: string }> | null) || []).map(b => b.client_id))

  // 3. Exclude clients on active recurring schedules.
  const { data: recurring } = await supabaseAdmin
    .from('recurring_schedules')
    .select('client_id')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
  const recurringIds = new Set(((recurring as Array<{ client_id: string }> | null) || []).map(r => r.client_id))

  // 4. Exclude clients on the active sales board (deals).
  const { data: deals } = await supabaseAdmin
    .from('deals')
    .select('client_id')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
  const dealIds = new Set(((deals as Array<{ client_id: string }> | null) || []).map(d => d.client_id))

  const eligible = clients.filter(c =>
    c.phone && !c.sms_marketing_opt_out && c.sms_consent !== false
    && !scheduledIds.has(c.id) && !recurringIds.has(c.id) && !dealIds.has(c.id)
  )

  let sent = 0
  for (const moment of moments) {
    const { data: alreadyTexted } = await supabaseAdmin
      .from('outreach_log')
      .select('client_id')
      .eq('tenant_id', tenant.id)
      .eq('moment_id', moment.id)
    const sentIds = new Set(((alreadyTexted as Array<{ client_id: string }> | null) || []).map(r => r.client_id))

    const toSend = eligible.filter(c => !sentIds.has(c.id) && qualifiesForMoment(moment, c.pet_type, c.pet_name))

    for (const c of toSend) {
      const message = pickMessage(moment, c.id, c.name, c.pet_name, tenant.name, aiName)

      // Claim BEFORE sending: the outreach_log unique constraint on
      // (tenant_id, client_id, moment_id) is the atomic dedup boundary here,
      // not just a post-send log. Sending first and logging after left a
      // window where two overlapping invocations (a manual re-trigger racing
      // the scheduled Saturday run, or a platform-retried delivery) could
      // both read the same empty `sentIds` set above and both text the same
      // client for the same moment before either's insert landed -- the
      // insert's duplicate-key handling only deduped the LOG row, it never
      // prevented the duplicate SMS itself. Same bug class + fix shape as
      // rating-prompt/payment-reminder/comhub-email's claim-before-send fixes.
      const { error: logErr } = await supabaseAdmin.from('outreach_log').insert({
        tenant_id: tenant.id,
        client_id: c.id,
        moment_id: moment.id,
        message,
      })
      if (logErr) {
        if (!logErr.message.includes('duplicate key')) {
          console.error('[outreach] log insert failed:', logErr.message)
        }
        continue // lost the race, or the claim write itself failed -- either way, do not send
      }

      try {
        await sendSMS({
          to: c.phone!,
          body: message,
          telnyxApiKey: tenant.telnyx_api_key!,
          telnyxPhone: tenant.telnyx_phone!,
        })

        await supabaseAdmin
          .from('clients')
          .update({
            last_outreach_at: new Date().toISOString(),
            outreach_count: (c.outreach_count || 0) + 1,
          })
          .eq('id', c.id)
          .eq('tenant_id', tenant.id)

        sent++
      } catch (err) {
        console.error(`[outreach] SMS failed for tenant=${tenant.id} client=${c.id}:`, err)
      }
    }
  }

  return sent
}
