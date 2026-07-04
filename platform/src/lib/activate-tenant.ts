/**
 * Tenant activation — the single, idempotent run behind the "Activate" button.
 *
 * Takes an existing tenant row and drives it to a fully independent, operational
 * business: seeds all settings, the onboarding checklist, and an owner login,
 * then runs the onboarding gate as a real smoke test of the lead→review spine.
 * Only flips status to 'active' when the spine actually passes — never on faith.
 *
 * Idempotent by construction: every step no-ops if its work already exists, so
 * the button is safe to hit repeatedly. This is the ONE path every creation
 * door should ultimately funnel through so "independent tenant always" holds
 * regardless of how the tenant was born.
 */
import { supabaseAdmin } from './supabase'
import { provisionTenant } from './provision-tenant'
import { seedOnboardingTasks } from './onboarding-tasks'
import { runOnboardingGate, type GateResult } from './onboarding-gate'
import { registerCarryingDomain, registerCustomDomain, type CustomDomainResult } from './vercel-domains'
import { hashAdminPin } from './admin-pin'
import crypto from 'crypto'

export type StepStatus = 'done' | 'skipped' | 'action_needed' | 'failed'

export interface ActivationStep {
  key: string
  label: string
  status: StepStatus
  detail?: string
}

export interface ActivationResult {
  ok: boolean
  /** True only when status was (or already is) 'active'. */
  activated: boolean
  /** Gate passed AND an owner login exists — the bar for "live". */
  ready: boolean
  steps: ActivationStep[]
  /** Plaintext owner PIN, returned ONCE if this run created the owner login. */
  ownerPin?: string | null
  /** Custom-domain registration result incl. the DNS records the tenant sets. */
  customDomain?: CustomDomainResult
  gate: GateResult
}

export async function activateTenant(tenantId: string): Promise<ActivationResult> {
  const steps: ActivationStep[] = []
  let ownerPin: string | null = null

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, status, owner_email, owner_name, domain, domain_name')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    return {
      ok: false,
      activated: false,
      ready: false,
      steps: [{ key: 'identity', label: 'Business identity', status: 'failed', detail: 'Tenant not found' }],
      gate: { tenantId, passed: false, stages: [] },
    }
  }

  // 1. Identity — the tenant row exists, which is the namespace everything else
  // is walled inside. Always present by the time we get here.
  steps.push({
    key: 'identity',
    label: 'Business identity',
    status: 'done',
    detail: `${tenant.name} · ${tenant.slug} · ${tenant.industry || 'general'}`,
  })

  // 2. Settings — services, Selena config, hours, payment methods, guidelines.
  try {
    const prov = await provisionTenant({ tenantId, industry: tenant.industry || undefined })
    const seededCount = Object.values(prov.seeded).filter(Boolean).length
    steps.push({
      key: 'settings',
      label: 'Global settings applied',
      status: 'done',
      detail: seededCount > 0
        ? `Seeded ${seededCount} setting group(s); ${prov.skipped.length} already set`
        : 'All settings already applied',
    })
  } catch (e) {
    steps.push({ key: 'settings', label: 'Global settings applied', status: 'failed', detail: msg(e) })
  }

  let customDomain: CustomDomainResult | undefined

  // 3. Onboarding checklist.
  try {
    await seedOnboardingTasks(tenantId)
    const { count } = await supabaseAdmin
      .from('onboarding_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    steps.push({
      key: 'onboarding_tasks',
      label: 'Onboarding checklist seeded',
      status: 'done',
      detail: `${count ?? 0} task(s)`,
    })
  } catch (e) {
    steps.push({ key: 'onboarding_tasks', label: 'Onboarding checklist seeded', status: 'failed', detail: msg(e) })
  }

  // 5. Owner login — idempotent: create an owner member with a PIN only if none
  // exists. Requires an owner_email/name to attach to; otherwise it's an action
  // the operator must take before the tenant can be logged into.
  try {
    const { data: existingOwner } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .maybeSingle()

    if (existingOwner) {
      steps.push({ key: 'owner_login', label: 'Owner login', status: 'done', detail: 'Owner member exists' })
    } else if (tenant.owner_email || tenant.owner_name) {
      ownerPin = String(crypto.randomInt(100000, 1000000))
      const { error: memErr } = await supabaseAdmin.from('tenant_members').insert({
        tenant_id: tenantId,
        email: tenant.owner_email || null,
        name: tenant.owner_name || tenant.name || 'Owner',
        role: 'owner',
        pin_hash: hashAdminPin(ownerPin),
        pin_set_at: new Date().toISOString(),
      })
      if (memErr) {
        ownerPin = null
        steps.push({ key: 'owner_login', label: 'Owner login', status: 'failed', detail: memErr.message })
      } else {
        steps.push({ key: 'owner_login', label: 'Owner login', status: 'done', detail: 'Owner created — PIN issued once' })
      }
    } else {
      steps.push({
        key: 'owner_login',
        label: 'Owner login',
        status: 'action_needed',
        detail: 'Set an owner email, then re-activate to create the login',
      })
    }
  } catch (e) {
    steps.push({ key: 'owner_login', label: 'Owner login', status: 'failed', detail: msg(e) })
  }

  // 6. Smoke test — run the onboarding gate over the lead→review spine.
  const gate = await runOnboardingGate(tenantId)
  for (const stage of gate.stages) {
    steps.push({
      key: `gate_${stage.stage}`,
      label: `Spine · ${stage.stage}`,
      status: stage.ok ? 'done' : 'action_needed',
      detail: stage.detail,
    })
  }

  // 7. Domains LAST — external Vercel API calls are the slowest part and must
  // never block the essential DB provisioning above. If they're slow or fail,
  // the tenant is still fully provisioned; domains just show action_needed.
  const carry = await registerCarryingDomain(tenant.slug)
  steps.push({
    key: 'carrying_domain',
    label: 'Live site domain',
    status: carry.ok ? 'done' : carry.status === 'skipped' ? 'action_needed' : 'failed',
    detail: carry.status === 'skipped'
      ? `${carry.domain} — Vercel env not configured`
      : `${carry.domain} (${carry.status})`,
  })

  const rawCustom = (tenant.domain as string | null) || (tenant.domain_name as string | null)
  if (rawCustom && rawCustom.trim()) {
    customDomain = await registerCustomDomain(rawCustom)
    steps.push({
      key: 'custom_domain',
      label: 'Custom domain',
      status: customDomain.verified
        ? 'done'
        : customDomain.status === 'error'
          ? 'failed'
          : 'action_needed',
      detail: customDomain.status === 'skipped'
        ? `${customDomain.domain} — Vercel env not configured`
        : customDomain.verified
          ? `${customDomain.domain} verified`
          : `${customDomain.domain} — set DNS, then verify`,
    })
  }

  const ownerOk = steps.find((s) => s.key === 'owner_login')?.status === 'done'
  const ready = gate.passed && ownerOk

  // Flip to active only when the spine passes and there's an owner login. Never
  // mark a tenant live on faith.
  let activated = tenant.status === 'active'
  if (ready && tenant.status !== 'active') {
    const { error: upErr } = await supabaseAdmin
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', tenantId)
    if (!upErr) activated = true
  }

  return { ok: true, activated, ready, steps, ownerPin, customDomain, gate }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unexpected error'
}
