import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200)

  let query = supabaseAdmin
    .from('security_events')
    .select('*, tenants(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  let auditQuery = supabaseAdmin
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tenantId) auditQuery = auditQuery.eq('tenant_id', tenantId)

  const { data: auditEvents } = await auditQuery

  return NextResponse.json({
    securityEvents: data || [],
    auditLog: auditEvents || [],
  })
}
