import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Step 1: Show confirmation page (link from email)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('id')
  const tenantId = searchParams.get('tenant')

  if (!clientId) {
    return NextResponse.json({ error: 'Missing client ID' }, { status: 400 })
  }

  return NextResponse.redirect(new URL(`/unsubscribe?id=${clientId}&tenant=${tenantId || ''}`, request.url))
}

// Step 2: Actually opt out (called when user confirms)
export async function POST(request: Request) {
  const { client_id, tenant_id, channel } = await request.json()

  if (!client_id) {
    return NextResponse.json({ error: 'Missing client ID' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (channel === 'sms') {
    updates.sms_marketing_opt_out = true
    updates.sms_marketing_opted_out_at = new Date().toISOString()
  } else {
    updates.email_marketing_opt_out = true
    updates.email_marketing_opted_out_at = new Date().toISOString()
  }

  let query = supabaseAdmin.from('clients').update(updates).eq('id', client_id)
  if (tenant_id) query = query.eq('tenant_id', tenant_id)

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }

  // Log the opt-out
  await supabaseAdmin
    .from('marketing_opt_out_log')
    .insert({
      client_id,
      tenant_id: tenant_id || null,
      channel: channel === 'sms' ? 'sms' : 'email',
      method: channel === 'sms' ? 'sms_stop' : 'email_link',
    })
    .then(() => {}, () => {})

  return NextResponse.json({ ok: true })
}
