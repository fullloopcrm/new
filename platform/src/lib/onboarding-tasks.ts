/**
 * Onboarding tasks — the setup checklist a newly-sold tenant works through
 * before going live. Seeds when the tenant is created (createTenantFromLead),
 * is surfaced to the owner/admin, and gates activation together with
 * runOnboardingGate (which verifies the lead→review spine is actually wired).
 *
 * Backed by the onboarding_tasks table (migration 037).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { runOnboardingGate } from '@/lib/onboarding-gate'

export type OnboardingTaskType =
  | 'create_stripe'
  | 'create_telnyx'
  | 'create_resend'
  | 'create_google_business'
  | 'configure_dns'
  | 'verify_10dlc'

export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'skipped'

/** The default checklist seeded for every new tenant, in the order it's worked. */
export const DEFAULT_ONBOARDING_TASKS: Array<{ type: OnboardingTaskType; label: string }> = [
  { type: 'create_stripe', label: 'Connect Stripe (take payments)' },
  { type: 'create_telnyx', label: 'Provision phone / SMS (Telnyx)' },
  { type: 'create_resend', label: 'Set up sending email (Resend domain)' },
  { type: 'configure_dns', label: 'Point the domain (DNS)' },
  { type: 'verify_10dlc', label: 'Register 10DLC (SMS compliance)' },
  { type: 'create_google_business', label: 'Link Google Business (reviews)' },
]

/**
 * Seed the default checklist for a tenant. Idempotent — no-ops if the tenant
 * already has any onboarding tasks. Best-effort: a seeding failure must never
 * orphan a freshly-created tenant, so callers should not let it throw.
 */
export async function seedOnboardingTasks(tenantId: string): Promise<void> {
  const { count } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if ((count ?? 0) > 0) return

  const rows = DEFAULT_ONBOARDING_TASKS.map(t => ({
    tenant_id: tenantId,
    task_type: t.type,
    status: 'pending' as OnboardingTaskStatus,
    notes: t.label,
    requested_by_tenant: true,
  }))
  const { error } = await supabaseAdmin.from('onboarding_tasks').insert(rows)
  if (error) console.error('[onboarding-tasks] seed failed:', error)
}

export interface ActivationReadiness {
  ready: boolean
  tasksRemaining: number
  gatePassed: boolean
  gateBlockers: string[]
}

/**
 * Is a tenant ready to go live? Ready = every onboarding task is completed or
 * skipped AND runOnboardingGate passes (spine actually wired). Read-only.
 */
export async function checkActivationReadiness(tenantId: string): Promise<ActivationReadiness> {
  const { data: tasks } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('status')
    .eq('tenant_id', tenantId)

  const remaining = (tasks ?? []).filter(t => !['completed', 'skipped'].includes(t.status as string)).length
  const gate = await runOnboardingGate(tenantId)
  const blockers = gate.stages.filter(s => !s.ok).map(s => `${s.stage}: ${s.detail}`)

  return {
    ready: remaining === 0 && gate.passed,
    tasksRemaining: remaining,
    gatePassed: gate.passed,
    gateBlockers: blockers,
  }
}
