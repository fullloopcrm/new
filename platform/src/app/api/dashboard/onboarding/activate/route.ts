/**
 * Go live. Flips the tenant pending → active, but ONLY when it's actually ready
 * (every onboarding task done/skipped AND the onboarding gate passes). Going
 * 'active' turns on client-facing crons (reminders, review follow-ups), so this
 * is an explicit, gated action — never an automatic flip.
 *
 * POST → { activated: true } | 400 with blockers
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { checkActivationReadiness } from '@/lib/onboarding-tasks'

export async function POST() {
  try {
    const { tenantId } = await getTenantForRequest()

    const readiness = await checkActivationReadiness(tenantId)
    if (!readiness.ready) {
      return NextResponse.json(
        {
          error: 'Not ready to go live',
          tasksRemaining: readiness.tasksRemaining,
          blockers: readiness.gateBlockers,
        },
        { status: 400 },
      )
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', tenantId)
      .select('id, name, status')
      .single()
    if (error || !tenant) return NextResponse.json({ error: 'Activation failed' }, { status: 500 })

    // Platform record that a tenant went live (visible to Jefe / admin).
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'tenant_activated',
      title: 'Tenant went live',
      message: `${tenant.name} completed onboarding and is now active.`,
    }).then(() => {}, () => {})

    return NextResponse.json({ activated: true, tenant })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/dashboard/onboarding/activate', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
