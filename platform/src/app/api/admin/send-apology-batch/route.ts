/**
 * Apology batch — ported from nycmaid.
 * Sends a discount-credit SMS to one or many clients in a single admin action.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'

export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()
    const clientIds: string[] = Array.isArray(body.client_ids) ? body.client_ids : []
    const creditPct: number = Number(body.credit_pct) || 10
    const reason: string = (body.reason as string) || 'Service issue'
    const message: string = body.message as string

    if (clientIds.length === 0) {
      return NextResponse.json({ error: 'client_ids required' }, { status: 400 })
    }
    if (creditPct < 0 || creditPct > 100) {
      return NextResponse.json({ error: 'credit_pct must be 0-100' }, { status: 400 })
    }

    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('name, telnyx_api_key, telnyx_phone')
      .eq('id', tenantId)
      .single()

    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, do_not_service, sms_opt_in')
      .eq('tenant_id', tenantId)
      .in('id', clientIds)

    if (!clients || clients.length === 0) {
      return NextResponse.json({ error: 'No matching clients' }, { status: 404 })
    }

    let sent = 0
    let skippedDns = 0
    let skippedOptOut = 0
    let skippedNoPhone = 0
    let failed = 0
    const now = new Date().toISOString()

    for (const c of clients) {
      // DNS = never contact
      if (c.do_not_service) { skippedDns++; continue }
      if (c.sms_opt_in === false) { skippedOptOut++; continue }
      if (!c.phone) { skippedNoPhone++; continue }

      const text = (message || `Hi ${c.name?.split(' ')[0] || 'there'} — we owe you an apology. Your next booking is ${creditPct}% off, on us. 😊 — ${tenantRow?.name || ''}`).trim()

      // Apply credit
      await supabaseAdmin
        .from('clients')
        .update({
          apology_credit_pct: creditPct,
          apology_credit_reason: reason,
          apology_credit_at: now,
        })
        .eq('id', c.id)
        .eq('tenant_id', tenantId)

      if (tenantRow?.telnyx_api_key && tenantRow?.telnyx_phone) {
        try {
          await sendSMS({
            to: c.phone,
            body: text,
            telnyxApiKey: tenantRow.telnyx_api_key,
            telnyxPhone: tenantRow.telnyx_phone,
          })
          sent++
        } catch {
          failed++
        }
      } else {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped_dns: skippedDns,
      skipped_opt_out: skippedOptOut,
      skipped_no_phone: skippedNoPhone,
      failed,
      total_clients: clients.length,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[send-apology-batch]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
