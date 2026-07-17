/**
 * Owner-facing onboarding: the setup checklist + go-live readiness.
 *
 * GET   → { tasks, readiness }
 * PATCH → { task_id, status, blocked_reason? } — update one task; returns
 *          fresh readiness. blocked_reason is only persisted when
 *          status:'blocked' and is cleared on any other transition.
 *
 * Activation (flipping the tenant live) is a separate, explicit action —
 * see ./activate — because going 'active' turns on client-facing crons.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { checkActivationReadiness, type OnboardingTaskStatus } from '@/lib/onboarding-tasks'

const VALID: OnboardingTaskStatus[] = ['pending', 'in_progress', 'blocked', 'completed', 'skipped']

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data: tasks } = await supabaseAdmin
      .from('onboarding_tasks')
      .select('id, task_type, status, notes, completed_at, blocked_reason')
      .eq('tenant_id', tenantId)
      .order('created_at')
    const readiness = await checkActivationReadiness(tenantId)
    return NextResponse.json({ tasks: tasks ?? [], readiness })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dashboard/onboarding', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('settings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { task_id, status, blocked_reason } = (await request.json().catch(() => ({}))) as {
      task_id?: string
      status?: OnboardingTaskStatus
      blocked_reason?: string
    }
    if (!task_id || !status || !VALID.includes(status)) {
      return NextResponse.json({ error: 'task_id and a valid status are required' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { status }
    if (status === 'completed') patch.completed_at = new Date().toISOString()
    // A blocked_reason only describes the CURRENT block — any transition away
    // from 'blocked' must clear it, or a stale reason from a resolved block
    // would keep showing next to a task that isn't blocked anymore.
    patch.blocked_reason = status === 'blocked' ? (blocked_reason || null) : null

    const { data: task, error } = await supabaseAdmin
      .from('onboarding_tasks')
      .update(patch)
      .eq('tenant_id', tenantId)
      .eq('id', task_id)
      .select('id, task_type, status, notes, completed_at, blocked_reason')
      .single()
    if (error || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const readiness = await checkActivationReadiness(tenantId)
    return NextResponse.json({ task, readiness })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/dashboard/onboarding', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
