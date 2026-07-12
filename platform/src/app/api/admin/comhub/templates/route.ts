import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// GET /api/admin/comhub/templates?channel=sms|email|all
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const ch = new URL(req.url).searchParams.get('channel') || 'all'
  let q = supabaseAdmin
    .from('comhub_templates')
    .select('id, name, body, channel, hotkey, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('name', { ascending: true })
  if (ch !== 'all') q = q.or(`channel.eq.${sanitizePostgrestValue(ch)},channel.is.null`)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data || [] })
}

// POST /api/admin/comhub/templates  { name, body, channel?, hotkey? }
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const payload = await req.json().catch(() => null) as {
    name?: string
    body?: string
    channel?: string | null
    hotkey?: string | null
  } | null
  if (!payload?.name || !payload?.body) {
    return NextResponse.json({ error: 'name and body required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('comhub_templates')
    .insert({
      tenant_id: tenantId,
      name: payload.name.trim(),
      body: payload.body,
      channel: payload.channel || null,
      hotkey: payload.hotkey || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
