import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'
import { checkTenant, type TenantHealth } from '@/lib/tenant-health'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Fortress cron — the live tenant-darkening detector.
 *
 * For every tenant with an active custom domain, verifies the site is reachable,
 * serves its OWN /site/<slug> (not the generic template), has no redirect loop,
 * and its lead endpoint is wired. Persists per-tenant status to `tenant_health`
 * (read by the dashboard) and Telegram-alerts the owner on any failure.
 *
 * This is the check that would have caught the 2026-07-08 cutover in minutes
 * instead of by eye. Manual run: GET with `Authorization: Bearer $CRON_SECRET`.
 */

// Tenants intentionally served by the shared template (expect /site/template),
// i.e. tenants with a live domain but no bespoke /site/<slug> folder. Add slugs
// here as tenants migrate onto the template.
const TEMPLATE_TENANTS = new Set<string>(['the-va-virtual-assistant'])

// Slugs that are the platform itself, not a customer site — never health-checked.
const SKIP_SLUGS = new Set<string>(['full-loop-crm'])

// Tenants intentionally NOT served by FL right now — checking them is noise:
//  - nycmaid: still on its standalone build (FL cutover not done). REMOVE after cutover.
//  - fla-dumpster-rentals: intentionally left standalone.
const EXCLUDED_TENANTS = new Set<string>(['nycmaid', 'fla-dumpster-rentals'])

// Tenants whose homepage is in a Next route group (report x-matched-path `/`).
const ROUTE_GROUP_TENANTS = new Set<string>(['wash-and-fold-nyc', 'wash-and-fold-hoboken'])

const CONCURRENCY = 8

async function mapCapped<T, R>(items: T[], fn: (t: T) => Promise<R>, cap: number): Promise<R[]> {
  const out: R[] = []
  let i = 0
  const workers = Array.from({ length: Math.min(cap, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return out
}

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  // A tenant's live domain can be in EITHER `tenant_domains` OR `tenants.domain`.
  // The resolver (getTenantByDomain in tenant-lookup.ts) reads `tenant_domains`
  // FIRST and falls back to `tenants.domain` only when no active tenant_domains
  // row exists — this cron must match that precedence exactly. A stale
  // `tenants.domain` must never win over a live `tenant_domains` row for the
  // same tenant, or Fortress health-checks (and alerts on) the wrong host.
  const byTenant = new Map<string, { slug: string; domain: string; primary: boolean }>()
  const slugById = new Map<string, string>()

  // Source 1 (authoritative): active tenant_domains
  const { data: tdRows } = await supabaseAdmin
    .from('tenant_domains')
    .select('tenant_id, domain, is_primary')
    .eq('active', true)
  const tdTenantIds = [...new Set((tdRows ?? []).map((r) => r.tenant_id).filter(Boolean))]
  if (tdTenantIds.length) {
    const { data: tdTenants } = await supabaseAdmin.from('tenants').select('id, slug').in('id', tdTenantIds)
    for (const t of tdTenants ?? []) slugById.set(t.id, t.slug)
  }
  for (const r of tdRows ?? []) {
    const slug = slugById.get(r.tenant_id)
    if (!slug || SKIP_SLUGS.has(slug) || EXCLUDED_TENANTS.has(slug)) continue
    const cur = byTenant.get(r.tenant_id)
    if (!cur || (r.is_primary && !cur.primary)) {
      byTenant.set(r.tenant_id, { slug, domain: r.domain, primary: !!r.is_primary })
    }
  }

  // Source 2 (fallback): tenants.domain, only for tenants tenant_domains didn't cover.
  // Status filter matches middleware.ts's tenantServesSite() deny-list exactly
  // (NOT an allow-list of active/live/setup) — a tenant in any OTHER status
  // (pending, trial, paused, past_due, grace, onboarding, ...) still gets
  // served live by middleware, so Fortress must still watch it. The old
  // allow-list left every one of those served-but-uncommon statuses
  // unmonitored (gap C-2, deploy-prep/fortress-health-coverage-audit.md).
  const { data: tenantRows, error: tErr } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, domain, status')
    .not('domain', 'is', null)
    .not('status', 'in', '(suspended,cancelled,deleted)')
  if (tErr) {
    await alertOwner('Fortress cron DB error', tErr.message).catch(() => {})
    return NextResponse.json({ error: tErr.message }, { status: 500 })
  }
  for (const t of tenantRows ?? []) {
    slugById.set(t.id, t.slug)
    if (byTenant.has(t.id)) continue // tenant_domains already won
    if (SKIP_SLUGS.has(t.slug) || EXCLUDED_TENANTS.has(t.slug) || !t.domain) continue
    byTenant.set(t.id, { slug: t.slug, domain: t.domain, primary: true })
  }

  const targets = [...byTenant.entries()].map(([tenant_id, v]) => ({ tenant_id, ...v }))

  const results = await mapCapped(
    targets,
    async (t): Promise<TenantHealth & { tenant_id: string }> => {
      const expected = TEMPLATE_TENANTS.has(t.slug) ? 'template' : t.slug
      const h = await checkTenant(t.slug, t.domain, expected, {
        routeGroupHome: ROUTE_GROUP_TENANTS.has(t.slug),
      })
      return { ...h, tenant_id: t.tenant_id }
    },
    CONCURRENCY,
  )

  // Persist (upsert one row per domain).
  const checkedAt = new Date().toISOString()
  await supabaseAdmin.from('tenant_health').upsert(
    results.map((r) => ({
      tenant_id: r.tenant_id,
      slug: r.slug,
      domain: r.domain,
      status: r.status,
      matched_path: r.matchedPath,
      checks: r.checks,
      detail: r.detail,
      checked_at: checkedAt,
    })),
    { onConflict: 'domain' },
  )

  const failures = results.filter((r) => r.status === 'fail')
  if (failures.length > 0) {
    const body = failures.map((f) => `• ${f.slug} (${f.domain}): ${f.detail}`).join('\n')
    await alertOwner(`🚨 Fortress: ${failures.length} tenant site(s) FAILING`, body).catch(() => {})
  }

  return NextResponse.json({
    checked: results.length,
    passing: results.length - failures.length,
    failing: failures.length,
    failures: failures.map((f) => ({ slug: f.slug, domain: f.domain, detail: f.detail })),
    checkedAt,
  })
}
