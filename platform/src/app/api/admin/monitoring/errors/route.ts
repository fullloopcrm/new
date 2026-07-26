/**
 * Platform error/security log — admin-scoped, cross-tenant by design (this is
 * the review surface for src/lib/error-tracking.ts's error_logs writes, which
 * include the auth-failure logging added across every login surface).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

const PAGE_SIZE = 50

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')
  const severity = searchParams.get('severity')
  const route = searchParams.get('route')
  const resolvedParam = searchParams.get('resolved') // 'true' | 'false' | null (=all)
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0)

  let query = supabaseAdmin
    .from('error_logs') // tenant-scope-ok: platform super-admin surface (cross-tenant by design)
    .select('id, severity, message, route, action, tenant_id, metadata, resolved, resolved_at, resolved_by, resolution_notes, dismissed_at, dismissed_by, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (severity) query = query.eq('severity', severity)
  if (route) query = query.eq('route', route)
  if (resolvedParam === 'true') query = query.eq('resolved', true)
  if (resolvedParam === 'false') query = query.or('resolved.is.null,resolved.eq.false')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tenantIds = Array.from(new Set((data || []).map(r => r.tenant_id).filter(Boolean)))
  const tenantNames: Record<string, string> = {}
  if (tenantIds.length > 0) {
    // tenant-scope-ok: resolving display names for the cross-tenant admin list above
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name').in('id', tenantIds)
    for (const t of tenants || []) tenantNames[t.id as string] = t.name as string
  }

  return NextResponse.json({
    logs: (data || []).map(r => ({ ...r, tenant_name: r.tenant_id ? tenantNames[r.tenant_id as string] || null : null })),
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  })
}

export async function PATCH(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const { id, action, notes } = body
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  if (action !== 'resolve' && action !== 'dismiss' && action !== 'reopen') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> =
    action === 'resolve'
      ? { resolved: true, resolved_at: now, resolved_by: 'admin', resolution_notes: notes || null }
      : action === 'dismiss'
        ? { dismissed_at: now, dismissed_by: 'admin' }
        : { resolved: false, resolved_at: null, resolved_by: null, dismissed_at: null, dismissed_by: null }

  const { data, error } = await supabaseAdmin.from('error_logs') // tenant-scope-ok: platform super-admin surface (cross-tenant by design)
    .update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ log: data })
}
