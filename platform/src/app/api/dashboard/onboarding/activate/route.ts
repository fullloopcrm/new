/**
 * Go live. Flips the tenant pending → active, but ONLY when it's actually ready
 * (every onboarding task done/skipped AND the onboarding gate passes). Going
 * 'active' turns on client-facing crons (reminders, review follow-ups), so this
 * is an explicit, gated action — never an automatic flip.
 *
 * POST → { activated: true } | 400 with blockers
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { checkActivationReadiness } from '@/lib/onboarding-tasks'
import { registerCarryingDomain } from '@/lib/vercel-domains'

export async function POST() {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('settings.edit')
    if (authError) return authError
    const { tenantId } = authTenant

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
      .select('id, name, status, slug')
      .single()
    if (error || !tenant) return NextResponse.json({ error: 'Activation failed' }, { status: 500 })

    // Platform record that a tenant went live (visible to Jefe / admin).
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'tenant_activated',
      title: 'Tenant went live',
      message: `${tenant.name} completed onboarding and is now active.`,
    }).then(() => {}, () => {})

    // Auto-register the carrying domain (<slug>.fullloopcrm.com) as a Vercel
    // PROJECT domain so it auto-follows prod deploys and never strands. Does not
    // block activation — a failure just surfaces a notification to fix manually.
    const domainResult = await registerCarryingDomain(tenant.slug)
    if (!domainResult.ok && domainResult.status !== 'skipped') {
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'carrying_domain_failed',
        title: 'Carrying domain not auto-registered',
        message: `${domainResult.domain}: ${domainResult.detail ?? 'error'} — add it manually in Vercel.`,
      }).then(() => {}, () => {})
    }

    return NextResponse.json({ activated: true, tenant, domain: domainResult })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/dashboard/onboarding/activate', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
