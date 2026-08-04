import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isRecipientFilter, isChannel } from '@/lib/company-campaigns'

// GET /api/admin/company/campaigns
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('platform_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data || [] })
}

// POST /api/admin/company/campaigns  { name, subject, body, recipient_filter? }
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const payload = await req.json().catch(() => null) as {
    name?: string
    subject?: string
    body?: string
    sms_body?: string
    recipient_filter?: string
    channel?: string
  } | null

  const name = payload?.name?.trim()
  const subject = payload?.subject?.trim()
  const body = payload?.body?.trim()
  const channel = payload?.channel && isChannel(payload.channel) ? payload.channel : 'email'
  const sms_body = payload?.sms_body?.trim() || null

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if ((channel === 'email' || channel === 'both') && (!subject || !body)) {
    return NextResponse.json({ error: 'subject and body required for email' }, { status: 400 })
  }
  if ((channel === 'sms' || channel === 'both') && !sms_body) {
    return NextResponse.json({ error: 'sms_body required for SMS' }, { status: 400 })
  }
  const recipient_filter = payload?.recipient_filter && isRecipientFilter(payload.recipient_filter)
    ? payload.recipient_filter : 'all_tenants'

  const { data, error } = await supabaseAdmin
    .from('platform_campaigns')
    .insert({ name, subject: subject || '', body: body || '', sms_body, channel, recipient_filter, status: 'draft' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data })
}
