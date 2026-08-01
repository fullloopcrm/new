import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

export async function GET(request: Request) {
  // security_events carries admin impersonation history, invite/token
  // actions, and settings-change events — the same sensitivity class as
  // audit_logs, which is gated behind the 'audit.view' permission
  // (owner/admin only; manager/staff do not have it, per rbac.ts). This
  // route previously only checked for ANY valid tenant session via bare
  // getTenantForRequest(), so a 'staff' or 'manager' team member could read
  // the full security event feed despite lacking audit.view. Matches the
  // sibling /api/finance/audit-log route's requirePermission pattern.
  const { tenant, error } = await requirePermission('audit.view')
  if (error) return error

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

  const { data: events } = await tenantDb(tenant.tenantId)
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ events: events || [] })
}
