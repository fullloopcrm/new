import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

export async function GET(request: Request) {
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
