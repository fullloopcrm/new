import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  let tenant
  try {
    ({ tenant } = await getTenantForRequest())
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
