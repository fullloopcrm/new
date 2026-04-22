import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

/**
 * Unsubscribe requires a signed token. Without it, any caller could opt out
 * any client by guessing UUIDs.
 *
 * GET  /api/unsubscribe?t=<token>       → redirects to /unsubscribe page
 * POST /api/unsubscribe { t: <token> }  → performs opt-out
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')
  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }
  return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(token || '')}`, request.url))
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { t?: string }
  const payload = verifyUnsubscribeToken(body.t)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }
  const { clientId, tenantId, channel } = payload

  const updates: Record<string, unknown> = {}
  if (channel === 'sms') {
    updates.sms_marketing_opt_out = true
    updates.sms_marketing_opted_out_at = new Date().toISOString()
  } else {
    updates.email_marketing_opt_out = true
    updates.email_marketing_opted_out_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  if (error) {
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }

  await supabaseAdmin
    .from('marketing_opt_out_log')
    .insert({
      client_id: clientId,
      tenant_id: tenantId,
      channel,
      method: channel === 'sms' ? 'sms_stop' : 'email_link',
    })
    .then(() => {}, () => {})

  return NextResponse.json({ ok: true })
}
