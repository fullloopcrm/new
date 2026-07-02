import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

// Cross-tenant activity log. Reads audit_logs across ALL tenants (super-admin
// view). Tenant-scoped operators use /api/audit + /dashboard/activity instead.
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 200)
  const offset = Number(url.searchParams.get('offset')) || 0
  const tenantId = url.searchParams.get('tenant_id')
  const action = url.searchParams.get('action')
  const entityType = url.searchParams.get('entity_type')
  const q = url.searchParams.get('q')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*, tenants(name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (action) query = query.eq('action', action)
  if (entityType) query = query.eq('entity_type', entityType)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (q) query = query.or(`entity_id.ilike.%${q}%,user_id.ilike.%${q}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data || [], total: count || 0 })
}
