import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  let tenant
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('audit.view')
    if (authError) return authError
    tenant = authTenant.tenant
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

  const { data: events } = await supabaseAdmin
    .from('security_events')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ events: events || [] })
}
