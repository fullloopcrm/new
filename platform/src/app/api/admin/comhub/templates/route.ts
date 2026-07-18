import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { capString } from '@/lib/validate'

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
// name/body/channel/hotkey were stored raw with no type/length cap — a
// non-string name (e.g. a number) would throw an uncaught TypeError on
// `payload.name.trim()` (the truthy-only `!payload?.name` check does not
// catch it), same crash class as admin/comhub/yinez/send's `.body.trim()`.
// capString truncates rather than rejects and coerces non-string/empty to
// null, which the existing "name and body required" check now rejects
// closed instead of crashing.
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
  const name = capString(payload?.name, 200)
  const body = capString(payload?.body, 5000)
  if (!name || !body) {
    return NextResponse.json({ error: 'name and body required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('comhub_templates')
    .insert({
      tenant_id: tenantId,
      name,
      body,
      channel: capString(payload?.channel, 20),
      hotkey: capString(payload?.hotkey, 20),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
