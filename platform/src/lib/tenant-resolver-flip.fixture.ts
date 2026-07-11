import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Fixture for the post-deploy resolver-flip smoke suite
 * (tenant-resolver-flip.smoke.test.ts).
 *
 * WHAT THIS PROVIDES
 * ------------------
 * A list of (host -> expected tenant slug) expectations the live smoke asserts
 * against a deployed URL after the tenant_domains-first flip. Two groups:
 *
 *   1. CARRYING SUBDOMAINS — `<slug>.fullloopcrm.com`. These are DETERMINISTIC
 *      and code-derived: middleware's extractSubdomain() matches
 *      `*.fullloopcrm.com` and resolves by slug via getTenantBySlug(), so the
 *      carrying subdomain for a bespoke tenant MUST resolve to that exact slug.
 *      We parse the bespoke slug set straight out of src/middleware.ts so this
 *      list can never silently drift from the router (same parse the
 *      protected-tenant guard uses).
 *
 *   2. CUSTOM DOMAINS — real custom domains sourced from committed code /
 *      migrations (STATIC_TENANT_MAP, APEX_CANONICAL_DOMAINS, migration 043
 *      seeds, and the protected-tenant guard). These exercise the
 *      tenant_domains-first custom-domain path.
 *
 * NOT GUESSED: every custom domain below has a `source` pointing at where in the
 * repo it came from. Custom domains whose authoritative value lives only in the
 * prod `tenant_domains` table (not in code) are intentionally NOT invented here
 * — the runbook tells the operator to append them from a DB export.
 */

export type DomainSource = 'carrying-subdomain' | 'code'

export type DomainExpectation = {
  /** Request host to probe (no scheme). */
  host: string
  /** Slug the resolver must return for this host (the x-tenant-slug header). */
  expectedSlug: string
  /** Where this expectation came from — provenance, never a guess. */
  source: DomainSource
  /** Repo location / reason the value is trusted. */
  note?: string
}

/** Carrying host for tenant sites served before their custom domain is pointed. */
export const CARRYING_HOST = 'fullloopcrm.com'

/**
 * Extract the bespoke tenant slug set from src/middleware.ts by static text
 * parse — the SAME source of truth the router uses, so the smoke list cannot
 * drift from it. Mirrors scripts/verify-protected-tenants.mjs.
 */
export function bespokeSlugsFromMiddleware(): string[] {
  const mwPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'middleware.ts')
  const mw = readFileSync(mwPath, 'utf8')
  const block = mw.match(/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  if (!block) {
    throw new Error(
      'Could not find BESPOKE_SITE_TENANTS in src/middleware.ts — the set was ' +
        'renamed or removed. Fix the parse before trusting the smoke fixture.',
    )
  }
  return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
}

/**
 * Carrying-subdomain expectations: `<slug>.fullloopcrm.com` -> slug, one per
 * bespoke tenant. Deterministic; no DB data required.
 */
export function carryingSubdomainChecks(host: string = CARRYING_HOST): DomainExpectation[] {
  return bespokeSlugsFromMiddleware().map((slug) => ({
    host: `${slug}.${host}`,
    expectedSlug: slug,
    source: 'carrying-subdomain',
    note: 'extractSubdomain() -> getTenantBySlug(slug) in src/middleware.ts',
  }))
}

/**
 * Custom-domain expectations sourced from committed code / migrations. The
 * live smoke resolves each via the tenant_domains-first custom-domain path.
 */
export const CUSTOM_DOMAIN_CHECKS: DomainExpectation[] = [
  { host: 'thenycmaid.com', expectedSlug: 'nycmaid', source: 'code', note: 'migration 043 seed + verify-protected-tenants' },
  { host: 'thenewyorkcitymaid.com', expectedSlug: 'nycmaid', source: 'code', note: 'migration 043 primary domain seed' },
  { host: 'thefloridamaid.com', expectedSlug: 'the-florida-maid', source: 'code', note: 'STATIC_TENANT_MAP in src/middleware.ts' },
  { host: 'consortiumnyc.com', expectedSlug: 'consortium-nyc', source: 'code', note: 'APEX_CANONICAL_DOMAINS in src/middleware.ts' },
  { host: 'thenycmarketingcompany.com', expectedSlug: 'the-nyc-marketing-company', source: 'code', note: 'APEX_CANONICAL_DOMAINS in src/middleware.ts' },
  { host: 'thenycinteriordesigner.com', expectedSlug: 'the-nyc-interior-designer', source: 'code', note: 'APEX_CANONICAL_DOMAINS in src/middleware.ts' },
  { host: 'wepayyoujunkremoval.com', expectedSlug: 'we-pay-you-junk', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'thenycmobilesalon.com', expectedSlug: 'nyc-mobile-salon', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'thenycexterminator.com', expectedSlug: 'the-nyc-exterminator', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'nycroadsideemergencyassistance.com', expectedSlug: 'nycroadsideemergencyassistance', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'theroadsidehelper.com', expectedSlug: 'theroadsidehelper', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'tolltrucksnearme.com', expectedSlug: 'toll-trucks-near-me', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'cleaningservicesunnysideny.com', expectedSlug: 'sunnyside-clean-nyc', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'stretchny.com', expectedSlug: 'stretch-ny', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
  { host: 'thenycseo.com', expectedSlug: 'the-nyc-seo', source: 'code', note: 'verify-protected-tenants PROTECTED list' },
]

/**
 * The full default expectation set the live smoke iterates. Carrying subdomains
 * first (deterministic), then code-sourced custom domains.
 */
export function defaultExpectations(): DomainExpectation[] {
  return [...carryingSubdomainChecks(), ...CUSTOM_DOMAIN_CHECKS]
}

/**
 * Load operator-supplied expectations from a JSON file whose path is in
 * SMOKE_DOMAINS_JSON. Shape: [{ "host": "...", "expectedSlug": "..." }, ...].
 * Lets the operator drive the smoke off an authoritative tenant_domains export
 * WITHOUT editing code. Returns null when the env var is unset.
 */
export function operatorExpectations(): DomainExpectation[] | null {
  const p = process.env.SMOKE_DOMAINS_JSON
  if (!p) return null
  const raw = JSON.parse(readFileSync(p, 'utf8')) as Array<{ host: string; expectedSlug: string }>
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`SMOKE_DOMAINS_JSON at ${p} did not contain a non-empty array`)
  }
  return raw.map((r) => {
    if (!r.host || !r.expectedSlug) {
      throw new Error(`SMOKE_DOMAINS_JSON entry missing host/expectedSlug: ${JSON.stringify(r)}`)
    }
    return { host: r.host, expectedSlug: r.expectedSlug, source: 'code', note: 'operator JSON' }
  })
}

/** Expectations the live smoke actually runs: operator JSON if provided, else defaults. */
export function smokeExpectations(): DomainExpectation[] {
  return operatorExpectations() ?? defaultExpectations()
}
