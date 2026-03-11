import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id')
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status') || ''
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('clients')
    .select('*, tenants(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Stats
  let statsQuery = supabaseAdmin.from('clients').select('status', { count: 'exact' })
  if (tenantId) statsQuery = statsQuery.eq('tenant_id', tenantId)
  const { data: allClients } = await statsQuery

  const stats = {
    total: allClients?.length || 0,
    active: allClients?.filter(c => c.status === 'active').length || 0,
    inactive: allClients?.filter(c => c.status === 'inactive').length || 0,
  }

  return NextResponse.json({ clients: data, total: count, stats })
}
