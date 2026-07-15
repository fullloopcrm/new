import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open,acknowledged'

  const { data, error } = await tenantDb(ctx.tenantId)
    .from('schedule_issues')
    .select('*')
    .in('status', status.split(','))
    .order('severity', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PUT(request: Request) {
  const { tenant: ctx, error: authError } = await requirePermission('schedules.edit')
  if (authError) return authError

  const { id, status, resolution_note } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const update: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'dismissed') {
    update.resolved_at = new Date().toISOString()
    update.resolved_by = 'admin'
    if (resolution_note) update.resolution_note = resolution_note
  }

  const { data, error } = await tenantDb(ctx.tenantId)
    .from('schedule_issues')
    .update(update)
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
