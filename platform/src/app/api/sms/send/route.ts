/**
 * Admin-triggered manual SMS. Sends via the calling tenant's Telnyx credentials.
 * No consent filtering — caller is responsible. Tenant-scoped.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'

export async function POST(req: NextRequest) {
  try {
    const { tenant: tenantCtx, error: authError } = await requirePermission('campaigns.send')
    if (authError) return authError
    const { tenantId } = tenantCtx
    const { to, message } = await req.json()
    if (!to || !message) {
      return NextResponse.json({ error: 'to and message required' }, { status: 400 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('telnyx_api_key, telnyx_phone, sms_number')
      .eq('id', tenantId)
      .single()

    const smsCreds = resolveTenantSmsCredentials(tenant)
    if (!smsCreds.apiKey || !smsCreds.phone) {
      return NextResponse.json({ error: 'Tenant has no Telnyx configured' }, { status: 400 })
    }

    try {
      await sendSMS({
        to: String(to),
        body: String(message),
        telnyxApiKey: smsCreds.apiKey,
        telnyxPhone: smsCreds.phone,
      })
      return NextResponse.json({ success: true })
    } catch (smsErr) {
      const msg = smsErr instanceof Error ? smsErr.message : String(smsErr)
      return NextResponse.json({ success: false, error: msg }, { status: 502 })
    }
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('sms/send error:', err)
    return NextResponse.json({ error: 'SMS send failed' }, { status: 500 })
  }
}
