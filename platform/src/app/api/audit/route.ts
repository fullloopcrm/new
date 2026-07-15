import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('audit.view')
  if (authError) return authError

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
