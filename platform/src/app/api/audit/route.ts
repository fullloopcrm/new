import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: NextRequest) {
  // audit_logs is gated behind 'audit.view' (owner/admin only, per rbac.ts)
  // everywhere else it's exposed (e.g. /api/finance/audit-log). This route
  // only checked for ANY valid tenant session via bare getTenantForRequest(),
  // so a 'staff' or 'manager' team member — neither of which has audit.view
  // — could read the full tenant audit log. Same gap fixed the same pass in
  // the sibling /api/security/events route.
  const { tenant, error: permError } = await requirePermission('audit.view')
  if (permError) return permError

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 200)
  const offset = Number(request.nextUrl.searchParams.get('offset')) || 0
  const entityType = request.nextUrl.searchParams.get('entity_type')

  let query = tenantDb(tenant.tenantId)
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (entityType) query = query.eq('entity_type', entityType)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data, total: count })
}
