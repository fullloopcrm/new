import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: NextRequest) {
  let tenant
  try {
    tenant = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 200)
  const offset = Number(request.nextUrl.searchParams.get('offset')) || 0
  const entityType = request.nextUrl.searchParams.get('entity_type')

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (entityType) query = query.eq('entity_type', entityType)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data, total: count })
}
