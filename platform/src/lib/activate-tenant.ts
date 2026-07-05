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
import { resolveCoverage } from './geo/coverage'
import { hashAdminPin } from './admin-pin'
import crypto from 'crypto'

// Default contact used when a tenant is created name-only (common for process
// testing). Owner login + founding team member fall back to this so a bare
// tenant can be driven all the way to active from one click.
const DEFAULT_OWNER_EMAIL = 'fullloopcrm@gmail.com'

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

// TEMP diagnostic: drop a breadcrumb row at each phase boundary so a hard-killed
// activation still leaves a trail in the DB showing exactly where it stopped.
// Best-effort, independent inserts (no transaction) so committed crumbs survive.
async function crumb(tenantId: string, phase: string): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'activation_debug',
      title: 'activation phase',
      message: phase,
    })
  } catch {
    /* never block activation on a breadcrumb */
  }
}

export async function activateTenant(tenantId: string): Promise<ActivationResult> {
  const steps: ActivationStep[] = []
  let ownerPin: string | null = null
  await crumb(tenantId, 'start')

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, status, owner_email, owner_name, domain, domain_name, address, service_area_lat, service_area_lng, service_radius_miles')
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
  await crumb(tenantId, 'after_settings')

  // 2b. Service-area geo — geocode the business address to a center (once) and
  // report how many neighborhoods/areas fall inside the service radius. This is
  // the spine the geo/service/job page generation (Phase 3) iterates. Best-
  // effort: a name-only tenant with no address just skips, never blocks.
  try {
    const radius = typeof tenant.service_radius_miles === 'number' ? tenant.service_radius_miles : 25
    const haveCenter = typeof tenant.service_area_lat === 'number' && typeof tenant.service_area_lng === 'number'
    const coverage = await resolveCoverage({
      lat: tenant.service_area_lat as number | null,
      lng: tenant.service_area_lng as number | null,
      address: tenant.address as string | null,
      radiusMiles: radius,
    })
    // Persist a freshly geocoded center so we don't re-hit Nominatim next run.
    if (!haveCenter && coverage.center) {
      await supabaseAdmin
        .from('tenants')
        .update({ service_area_lat: coverage.center.lat, service_area_lng: coverage.center.lng })
        .eq('id', tenantId)
    }
    if (!coverage.center) {
      steps.push({
        key: 'service_area',
        label: 'Service area geocoded',
        status: 'action_needed',
        detail: (tenant.address as string | null)?.trim()
          ? 'Address could not be geocoded — check the address'
          : 'Set a business address to map the service area',
      })
    } else {
      steps.push({
        key: 'service_area',
        label: 'Service area geocoded',
        status: 'done',
        detail: `${coverage.neighborhoods.length} neighborhood(s), ${coverage.areas.length} area(s) within ${radius} mi`,
      })
    }
  } catch (e) {
    steps.push({ key: 'service_area', label: 'Service area geocoded', status: 'failed', detail: msg(e) })
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
  await crumb(tenantId, 'after_seed_tasks')

  // 4. Founding team member — the schedule spine needs at least one ACTIVE team
  // member. A solo operator is their own first worker, so seed one (idempotent)
  // named after the owner/business. This lets a name-only tenant clear the
  // schedule gate instead of stalling amber forever.
  try {
    const { count: activeTeam } = await supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if ((activeTeam || 0) === 0) {
      const teamPin = String(crypto.randomInt(100000, 1000000))
      const { error: tmErr } = await supabaseAdmin.from('team_members').insert({
        tenant_id: tenantId,
        name: tenant.owner_name || tenant.name || 'Owner',
        email: tenant.owner_email || DEFAULT_OWNER_EMAIL,
        role: 'lead',
        status: 'active',
        pin: teamPin,
        working_days: ['1', '2', '3', '4', '5'],
        working_start: '08:00:00',
        working_end: '18:00:00',
      })
      steps.push({
        key: 'team',
        label: 'Founding team member',
        status: tmErr ? 'failed' : 'done',
        detail: tmErr ? tmErr.message : 'Seeded owner as first active team member',
      })
    } else {
      steps.push({ key: 'team', label: 'Founding team member', status: 'done', detail: `${activeTeam} active member(s)` })
    }
  } catch (e) {
    steps.push({ key: 'team', label: 'Founding team member', status: 'failed', detail: msg(e) })
  }

  // Review destination — the review spine needs somewhere to send review
  // requests. If neither a Google place nor a review link is set, seed a
  // sensible default (a Google search for the business) so the gate can pass.
  // Stored in selena_config.google_review_link, which getSettings reads.
  try {
    const { data: tRow } = await supabaseAdmin
      .from('tenants')
      .select('google_place_id, selena_config')
      .eq('id', tenantId)
      .single()
    const selena = (tRow?.selena_config || {}) as Record<string, unknown>
    const hasReview = !!(tRow?.google_place_id || selena.google_review_link)
    if (!hasReview) {
      const link = `https://www.google.com/search?q=${encodeURIComponent((tenant.name || 'business') + ' reviews')}`
      await supabaseAdmin
        .from('tenants')
        .update({ selena_config: { ...selena, google_review_link: link } })
        .eq('id', tenantId)
      steps.push({ key: 'review_dest', label: 'Review destination', status: 'done', detail: 'Seeded default review link' })
    } else {
      steps.push({ key: 'review_dest', label: 'Review destination', status: 'done', detail: 'Review destination already set' })
    }
  } catch (e) {
    steps.push({ key: 'review_dest', label: 'Review destination', status: 'failed', detail: msg(e) })
  }

  // 5. Owner login — idempotent: create an owner member with a PIN if none
  // exists. Name-only tenants have no owner_email, so fall back to the default
  // contact; the login is what makes the tenant reachable, and one click should
  // produce it rather than parking the tenant on "set an email first".
  try {
    const { data: existingOwner } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .maybeSingle()

    if (existingOwner) {
      steps.push({ key: 'owner_login', label: 'Owner login', status: 'done', detail: 'Owner member exists' })
    } else {
      const ownerEmail = tenant.owner_email || DEFAULT_OWNER_EMAIL
      ownerPin = String(crypto.randomInt(100000, 1000000))
      const { error: memErr } = await supabaseAdmin.from('tenant_members').insert({
        tenant_id: tenantId,
        email: ownerEmail,
        name: tenant.owner_name || tenant.name || 'Owner',
        role: 'owner',
        pin_hash: hashAdminPin(ownerPin),
        pin_set_at: new Date().toISOString(),
      })
      if (memErr) {
        ownerPin = null
        steps.push({ key: 'owner_login', label: 'Owner login', status: 'failed', detail: memErr.message })
      } else {
        steps.push({ key: 'owner_login', label: 'Owner login', status: 'done', detail: `Owner created (${ownerEmail}) — PIN issued once` })
      }
    }
  } catch (e) {
    steps.push({ key: 'owner_login', label: 'Owner login', status: 'failed', detail: msg(e) })
  }
  await crumb(tenantId, 'after_owner')

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
  await crumb(tenantId, 'after_gate')

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

  // 8. Domain routing rows — tenant_domains is what middleware lead-routing and
  // the SEO ingest both read to map a hostname back to this tenant. Register the
  // carrying domain (always) and the custom domain apex (when set) so SEO
  // tracking and inbound-lead attribution self-link with no manual step.
  // Idempotent: unique(domain) + on-conflict-ignore, best-effort (never blocks).
  try {
    const carryHost = `${tenant.slug}.fullloopcrm.com`
    const customHost = ((tenant.domain as string | null) || (tenant.domain_name as string | null) || '')
      .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    const rows: Array<{ tenant_id: string; domain: string; active: boolean; is_primary: boolean; notes: string }> = [
      { tenant_id: tenantId, domain: carryHost, active: true, is_primary: !customHost, notes: 'Carrying domain — auto-registered on activation' },
    ]
    if (customHost) {
      rows.push({ tenant_id: tenantId, domain: customHost, active: true, is_primary: true, notes: 'Custom domain — auto-registered on activation' })
    }
    const { error: tdErr } = await supabaseAdmin
      .from('tenant_domains')
      .upsert(rows, { onConflict: 'domain', ignoreDuplicates: true })
    steps.push({
      key: 'domain_routing',
      label: 'Domain routing + SEO link',
      status: tdErr ? 'failed' : 'done',
      detail: tdErr ? tdErr.message : `${rows.map(r => r.domain).join(', ')} → lead routing + SEO ingest`,
    })
  } catch (e) {
    steps.push({ key: 'domain_routing', label: 'Domain routing + SEO link', status: 'failed', detail: msg(e) })
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

  await crumb(tenantId, 'done')
  return { ok: true, activated, ready, steps, ownerPin, customDomain, gate }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unexpected error'
}
