import { NextResponse } from 'next/server'
import { getTenantForRequest } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { tenant } = await getTenantForRequest()

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
