// seomgr — fleet health. The system-level watchdog that seomgr was missing: it
// pings every tenant's LIVE public domain and catches sites that are down,
// 4xx/5xx, or disabled (e.g. Vercel DEPLOYMENT_DISABLED) — the failures GSC data
// can't show because a dead site simply stops producing metrics. Free,
// deterministic, every tenant, current and future.
import { supabaseAdmin } from '@/lib/supabase'
import { safeFetch } from '@/lib/ssrf'

const norm = (d: string) =>
  d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')

export type SiteHealth = {
  domain: string
  tenant_id: string | null
  status: number
  vercelError?: string
  ok: boolean
}

/** HTTP-check every active public tenant domain. ok = final status is 2xx/3xx. */
export async function checkFleetHealth(): Promise<SiteHealth[]> {
  const { data, error } = await supabaseAdmin.from('tenant_domains').select('domain,tenant_id').eq('active', true)
  // Fail loud, not silent: a query error must not fall through to an empty
  // target list — runFleetHealth would then read that as "0 checked, 0 down"
  // and unconditionally wipe every real open site_down issue with no signal
  // that the check itself never ran.
  if (error) throw new Error(`tenant_domains query failed: ${error.message}`)
  const seen = new Set<string>()
  const targets = (data ?? [])
    .map((r) => ({ domain: norm(String(r.domain)), tenant_id: (r.tenant_id as string | null) ?? null }))
    .filter((t) => {
      if (!t.domain || !t.domain.includes('.') || t.domain.endsWith('.fullloopcrm.com') || seen.has(t.domain)) return false
      seen.add(t.domain)
      return true
    })

  return Promise.all(
    targets.map(async (t): Promise<SiteHealth> => {
      try {
        // safeFetch: t.domain comes from tenant_domains (tenant-controlled),
        // this runs unattended off a cron with no per-request auth — same SSRF
        // class already guarded in tenant-health.ts/site-readiness.ts, just
        // missed here (cron/seo-health wasn't in the original guarded set).
        // Use the domain as stored (bare apex — see 043_tenant_domains.sql),
        // matching tenant-health.ts's checkTenant(); forcing a www. prefix
        // false-positives an apex-only tenant with no working www CNAME.
        const res = await safeFetch(`https://${t.domain}/`, {
          method: 'GET',
          signal: AbortSignal.timeout(12000),
          headers: { 'user-agent': 'seomgr-health/1.0' },
        })
        return {
          ...t,
          status: res.status,
          vercelError: res.headers.get('x-vercel-error') ?? undefined,
          ok: res.status >= 200 && res.status < 400,
        }
      } catch (e) {
        return { ...t, status: 0, vercelError: e instanceof Error ? e.message : 'fetch failed', ok: false }
      }
    }),
  )
}

/** Run the check, persist DOWN sites as critical seo_issues, return the summary. */
export async function runFleetHealth(): Promise<{ checked: number; down: SiteHealth[] }> {
  const results = await checkFleetHealth()
  const down = results.filter((r) => !r.ok)

  // Clear prior site_down issues, then re-open for whatever is currently down —
  // so a site that recovered stops showing as an issue automatically.
  await supabaseAdmin.from('seo_issues').delete().eq('type', 'site_down')
  if (down.length) {
    await supabaseAdmin.from('seo_issues').insert(
      down.map((d) => ({
        property: `sc-domain:${d.domain}`,
        tenant_id: d.tenant_id,
        type: 'site_down',
        severity: 'critical',
        tier: 0,
        status: 'open',
        target_url: `https://${d.domain}/`,
        detail: { http_status: d.status, vercel_error: d.vercelError ?? null },
      })),
    )
  }
  return { checked: results.length, down }
}
