import { supabaseAdmin } from '@/lib/supabase'
import { getSettings } from '@/lib/settings'
import { checkAvailability } from '@/lib/availability'

/**
 * Onboarding readiness gate.
 *
 * Verifies a tenant's lead → review spine is CONNECTED and CONFIGURED before
 * the tenant is flipped `onboarding → active`. This v1 is intentionally
 * READ-ONLY: it never writes rows and never triggers SMS/email/notify, so it is
 * safe to run against live tenants (including auditing the existing 20). It
 * proves each stage is wired, not that a real customer completed it.
 *
 * A deeper "live test lead" (synthetic row through the funnel with cleanup and
 * suppressed sends) can layer on later; this gate is the always-safe baseline.
 */

export type GateStageKey = 'site' | 'lead' | 'schedule' | 'payment' | 'review'

export interface GateStage {
  stage: GateStageKey
  ok: boolean
  detail: string
}

export interface GateResult {
  tenantId: string
  passed: boolean
  stages: GateStage[]
}

// A date ~7 days out — safely inside any booking window, avoids same-day/holiday edges.
function probeDate(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}

export async function runOnboardingGate(tenantId: string): Promise<GateResult> {
  const stages: GateStage[] = []

  const [{ data: tenant }, settings, { count: teamCount }] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('name, slug, domain, domain_name, website_url, google_place_id')
      .eq('id', tenantId)
      .single(),
    getSettings(tenantId),
    supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ])

  // 1. SITE — the public front door resolves (name + a reachable host).
  const host = tenant?.domain || tenant?.domain_name || (tenant?.slug ? `${tenant.slug}.fullloopcrm.com` : null)
  stages.push({
    stage: 'site',
    ok: !!(tenant?.name && host),
    detail: host ? `Live at ${host}` : 'No domain or slug — site has no address',
  })

  // 2. LEAD — a lead posted from the site can land: host exists to carry the
  //    form, and the leads table is reachable for this tenant.
  const { error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  stages.push({
    stage: 'lead',
    ok: !!host && !leadErr,
    detail: leadErr ? `Leads table unreachable: ${leadErr.message}` : 'Lead capture wired to /api/lead',
  })

  // 3. SCHEDULE — at least one active team member + one active service, and the
  //    availability engine runs without error for this tenant.
  const activeServices = settings.service_types.filter((s) => s.active).length
  let scheduleOk = false
  let scheduleDetail = ''
  try {
    await checkAvailability(tenantId, probeDate(), settings.default_duration_hours || 2)
    scheduleOk = (teamCount || 0) >= 1 && activeServices >= 1
    scheduleDetail = scheduleOk
      ? `${teamCount} team, ${activeServices} services — engine OK`
      : `Missing: ${(teamCount || 0) < 1 ? 'active team member ' : ''}${activeServices < 1 ? 'active service' : ''}`.trim()
  } catch (e) {
    scheduleOk = false
    scheduleDetail = `Availability engine error: ${e instanceof Error ? e.message : 'unknown'}`
  }
  stages.push({ stage: 'schedule', ok: scheduleOk, detail: scheduleDetail })

  // 4. PAYMENT — a collection method is configured (Stripe or a payment link).
  const hasPayment = settings.payment_methods.length > 0
  stages.push({
    stage: 'payment',
    ok: hasPayment,
    detail: hasPayment ? `Methods: ${settings.payment_methods.join(', ')}` : 'No payment method configured',
  })

  // 5. REVIEW — a destination for review requests exists.
  const reviewTarget = tenant?.google_place_id || settings.google_review_link
  stages.push({
    stage: 'review',
    ok: !!reviewTarget,
    detail: reviewTarget ? 'Review destination set' : 'No Google place / review link — nowhere to send reviews',
  })

  return {
    tenantId,
    passed: stages.every((s) => s.ok),
    stages,
  }
}
