import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  defaultExpectations,
  smokeExpectations,
  bespokeSlugsFromMiddleware,
  type DomainExpectation,
} from './tenant-resolver-flip.fixture'

/**
 * POST-DEPLOY RESOLVER-FLIP SMOKE SUITE
 * =====================================
 * Guards the tenant_domains-first resolver + TENANT_DIVERGENCE assert-and-refuse
 * guard after they ship. Two independent parts:
 *
 *   PART A — LIVE RESOLUTION (opt-in, network). For every known tenant host,
 *     probe a deployed URL and assert the resolver returns the RIGHT tenant
 *     (the x-tenant-slug response header set by rewriteToSite in middleware).
 *     Skipped unless SMOKE_RUN=1 so the normal `vitest run` stays offline/green.
 *
 *   PART B — SYNTHETIC DIVERGENCE (always runs, fully mocked). Proves the
 *     assert-and-refuse guard FIRES when tenant_domains and legacy tenants.domain
 *     disagree — using a mocked Supabase client, so NO divergence is ever written
 *     to a real database. Also proves the agreement and dangling-pointer paths.
 *
 * See docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md for how to run Part A after a flip.
 */

// ---------------------------------------------------------------------------
// Offline sanity — runs everywhere, no network. Guards the fixture itself so an
// empty/drifted list can't make Part A silently assert nothing.
// ---------------------------------------------------------------------------
describe('resolver-flip smoke fixture', () => {
  it('exposes at least 20 known tenant hosts to probe', () => {
    const checks = defaultExpectations()
    expect(checks.length).toBeGreaterThanOrEqual(20)
  })

  it('derives carrying subdomains from the live middleware bespoke set (no drift)', () => {
    const slugs = bespokeSlugsFromMiddleware()
    expect(slugs).toContain('nycmaid')
    // every carrying-subdomain check is <slug>.fullloopcrm.com -> that slug
    for (const c of defaultExpectations().filter((e) => e.source === 'carrying-subdomain')) {
      expect(c.host).toBe(`${c.expectedSlug}.fullloopcrm.com`)
      expect(slugs).toContain(c.expectedSlug)
    }
  })

  it('every expectation carries a non-empty host and expected slug', () => {
    for (const c of defaultExpectations()) {
      expect(c.host.length).toBeGreaterThan(0)
      expect(c.expectedSlug.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// PART A — LIVE RESOLUTION (opt-in via SMOKE_RUN=1)
// ---------------------------------------------------------------------------
const RUN_LIVE = !!process.env.SMOKE_RUN

type ProbeResult = { status: number; slug: string | null; finalUrl: string }

/**
 * Probe one host and read the tenant the deploy resolved it to.
 *
 * Two modes:
 *   • SMOKE_TARGET_URL set  → hit that base URL with an overridden Host header
 *     (preview mode — the deployment must honor the Host header; see runbook).
 *   • SMOKE_TARGET_URL unset → hit https://<host>/ directly (canonical
 *     post-DNS-flip mode).
 *
 * The resolved tenant is read from the x-tenant-slug response header that
 * rewriteToSite() sets in src/middleware.ts.
 */
async function probe(host: string): Promise<ProbeResult> {
  const target = process.env.SMOKE_TARGET_URL?.replace(/\/+$/, '')
  const url = target ? `${target}/` : `https://${host}/`
  const headers: Record<string, string> = { 'user-agent': 'resolver-flip-smoke' }
  if (target) {
    headers['host'] = host
    headers['x-forwarded-host'] = host
  }
  const res = await fetch(url, { headers, redirect: 'follow' })
  return { status: res.status, slug: res.headers.get('x-tenant-slug'), finalUrl: res.url }
}

describe.skipIf(!RUN_LIVE)('PART A — live resolution against a deployed URL', () => {
  const checks: DomainExpectation[] = smokeExpectations()

  it.each(checks.map((c) => [c.host, c.expectedSlug, c] as const))(
    'resolves %s -> tenant "%s"',
    async (host, expectedSlug) => {
      const { status, slug, finalUrl } = await probe(host)

      // The deploy must actually serve something for this host.
      expect(status, `${host}: HTTP ${status} (${finalUrl})`).toBeLessThan(400)

      // The x-tenant-slug header is the resolver's verdict. Missing = either the
      // host resolved to no tenant, or the CDN stripped x-* response headers
      // (see runbook "header stripped" fallback).
      expect(
        slug,
        `${host}: no x-tenant-slug on response (${finalUrl}). Host did not resolve to a tenant, ` +
          `or x-* response headers are being stripped — use content-assertion fallback (runbook).`,
      ).not.toBeNull()

      // The WRONG-TENANT PROBE: resolving to any slug other than expected is the
      // brand-swap failure this whole flip exists to prevent.
      expect(
        slug,
        `${host}: resolved to "${slug}" but expected "${expectedSlug}" — WRONG TENANT (brand swap).`,
      ).toBe(expectedSlug)
    },
    15_000,
  )
})

// ---------------------------------------------------------------------------
// PART B — SYNTHETIC DIVERGENCE (always runs, fully mocked, zero prod writes)
// ---------------------------------------------------------------------------
// Mocked Supabase query builder: .single() result is decided by a per-test
// resolver keyed on (table, eq-filters). Nothing here touches a real DB, so the
// divergence we synthesize is never persisted anywhere.
type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => resolve(table, eqs),
    maybeSingle: async () => resolve(table, eqs),
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

// Imported AFTER the mock is declared (vi.mock is hoisted). Fresh module state
// per test file means the resolver's in-memory cache does not leak across files.
import { getTenantByDomain } from './tenant-lookup'

const tenantRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  domain: 'acme.com',
  status: 'active',
  ...over,
})

const domainRow = (over: Partial<Record<string, unknown>> = {}) => ({
  tenant_id: 't-1',
  domain: 'acme.com',
  active: true,
  routing_mode: 'template',
  vercel_project: 'platform',
  status: 'active',
  ...over,
})

beforeEach(() => {
  resolve = () => ({ data: null, error: null })
})

describe('PART B — assert-and-refuse fires on synthetic divergence', () => {
  it('FIRES: tenant_domains -> A but legacy tenants.domain -> B throws TENANT_DIVERGENCE (serves nothing)', async () => {
    // synthetic-divergence-host is claimed by tenant_domains -> t-correct AND by a
    // stale legacy tenants.domain row -> t-wrong. Purely in the mock; never written.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'synthetic-divergence-host.com')
        return { data: domainRow({ tenant_id: 't-correct', domain: 'synthetic-divergence-host.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-correct')
        return { data: tenantRow({ id: 't-correct', slug: 'correct-tenant' }), error: null }
      if (table === 'tenants' && eqs.domain === 'synthetic-divergence-host.com')
        return { data: tenantRow({ id: 't-wrong', slug: 'wrong-tenant' }), error: null }
      return { data: null, error: null }
    }

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getTenantByDomain('synthetic-divergence-host.com')).rejects.toThrow(
      'TENANT_DIVERGENCE host=synthetic-divergence-host.com td=t-correct legacy=t-wrong',
    )
    // The loud, greppable line ops will alert on must have been emitted.
    expect(errSpy).toHaveBeenCalledWith(
      'TENANT_DIVERGENCE host=synthetic-divergence-host.com td=t-correct legacy=t-wrong',
    )
    errSpy.mockRestore()
  })

  it('does NOT fire when both sources agree on the tenant', async () => {
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'agree-host.com')
        return { data: domainRow({ tenant_id: 't-same', domain: 'agree-host.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-same')
        return { data: tenantRow({ id: 't-same', slug: 'agree-tenant' }), error: null }
      if (table === 'tenants' && eqs.domain === 'agree-host.com')
        return { data: tenantRow({ id: 't-same', slug: 'agree-tenant' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('agree-host.com')
    expect(t?.id).toBe('t-same')
    expect(t?.slug).toBe('agree-tenant')
  })

  it('WRONG-TENANT PROBE: a dangling tenant_domains pointer resolves to null, never the legacy tenant', async () => {
    // tenant_domains claims the host for t-gone (which no longer resolves); a
    // stale legacy row would map it to t-other. Falling through would brand-swap.
    resolve = (table, eqs) => {
      if (table === 'tenant_domains' && eqs.domain === 'dangling-host.com')
        return { data: domainRow({ tenant_id: 't-gone', domain: 'dangling-host.com' }), error: null }
      if (table === 'tenants' && eqs.id === 't-gone') return { data: null, error: null }
      if (table === 'tenants' && eqs.domain === 'dangling-host.com')
        return { data: tenantRow({ id: 't-other', slug: 'other-tenant' }), error: null }
      return { data: null, error: null }
    }

    const t = await getTenantByDomain('dangling-host.com')
    expect(t).toBeNull()
  })
})
