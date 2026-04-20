/**
 * Seasonal outreach cron — Saturdays at 10am ET.
 * For each tenant with SMS configured: send a warm seasonal check-in to clients
 * who are NOT already booked, recurring, or in the active sales pipeline.
 * Tenant-aware port from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getActiveMoments, pickMessage, qualifiesForMoment, type OutreachMoment } from '@/lib/outreach'

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
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // 2. Exclude clients with upcoming/active bookings.
  const nowIso = new Date().toISOString()
  const { data: scheduled } = await supabaseAdmin
    .from('bookings')
    .select('client_id')
    .eq('tenant_id', tenant.id)
    .gte('start_time', nowIso)
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
    .eq('stage', 'active')
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
      try {
        await sendSMS({
          to: c.phone!,
          body: message,
          telnyxApiKey: tenant.telnyx_api_key!,
          telnyxPhone: tenant.telnyx_phone!,
        })

        // Log the send (unique constraint dedups within (tenant, client, moment)).
        const { error: logErr } = await supabaseAdmin.from('outreach_log').insert({
          tenant_id: tenant.id,
          client_id: c.id,
          moment_id: moment.id,
          message,
        })
        if (logErr && !logErr.message.includes('duplicate key')) {
          console.error('[outreach] log insert failed:', logErr.message)
        }

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
