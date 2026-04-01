import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

export async function GET(request: Request) {
  const ctx = await getTenantForRequest()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open,acknowledged'

  const { data, error } = await supabaseAdmin
    .from('schedule_issues')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .in('status', status.split(','))
    .order('severity', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PUT(request: Request) {
  const ctx = await getTenantForRequest()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, resolution_note } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const update: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'dismissed') {
    update.resolved_at = new Date().toISOString()
    update.resolved_by = 'admin'
    if (resolution_note) update.resolution_note = resolution_note
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_issues')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
