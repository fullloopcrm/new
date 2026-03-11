import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/admin/errors — Error dashboard for admin
 * Shows recent errors, failed notifications, and tenant health issues
 *
 * Query params:
 *   hours=24 (default) — how far back to look
 *   severity=high — filter by severity
 *   tenantId=xxx — filter by tenant
 *   resolved=false — show unresolved only (default)
 */
export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = new URL(request.url)
  const hours = parseInt(url.searchParams.get('hours') || '24')
  const severity = url.searchParams.get('severity')
  const tenantId = url.searchParams.get('tenantId')
  const showResolved = url.searchParams.get('resolved') === 'true'

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // 1. Error logs
  let errorQuery = supabaseAdmin
    .from('error_logs')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!showResolved) errorQuery = errorQuery.eq('resolved', false)
  if (severity) errorQuery = errorQuery.eq('severity', severity)
  if (tenantId) errorQuery = errorQuery.eq('tenant_id', tenantId)

  const { data: errors } = await errorQuery

  // 2. Failed notifications (still pending retry)
  let failedQuery = supabaseAdmin
    .from('notifications')
    .select('id, tenant_id, type, title, message, channel, retry_count, created_at, metadata')
    .eq('status', 'failed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tenantId) failedQuery = failedQuery.eq('tenant_id', tenantId)

  const { data: failedNotifications } = await failedQuery

  // 3. Summary counts
  const { count: totalErrors } = await supabaseAdmin
    .from('error_logs')
    .select('id', { count: 'exact', head: true })
    .eq('resolved', false)

  const { count: totalFailed } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')

  const { count: retriedSuccess } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'retry_success')
    .gte('created_at', since)

  // 4. Error breakdown by source
  const errorsBySource: Record<string, number> = {}
  for (const err of errors || []) {
    const src = err.route || err.action || 'unknown'
    errorsBySource[src] = (errorsBySource[src] || 0) + 1
  }

  // 5. Tenant health — which tenants have the most errors
  const errorsByTenant: Record<string, number> = {}
  for (const err of errors || []) {
    if (err.tenant_id) {
      errorsByTenant[err.tenant_id] = (errorsByTenant[err.tenant_id] || 0) + 1
    }
  }

  return NextResponse.json({
    summary: {
      unresolvedErrors: totalErrors || 0,
      failedNotifications: totalFailed || 0,
      retriedSuccessfully: retriedSuccess || 0,
      timeRange: `${hours}h`,
    },
    errors: errors || [],
    failedNotifications: failedNotifications || [],
    errorsBySource,
    errorsByTenant,
  })
}

/**
 * PATCH /api/admin/errors — Resolve an error
 * Body: { errorId: string, notes?: string }
 */
export async function PATCH(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { errorId, notes } = await request.json()

  if (!errorId) {
    return NextResponse.json({ error: 'errorId required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('error_logs')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes || null,
    })
    .eq('id', errorId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
