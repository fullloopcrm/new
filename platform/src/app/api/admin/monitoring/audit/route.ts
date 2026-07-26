/**
 * Platform admin-actions log — read-only, admin-scoped, cross-tenant by design.
 * Surfaces audit_logs (already written by every audit() call) so the global
 * admin can review sensitive actions without waiting for a Telegram ping to
 * scroll by. See src/lib/audit.ts SENSITIVE_AUDIT_ACTIONS for what also
 * triggers a real-time alert; this endpoint returns those plus, optionally,
 * everything else for full-history browsing.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

const PAGE_SIZE = 50

// Kept in sync with src/lib/audit.ts's SENSITIVE_AUDIT_ACTIONS by hand — small,
// stable list; not worth a shared-module import just to avoid duplication here.
const SENSITIVE_ACTIONS = [
  'permissions.updated',
  'client.deleted',
  'client.gdpr_deletion_requested',
  'client.gdpr_deletion_purged',
  'client.data_exported',
  'team.deleted',
  'campaign.sent',
]

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')
  const action = searchParams.get('action')
  const sensitiveOnly = searchParams.get('sensitive_only') !== 'false' // default true
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0)

  let query = supabaseAdmin
    .from('audit_logs') // tenant-scope-ok: platform super-admin surface (cross-tenant by design)
    .select('id, tenant_id, action, entity_type, entity_id, user_id, details, ip_address, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (action) query = query.eq('action', action)
  else if (sensitiveOnly) query = query.in('action', SENSITIVE_ACTIONS)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tenantIds = Array.from(new Set((data || []).map(r => r.tenant_id).filter(Boolean)))
  const tenantNames: Record<string, string> = {}
  if (tenantIds.length > 0) {
    // tenant-scope-ok: resolving display names for the cross-tenant admin list above
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name').in('id', tenantIds)
    for (const t of tenants || []) tenantNames[t.id as string] = t.name as string
  }

  return NextResponse.json({
    logs: (data || []).map(r => ({ ...r, tenant_name: r.tenant_id ? tenantNames[r.tenant_id as string] || null : null })),
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
    sensitiveActions: SENSITIVE_ACTIONS,
  })
}
