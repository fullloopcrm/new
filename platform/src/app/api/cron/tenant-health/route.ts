import { NextResponse } from 'next/server'
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

// Tenants intentionally served by the shared template (expect /site/template).
// Empty today — every live tenant is bespoke. Add slugs here as they migrate.
const TEMPLATE_TENANTS = new Set<string>([])

// Slugs that are the platform itself, not a customer site — never health-checked.
const SKIP_SLUGS = new Set<string>(['full-loop-crm'])

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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Active custom domains, one (preferred) per tenant.
  const { data: rows, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('tenant_id, domain, is_primary')
    .eq('active', true)

  if (error) {
    await alertOwner('Fortress cron DB error', error.message).catch(() => {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Resolve tenant slugs.
  const tenantIds = [...new Set((rows ?? []).map((r) => r.tenant_id).filter(Boolean))]
  const { data: tenantRows } = await supabaseAdmin
    .from('tenants')
    .select('id, slug')
    .in('id', tenantIds)
  const slugById = new Map<string, string>((tenantRows ?? []).map((t) => [t.id, t.slug]))

  // Reduce to one domain per tenant (prefer is_primary), skip platform slugs.
  const byTenant = new Map<string, { slug: string; domain: string; primary: boolean }>()
  for (const r of rows ?? []) {
    const slug = slugById.get(r.tenant_id)
    if (!slug || SKIP_SLUGS.has(slug)) continue
    const cur = byTenant.get(r.tenant_id)
    if (!cur || (r.is_primary && !cur.primary)) {
      byTenant.set(r.tenant_id, { slug, domain: r.domain, primary: !!r.is_primary })
    }
  }

  const targets = [...byTenant.entries()].map(([tenant_id, v]) => ({ tenant_id, ...v }))

  const results = await mapCapped(
    targets,
    async (t): Promise<TenantHealth & { tenant_id: string }> => {
      const expected = TEMPLATE_TENANTS.has(t.slug) ? 'template' : t.slug
      const h = await checkTenant(t.slug, t.domain, expected)
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
