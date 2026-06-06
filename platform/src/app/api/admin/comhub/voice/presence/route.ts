import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { getActiveAdminMemberId } from '@/lib/admin-member'
import { supabaseAdmin } from '@/lib/supabase'

type PresenceStatus = 'available' | 'busy' | 'away' | 'offline'
const VALID_STATUSES: PresenceStatus[] = ['available', 'busy', 'away', 'offline']

// POST /api/admin/comhub/voice/presence — softphone heartbeat / register.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const adminId = await getActiveAdminMemberId(tenantId)
  if (!adminId) return NextResponse.json({ error: 'no tenant member found' }, { status: 412 })

  const body = (await req.json().catch(() => null)) as {
    status?: string
    sip_username?: string
    sip_address?: string
    device_label?: string
    user_agent?: string
  } | null

  if (!body || !body.sip_username) {
    return NextResponse.json({ error: 'sip_username required' }, { status: 400 })
  }
  const status: PresenceStatus =
    body.status && (VALID_STATUSES as string[]).includes(body.status)
      ? (body.status as PresenceStatus)
      : 'available'

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('comhub_admin_presence').upsert(
    {
      tenant_id: tenantId,
      admin_id: adminId,
      sip_username: body.sip_username,
      sip_address: body.sip_address ?? `sip:${body.sip_username}@sip.telnyx.com`,
      device_label: body.device_label ?? null,
      status,
      last_seen_at: now,
      registered_at: now,
      user_agent: body.user_agent ?? req.headers.get('user-agent') ?? null,
    },
    { onConflict: 'admin_id', ignoreDuplicates: false },
  )

  if (error) return NextResponse.json({ error: 'presence write failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, admin_id: adminId, status, last_seen_at: now })
}

// GET /api/admin/comhub/voice/presence — currently-online admins for tenant.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('comhub_admin_presence')
    .select('admin_id, sip_username, sip_address, device_label, status, last_seen_at')
    .eq('tenant_id', tenantId)
    .gte('last_seen_at', cutoff)
    .neq('status', 'offline')
    .order('last_seen_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presence: data ?? [] })
}

// DELETE — explicit unregister.
export async function DELETE() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const adminId = await getActiveAdminMemberId(tenantId)
  if (!adminId) return NextResponse.json({ ok: true })

  await supabaseAdmin
    .from('comhub_admin_presence')
    .update({ status: 'offline', last_seen_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('admin_id', adminId)
  return NextResponse.json({ ok: true })
}
