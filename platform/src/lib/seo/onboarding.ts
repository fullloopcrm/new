// seomgr — auto-onboarding. Registers a tenant's public domain into the SEO
// property registry the moment a tenant activates, so no site is ever silently
// untracked. The row starts as "awaiting_grant"; once the domain is granted to
// the GSC service account, ingest's sites.list discovery + upsertProperty fill
// in the real permission and begin pulling metrics — no further code needed.
import { supabaseAdmin } from '@/lib/supabase'

/** Normalize any host/URL to a bare registrable domain for GSC `sc-domain:`. */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
}

export type SeoOnboardResult = { domain: string; property: string; created: boolean }

/**
 * Register one domain into seomgr as an awaiting-GSC-grant property.
 * Idempotent and non-destructive: if the property already exists (e.g. already
 * granted and ingesting), `ignoreDuplicates` leaves it untouched — we never
 * overwrite a live property's permission or metrics.
 */
export async function registerSeoProperty(
  tenantId: string | null,
  rawDomain: string,
  via: 'activation' | 'backfill' = 'activation',
): Promise<SeoOnboardResult | null> {
  const domain = normalizeDomain(rawDomain)
  if (!domain || !domain.includes('.')) return null
  // Skip internal carrying/preview hosts — these are not standalone public sites
  // and should never be their own GSC property (the real site lives on the
  // tenant's custom domain, which is tracked separately).
  if (domain.endsWith('.fullloopcrm.com') || domain.endsWith('.vercel.app')) return null
  const property = `sc-domain:${domain}`
  const { data, error } = await supabaseAdmin
    .from('seo_properties')
    .upsert(
      {
        property,
        domain,
        tenant_id: tenantId,
        label: domain,
        meta: { gsc_status: 'awaiting_grant', onboarded_via: via, onboarded_at: new Date().toISOString() },
      },
      { onConflict: 'property', ignoreDuplicates: true },
    )
    .select('property')
  if (error) throw new Error(`seomgr onboard ${domain}: ${error.message}`)
  return { domain, property, created: (data?.length ?? 0) > 0 }
}

/**
 * Backfill: register every active tenant_domains host that is not yet a tracked
 * seo_property. Returns the domains newly registered as awaiting_grant.
 */
export async function backfillUntrackedDomains(): Promise<SeoOnboardResult[]> {
  const props = await supabaseAdmin.from('seo_properties').select('property')
  const tracked = new Set((props.data ?? []).map((p) => normalizeDomain(String(p.property).replace('sc-domain:', ''))))

  const dom = await supabaseAdmin.from('tenant_domains').select('domain,tenant_id,active').eq('active', true)
  const seen = new Set<string>()
  const out: SeoOnboardResult[] = []
  for (const r of dom.data ?? []) {
    const domain = normalizeDomain(String(r.domain))
    if (!domain || tracked.has(domain) || seen.has(domain)) continue
    seen.add(domain)
    const res = await registerSeoProperty(r.tenant_id as string | null, domain, 'backfill')
    if (res) out.push(res)
  }

  // Fallback: tenant_domains registration is best-effort (activate-tenant.ts's
  // upsert is try/catch, "never blocks" activation), so a tenant live only via
  // legacy tenants.domain would never get a seo_property registered at all —
  // not "unlinked", genuinely untracked, permanently invisible to seomgr and
  // to Selena's handleSeoStatus(). Same coverage gap already fixed in
  // backlinks.ts/health.ts, and in this same file's sibling linkTenant() in
  // ingest.ts; matches tenant.ts's tenant_domains-first / tenants.domain-
  // fallback precedence.
  const { data: legacy } = await supabaseAdmin.from('tenants').select('id,domain').not('domain', 'is', null)
  for (const t of legacy ?? []) {
    const domain = normalizeDomain(String(t.domain ?? ''))
    if (!domain || tracked.has(domain) || seen.has(domain)) continue
    seen.add(domain)
    const res = await registerSeoProperty(t.id as string | null, domain, 'backfill')
    if (res) out.push(res)
  }
  return out
}
