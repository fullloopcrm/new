import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

// GET /api/admin/tenant-chats/alerts?since=<ISO>
//   Polled by the platform admin's top-drop live-alert popup (mirrors
//   /api/admin/comhub/alerts, which does the same thing for one tenant's own
//   customer messages). This one is deliberately cross-tenant — a platform
//   admin needs to hear about ANY tenant owner messaging Full Loop support
//   via Loop Connect, not just the tenant currently in view.
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const since = req.nextUrl.searchParams.get('since')
  if (!since) return NextResponse.json({ error: 'since is required' }, { status: 400 })

  const serverTime = new Date().toISOString()

  const { data: messages, error } = await supabaseAdmin
    .from('tenant_owner_messages') // tenant-scope-ok: deliberately cross-tenant, see file header — requireAdmin()-gated
    .select('id, tenant_id, body, body_en, sender, created_at')
    .eq('direction', 'in')
    .eq('channel', 'platform')
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!messages || messages.length === 0) {
    return NextResponse.json({ alerts: [], server_time: serverTime })
  }

  const tenantIds = Array.from(new Set(messages.map(m => m.tenant_id)))
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .in('id', tenantIds)
  const tenantNameById = Object.fromEntries((tenants || []).map(t => [t.id, t.name]))

  const alerts = messages.map(m => ({
    message_id: m.id,
    tenant_id: m.tenant_id,
    tenant_name: tenantNameById[m.tenant_id] || 'Unknown tenant',
    body: m.body_en || m.body,
    sent_at: m.created_at,
  }))

  return NextResponse.json({ alerts, server_time: serverTime })
}
