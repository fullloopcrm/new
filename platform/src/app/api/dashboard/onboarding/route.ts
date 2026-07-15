/**
 * Owner-facing onboarding: the setup checklist + go-live readiness.
 *
 * GET   → { tasks, readiness }
 * PATCH → { task_id, status } — update one task; returns fresh readiness.
 *
 * Activation (flipping the tenant live) is a separate, explicit action —
 * see ./activate — because going 'active' turns on client-facing crons.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { checkActivationReadiness, type OnboardingTaskStatus } from '@/lib/onboarding-tasks'

const VALID: OnboardingTaskStatus[] = ['pending', 'in_progress', 'blocked', 'completed', 'skipped']

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('settings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { data: tasks } = await tenantDb(tenantId)
      .from('onboarding_tasks')
      .select('id, task_type, status, notes, completed_at')
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
    const { task_id, status } = (await request.json().catch(() => ({}))) as {
      task_id?: string
      status?: OnboardingTaskStatus
    }
    if (!task_id || !status || !VALID.includes(status)) {
      return NextResponse.json({ error: 'task_id and a valid status are required' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { status }
    if (status === 'completed') patch.completed_at = new Date().toISOString()

    const { data: task, error } = await tenantDb(tenantId)
      .from('onboarding_tasks')
      .update(patch)
      .eq('id', task_id)
      .select('id, task_type, status, notes, completed_at')
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
