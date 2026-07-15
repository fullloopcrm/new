import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: Request) {
  const { tenant, error: authError } = await requirePermission('audit.view')
  if (authError) return authError

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

  const { data: events } = await supabaseAdmin
    .from('security_events')
    .select('*')
    .eq('tenant_id', tenant.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ events: events || [] })
}
