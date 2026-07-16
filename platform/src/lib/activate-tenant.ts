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
import { seedChartOfAccounts } from './ledger'
import { seedHrDefaults } from './hr'
import { ensureDefaultEntity } from './entity-provision'
import { runOnboardingGate, type GateResult } from './onboarding-gate'
import { clearSettingsCache } from './settings'
import { registerCarryingDomain, registerCustomDomain, type CustomDomainResult } from './vercel-domains'
import { registerSeoProperty } from './seo/onboarding'
import { resolveCoverage } from './geo/coverage'
import { hashAdminPin } from './admin-pin'
import crypto from 'crypto'

// Default contact used when a tenant is created name-only (common for process
// testing). Owner login + founding team member fall back to this so a bare
// tenant can be driven all the way to active from one click.
const DEFAULT_OWNER_EMAIL = 'fullloopcrm@gmail.com'

// Mirrors src/middleware.ts BESPOKE_SITE_TENANTS VERBATIM — the single source
// of truth for which tenants middleware routes to their own /site/<slug>
// subtree vs the shared /site/template. Copied (not imported) to avoid pulling
// this activation module into the edge middleware bundle; kept honest by
// activate-tenant-bespoke-drift.test.ts, which fails if the two lists diverge.
const BESPOKE_SITE_TENANTS = new Set<string>([
  'nycmaid',
  'we-pay-you-junk',
  'nyc-mobile-salon',
  'the-florida-maid',
  'the-nyc-exterminator',
  'nyc-tow',
  'nycroadsideemergencyassistance',
  'theroadsidehelper',
  'toll-trucks-near-me',
  'sunnyside-clean-nyc',
  'wash-and-fold-nyc',
  'wash-and-fold-hoboken',
  'landscaping-in-nyc',
  'debt-service-ratio-loan',
  'fla-dumpster-rentals',
  'stretch-ny',
  'stretch-service',
  'the-home-services-company',
  'the-nyc-interior-designer',
  'the-nyc-marketing-company',
  'the-nyc-seo',
  'consortium-nyc',
])

// Mirrors src/lib/migrations/059_backfill_vercel_project.sql's fl_project /
// "determinable" split VERBATIM — the single source of truth for which
// tenants are provably served by the shared FL Vercel project vs a bespoke
// tenant whose custom domain may still live on its own standalone project
// (roadside pair, tow, salon, etc. — see that migration's header for the
// full audit). 059 only backfilled EXISTING rows once; without this, every
// tenant activated AFTER that one-time run gets vercel_project = NULL
// forever unless someone remembers to re-run 059 by hand. Copied (not
// imported — it's SQL) and kept honest by
// activate-tenant-vercel-project-drift.test.ts, same pattern as
// BESPOKE_SITE_TENANTS above.
const FL_PROJECT_ID = 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'
const FL_SIGNAL_BESPOKE_SLUGS = new Set<string>([
  'the-florida-maid',
  'consortium-nyc',
  'the-nyc-interior-designer',
  'the-nyc-marketing-company',
])
// Values a prior automated backfill (055/059) or this file may have written.
// Only these are safe to overwrite when re-syncing an existing row; anything
// else is a manual correction and must be left alone.
const AUTO_VERCEL_PROJECT_VALUES = ['fullloopcrm', 'platform']

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

  // 3b. Auto-finance + auto-HR — every tenant is born with a bookkeeping ledger
  // (chart of accounts) and an HR foundation (doc-requirement template + an HR
  // profile per team member). Both idempotent: no-op when already seeded, so
  // this is safe on repeat activations. Best-effort — never block activation.
  try {
    const createdEntity = await ensureDefaultEntity(tenantId, tenant.name || 'Main')
    const accounts = await seedChartOfAccounts(tenantId)
    const hr = await seedHrDefaults(tenantId, tenant.industry || undefined)
    steps.push({
      key: 'finance_hr',
      label: 'Bookkeeping + HR seeded',
      status: 'done',
      detail: `Entity: ${createdEntity ? 'created default' : 'already set'} · Ledger: ${accounts > 0 ? `${accounts} accounts` : 'already set'} · HR: ${hr.requirementsSeeded} doc rule(s), ${hr.profilesBackfilled} profile(s)`,
    })
  } catch (e) {
    steps.push({ key: 'finance_hr', label: 'Bookkeeping + HR seeded', status: 'failed', detail: msg(e) })
  }
  await crumb(tenantId, 'after_finance_hr')

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
  // Bust the per-tenant settings cache first: earlier steps (provisioning,
  // review-destination seeding) mutated selena_config AFTER getSettings may have
  // already cached a mid-activation snapshot. Without this, the gate reads stale
  // settings and fails 'review' (and any other just-seeded field) even though the
  // DB is correct — which blocked tenants from ever flipping 'active'.
  clearSettingsCache(tenantId)
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
    // routing_mode must mirror middleware's BESPOKE_SITE_TENANTS, or this row
    // silently falls to the column DEFAULT ('template') for a tenant middleware
    // actually routes to /site/<slug> — DB says template-routed while the real
    // site is bespoke (the 2026-07-10 mis-route class). Kept in sync with
    // middleware.ts by activate-tenant-bespoke-drift.test.ts, same pattern as
    // the 055 backfill's middleware-vs-SQL guard.
    const routingMode = BESPOKE_SITE_TENANTS.has(tenant.slug) ? 'bespoke' : 'template'
    // Determinable per 059's audit: any non-bespoke (template) tenant, plus the
    // 4 bespoke tenants with a confirmed FL routing signal, are provably served
    // by the shared FL project. The other 18 bespoke tenants may still be on a
    // standalone Vercel project 059 could not verify from repo alone — leave
    // those NULL rather than assert a cutover that may not have happened.
    const vercelProject =
      !BESPOKE_SITE_TENANTS.has(tenant.slug) || FL_SIGNAL_BESPOKE_SLUGS.has(tenant.slug)
        ? FL_PROJECT_ID
        : null
    const rows: Array<{ tenant_id: string; domain: string; active: boolean; is_primary: boolean; notes: string; routing_mode: string; vercel_project: string | null }> = [
      { tenant_id: tenantId, domain: carryHost, active: true, is_primary: !customHost, notes: 'Carrying domain — auto-registered on activation', routing_mode: routingMode, vercel_project: vercelProject },
    ]
    if (customHost) {
      rows.push({ tenant_id: tenantId, domain: customHost, active: true, is_primary: true, notes: 'Custom domain — auto-registered on activation', routing_mode: routingMode, vercel_project: vercelProject })
    }
    const { error: tdErr } = await supabaseAdmin
      .from('tenant_domains')  // tenant-scope-ok: upsert rows carry tenant_id (built above)
      .upsert(rows, { onConflict: 'domain', ignoreDuplicates: true })

    // ignoreDuplicates above means ON CONFLICT DO NOTHING: it only inserts
    // brand-new rows and never touches an EXISTING row's routing_mode. If a
    // tenant is added to BESPOKE_SITE_TENANTS after its domain row already
    // exists (the common case — domains are usually registered long before a
    // tenant goes bespoke), this "safe to hit repeatedly" button would
    // otherwise never re-sync it: reconcile-tenant-config.mjs only DETECTS
    // that drift, it doesn't write anything back. Explicitly correct any
    // mismatch on every run so routing_mode can't get stuck stale.
    let driftFixed = 0
    if (!tdErr) {
      const { data: fixedRows, error: syncErr } = await supabaseAdmin
        .from('tenant_domains')
        .update({ routing_mode: routingMode })
        .eq('tenant_id', tenantId)
        .in('domain', rows.map((r) => r.domain))
        .neq('routing_mode', routingMode)
        .select('id')
      if (!syncErr) driftFixed = fixedRows?.length ?? 0
    }

    // Same re-sync, for vercel_project. Only attempted when this tenant is
    // DETERMINABLE (vercelProject !== null) — the 18 unknown-standalone bespoke
    // tenants must never have a value asserted onto them here; their column
    // stays whatever a human (or a future live-Vercel-API backfill) set it to.
    // Two separate queries instead of a single `.or('vercel_project.is.null,…')`
    // — see AUTO_VERCEL_PROJECT_VALUES comment; keeps this readable across both
    // the real PostgREST client and the in-memory test fake.
    let vercelProjectFixed = 0
    if (!tdErr && vercelProject) {
      const domains = rows.map((r) => r.domain)
      const { data: fromNull, error: nullErr } = await supabaseAdmin
        .from('tenant_domains')
        .update({ vercel_project: vercelProject })
        .eq('tenant_id', tenantId)
        .in('domain', domains)
        .is('vercel_project', null)
        .select('id')
      if (!nullErr) vercelProjectFixed += fromNull?.length ?? 0

      const { data: fromAuto, error: autoErr } = await supabaseAdmin
        .from('tenant_domains')
        .update({ vercel_project: vercelProject })
        .eq('tenant_id', tenantId)
        .in('domain', domains)
        .in('vercel_project', AUTO_VERCEL_PROJECT_VALUES)
        .select('id')
      if (!autoErr) vercelProjectFixed += fromAuto?.length ?? 0
    }

    const corrections = [
      driftFixed > 0 ? `routing_mode on ${driftFixed} row(s)` : null,
      vercelProjectFixed > 0 ? `vercel_project on ${vercelProjectFixed} row(s)` : null,
    ].filter(Boolean)

    steps.push({
      key: 'domain_routing',
      label: 'Domain routing + SEO link',
      status: tdErr ? 'failed' : 'done',
      detail: tdErr
        ? tdErr.message
        : `${rows.map(r => r.domain).join(', ')} → lead routing + SEO ingest${corrections.length > 0 ? ` (corrected stale ${corrections.join(', ')})` : ''}`,
    })
  } catch (e) {
    steps.push({ key: 'domain_routing', label: 'Domain routing + SEO link', status: 'failed', detail: msg(e) })
  }

  // 8b. seomgr auto-onboard — register the public domain as an SEO property so
  // the site is tracked from day one. Starts "awaiting_grant"; a one-time GSC
  // grant to the monitor service account flips it live (ingest self-discovers).
  try {
    const carryHost = `${tenant.slug}.fullloopcrm.com`
    const customHost = ((tenant.domain as string | null) || (tenant.domain_name as string | null) || '')
      .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    const primaryHost = customHost || carryHost
    const seo = await registerSeoProperty(tenantId, primaryHost, 'activation')
    steps.push({
      key: 'seo_monitoring',
      label: 'seomgr monitoring',
      status: 'done',
      detail: seo
        ? `${seo.domain} registered${seo.created ? ' (awaiting GSC grant)' : ' (already tracked)'}`
        : 'no valid domain to track',
    })
  } catch (e) {
    steps.push({ key: 'seo_monitoring', label: 'seomgr monitoring', status: 'failed', detail: msg(e) })
  }

  const ownerOk = steps.find((s) => s.key === 'owner_login')?.status === 'done'
  // The site only actually SERVES if a domain was really registered — the
  // carrying domain succeeded, or a custom domain verified. Without that there
  // is no TLS cert and the URL is dead, so we must NOT claim the tenant is live.
  // (Root cause of dead auto-created sites: VERCEL_API_TOKEN/VERCEL_TEAM_ID unset
  // → registerCarryingDomain returns 'skipped', which used to still flip 'active'.)
  const siteServes = carry.ok || !!customDomain?.verified
  if (!siteServes) {
    steps.push({
      key: 'site_live',
      label: 'Site reachable',
      status: 'action_needed',
      detail: 'No live domain yet — the carrying/custom domain was not registered (check Vercel env). Site will 404/TLS-fail until fixed.',
    })
  }
  const ready = gate.passed && ownerOk && siteServes

  // Flip to active only when the spine passes, there's an owner login, AND the
  // site actually serves. Never mark a tenant live on faith.
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
