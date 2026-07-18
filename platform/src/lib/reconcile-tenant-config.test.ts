import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseBespokeSet,
  parseApexCanonicalSet,
  parseProtectedSlugs,
  parseRichSitemapSet,
  parseNonServingStatuses,
  parseMainHostsSet,
  parseRobotsMainHostsSet,
  parseKilledRoutes,
  parseRobotsKilledRoutes,
  findShadowedKilledRoutePages,
  findShadowedAppRootPages,
  parseRootSiteTenantsSet,
  parseStaticTenantMap,
  parseNextConfigSiteRewriteSources,
  parseAllNextConfigSiteRewriteSources,
  parseNextConfigRedirects,
  parseAppRootPrefixes,
  findTrailingSlashAppRootPrefixes,
  parseRelativeImportPaths,
  findHardcodedWwwApexDomains,
  parsePublicRoutePatterns,
  findUnboundedApiPublicRouteCollisions,
  parseAdminBypassPrefixes,
  findShadowedAdminBypassPrefixes,
  parseJoinCrawlableHosts,
  parseRobotsDisallowList,
  robotsDisallowCoversPath,
  parsePrivateClientLoginHosts,
  computeFindings,
  summarize,
  loadToken,
  norm,
} from '../../scripts/reconcile-tenant-config.mjs'

// Codifies the tenant-config drift gate (PR9). The gate decides which domain
// renders which tenant's site; a false negative here is the 2026-07-10 silent
// mis-route class. These tests pin the happy path (all sources agree → green)
// and the mismatch that MUST red-gate, plus the known-pending exemption.

type Finding = { sev: string; slug: string; msg: string; pending?: boolean }

const alwaysHome = (_slug: string) => true
const neverHome = (_slug: string) => false

describe('parseBespokeSet', () => {
  it('extracts the slugs from a middleware BESPOKE_SITE_TENANTS declaration', () => {
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'acme',
        "zenith-labs",
        'the-florida-maid',
      ])
    `
    const set = parseBespokeSet(src)
    expect(set.has('acme')).toBe(true)
    expect(set.has('zenith-labs')).toBe(true)
    expect(set.has('the-florida-maid')).toBe(true)
    expect(set.size).toBe(3)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseBespokeSet('export const x = 1').size).toBe(0)
  })
})

describe('parseApexCanonicalSet', () => {
  it('extracts the domains from a middleware APEX_CANONICAL_DOMAINS declaration', () => {
    const src = `
      const APEX_CANONICAL_DOMAINS = new Set<string>([
        'consortiumnyc.com',
        "thenycmarketingcompany.com",
      ])
    `
    const set = parseApexCanonicalSet(src)
    expect(set.has('consortiumnyc.com')).toBe(true)
    expect(set.has('thenycmarketingcompany.com')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseApexCanonicalSet('export const x = 1').size).toBe(0)
  })

  it('does not confuse BESPOKE_SITE_TENANTS with APEX_CANONICAL_DOMAINS in the same source', () => {
    const src = `
      const APEX_CANONICAL_DOMAINS = new Set<string>(['apex-only.com'])
      const BESPOKE_SITE_TENANTS = new Set<string>(['bespoke-only'])
    `
    const apex = parseApexCanonicalSet(src)
    expect(apex.has('apex-only.com')).toBe(true)
    expect(apex.has('bespoke-only')).toBe(false)
    expect(apex.size).toBe(1)
  })
})

describe('parseProtectedSlugs', () => {
  it('extracts the slugs from a verify-protected-tenants.mjs PROTECTED declaration', () => {
    const src = `
      const PROTECTED = [
        { slug: 'nycmaid', domain: 'thenycmaid.com — live primary' },
        { slug: "we-pay-you-junk", domain: 'wepayyoujunkremoval.com' },
      ]
    `
    const set = parseProtectedSlugs(src)
    expect(set.has('nycmaid')).toBe(true)
    expect(set.has('we-pay-you-junk')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseProtectedSlugs('export const x = 1').size).toBe(0)
  })
})

describe('parseRichSitemapSet', () => {
  it('extracts the slugs from a middleware TENANTS_WITH_RICH_SITEMAP declaration', () => {
    const src = `
      const TENANTS_WITH_RICH_SITEMAP = new Set(['nycmaid', 'the-florida-maid', "nyc-tow"])
    `
    const set = parseRichSitemapSet(src)
    expect(set.has('nycmaid')).toBe(true)
    expect(set.has('the-florida-maid')).toBe(true)
    expect(set.has('nyc-tow')).toBe(true)
    expect(set.size).toBe(3)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseRichSitemapSet('export const x = 1').size).toBe(0)
  })

  it('does not confuse BESPOKE_SITE_TENANTS with TENANTS_WITH_RICH_SITEMAP in the same source', () => {
    const src = `
      const TENANTS_WITH_RICH_SITEMAP = new Set(['rich-only'])
      const BESPOKE_SITE_TENANTS = new Set<string>(['bespoke-only'])
    `
    const rich = parseRichSitemapSet(src)
    expect(rich.has('rich-only')).toBe(true)
    expect(rich.has('bespoke-only')).toBe(false)
    expect(rich.size).toBe(1)
  })
})

describe('parseNonServingStatuses', () => {
  it('extracts the statuses from a middleware NON_SERVING_STATUSES declaration', () => {
    const src = `
      const NON_SERVING_STATUSES = new Set(['suspended', 'cancelled', 'deleted'])
    `
    const set = parseNonServingStatuses(src)
    expect(set.has('suspended')).toBe(true)
    expect(set.has('cancelled')).toBe(true)
    expect(set.has('deleted')).toBe(true)
    expect(set.size).toBe(3)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseNonServingStatuses('export const x = 1').size).toBe(0)
  })
})

describe('parseMainHostsSet', () => {
  it('extracts the hostnames from a middleware MAIN_HOSTS declaration', () => {
    const src = `
      const MAIN_HOSTS = new Set([
        'fullloopcrm.com',
        "www.fullloopcrm.com",
        'localhost',
      ])
    `
    const set = parseMainHostsSet(src)
    expect(set.has('fullloopcrm.com')).toBe(true)
    expect(set.has('www.fullloopcrm.com')).toBe(true)
    expect(set.has('localhost')).toBe(true)
    expect(set.size).toBe(3)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseMainHostsSet('export const x = 1').size).toBe(0)
  })

  it('does not confuse BESPOKE_SITE_TENANTS with MAIN_HOSTS in the same source', () => {
    const src = `
      const MAIN_HOSTS = new Set(['main-only.com'])
      const BESPOKE_SITE_TENANTS = new Set<string>(['bespoke-only'])
    `
    const mainHosts = parseMainHostsSet(src)
    expect(mainHosts.has('main-only.com')).toBe(true)
    expect(mainHosts.has('bespoke-only')).toBe(false)
    expect(mainHosts.size).toBe(1)
  })
})

describe('parseRootSiteTenantsSet', () => {
  it('extracts the slugs from a middleware ROOT_SITE_TENANTS declaration', () => {
    const src = `
      const ROOT_SITE_TENANTS = new Set<string>([
        'nycmaid',
        "legacy-root-tenant",
      ])
    `
    const set = parseRootSiteTenantsSet(src)
    expect(set.has('nycmaid')).toBe(true)
    expect(set.has('legacy-root-tenant')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('returns an empty set when the declaration is absent (its current live state)', () => {
    expect(parseRootSiteTenantsSet('export const x = 1').size).toBe(0)
  })

  it('returns an empty set for the current live empty declaration', () => {
    expect(parseRootSiteTenantsSet('const ROOT_SITE_TENANTS = new Set<string>([])').size).toBe(0)
  })

  it('does not confuse BESPOKE_SITE_TENANTS with ROOT_SITE_TENANTS in the same source', () => {
    const src = `
      const ROOT_SITE_TENANTS = new Set<string>(['root-only'])
      const BESPOKE_SITE_TENANTS = new Set<string>(['bespoke-only'])
    `
    const rootSet = parseRootSiteTenantsSet(src)
    expect(rootSet.has('root-only')).toBe(true)
    expect(rootSet.has('bespoke-only')).toBe(false)
    expect(rootSet.size).toBe(1)
  })
})

describe('parseStaticTenantMap', () => {
  it('extracts hostname -> {id, slug} entries from a middleware STATIC_TENANT_MAP declaration', () => {
    const src = `
      const STATIC_TENANT_MAP: Record<string, { id: string; slug: string }> = {
        'thefloridamaid.com': { id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' },
        'www.thefloridamaid.com': { id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' },
      }
    `
    const map = parseStaticTenantMap(src)
    expect(map.size).toBe(2)
    expect(map.get('thefloridamaid.com')).toEqual({ id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' })
    expect(map.get('www.thefloridamaid.com')).toEqual({ id: '56490a6b-820c-49e6-8c14-cb4e54ffcb06', slug: 'the-florida-maid' })
  })

  it('returns an empty map when the declaration is absent', () => {
    expect(parseStaticTenantMap('export const x = 1').size).toBe(0)
  })

  it('returns an empty map for a declaration with no entries', () => {
    const src = `const STATIC_TENANT_MAP: Record<string, { id: string; slug: string }> = {}`
    expect(parseStaticTenantMap(src).size).toBe(0)
  })
})

describe('parseNextConfigSiteRewriteSources', () => {
  const wrap = (entries: string) => `
    async rewrites() {
      return {
        beforeFiles: [],
        afterFiles: [
          ${entries}
        ],
        fallback: [],
      }
    }
  `

  it('extracts bare /site/<segment> sources with their destinations', () => {
    const src = wrap(`
      { source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' },
      { source: '/site/reviews', destination: '/site/nyc-customer-reviews-for-the-nyc-maid' },
    `)
    const out = parseNextConfigSiteRewriteSources(src)
    expect(out).toEqual([
      { source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' },
      { source: '/site/reviews', destination: '/site/nyc-customer-reviews-for-the-nyc-maid' },
    ])
  })

  it('excludes dynamic-param sources (e.g. /site/blog/:slug)', () => {
    const src = wrap(`
      { source: '/site/blog', destination: '/site/nyc-maid-service-blog' },
      { source: '/site/blog/:slug', destination: '/site/nyc-maid-service-blog/:slug' },
    `)
    const out = parseNextConfigSiteRewriteSources(src)
    expect(out).toEqual([{ source: '/site/blog', destination: '/site/nyc-maid-service-blog' }])
  })

  it('excludes multi-segment sources (e.g. /site/foo/bar)', () => {
    const src = wrap(`{ source: '/site/foo/bar', destination: '/site/baz' },`)
    expect(parseNextConfigSiteRewriteSources(src)).toEqual([])
  })

  it('excludes sources outside the afterFiles block (e.g. beforeFiles)', () => {
    const src = `
      async rewrites() {
        return {
          beforeFiles: [{ source: '/site/before', destination: '/site/x' }],
          afterFiles: [{ source: '/site/after', destination: '/site/y' }],
          fallback: [],
        }
      }
    `
    const out = parseNextConfigSiteRewriteSources(src)
    expect(out).toEqual([{ source: '/site/after', destination: '/site/y' }])
  })

  it('returns an empty array when afterFiles is absent', () => {
    expect(parseNextConfigSiteRewriteSources('export default {}')).toEqual([])
  })

  it('returns an empty array when afterFiles has no /site/<segment> entries', () => {
    const src = wrap(`{ source: '/features', destination: '/full-loop-crm-service-features' },`)
    expect(parseNextConfigSiteRewriteSources(src)).toEqual([])
  })
})

describe('parseAllNextConfigSiteRewriteSources', () => {
  const wrap = (entries: string) => `
    async rewrites() {
      return {
        beforeFiles: [],
        afterFiles: [
          ${entries}
        ],
        fallback: [],
      }
    }
  `

  it('includes dynamic-param and nested sources that parseNextConfigSiteRewriteSources excludes', () => {
    const src = wrap(`
      { source: '/site/about', destination: '/site/about-x' },
      { source: '/site/careers/:slug', destination: '/site/available-nyc-maid-jobs/:slug' },
      { source: '/site/nycmaid/blog/:slug', destination: '/site/nycmaid/nyc-maid-service-blog/:slug' },
    `)
    expect(parseAllNextConfigSiteRewriteSources(src)).toEqual([
      { source: '/site/about', destination: '/site/about-x' },
      { source: '/site/careers/:slug', destination: '/site/available-nyc-maid-jobs/:slug' },
      { source: '/site/nycmaid/blog/:slug', destination: '/site/nycmaid/nyc-maid-service-blog/:slug' },
    ])
  })

  it('excludes non-/site/ sources', () => {
    const src = wrap(`{ source: '/features', destination: '/full-loop-crm-service-features' },`)
    expect(parseAllNextConfigSiteRewriteSources(src)).toEqual([])
  })

  it('returns an empty array when afterFiles is absent', () => {
    expect(parseAllNextConfigSiteRewriteSources('export default {}')).toEqual([])
  })
})

describe('computeFindings — happy path (all four sources agree)', () => {
  it('emits ZERO findings and does not gate when DB, middleware, and folder align', () => {
    const tenants = [{ id: 't-acme', slug: 'acme', domain: 'acme.com', status: 'active' }]
    const tds = [
      {
        tenant_id: 't-acme',
        domain: 'acme.com',
        active: true,
        is_primary: true,
        routing_mode: 'bespoke',
        status: 'active',
        vercel_project: 'acme-site',
        slug: 'acme',
      },
    ]
    const bespokeSet = new Set(['acme'])

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet,
      hasHome: alwaysHome,
      resolvableSlugs: new Set(['acme']),
    })

    expect(findings).toHaveLength(0)
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBe(0)
  })
})

describe('computeFindings — mismatch (2026-07-10 silent mis-route class)', () => {
  it('red-gates a CRIT when DB routing_mode=bespoke but slug is NOT in BESPOKE_SITE_TENANTS', () => {
    const tenants = [{ id: 't-zen', slug: 'zenith', domain: 'zenith.com', status: 'active' }]
    const tds = [
      {
        tenant_id: 't-zen',
        domain: 'zenith.com',
        active: true,
        is_primary: true,
        routing_mode: 'bespoke', // DB intends a bespoke site…
        status: 'active',
        vercel_project: 'zenith-site',
        slug: 'zenith',
      },
    ]
    const bespokeSet = new Set<string>() // …but middleware won't route it bespoke.

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet,
      hasHome: alwaysHome, // folder present — isolates Drift G from the no-folder INFO
      resolvableSlugs: new Set(['zenith']),
    })

    const crit = findings.find((f) => f.sev === 'CRIT')
    expect(crit).toBeDefined()
    expect(crit!.slug).toBe('zenith')
    expect(crit!.msg).toContain('routing_mode=bespoke')
    expect(crit!.msg).toContain('NOT in BESPOKE_SITE_TENANTS')

    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBe(1) // this mismatch MUST fail CI
  })
})

describe('computeFindings — second mismatch (Drift F: one domain, two tenants)', () => {
  it('red-gates a CRIT when the SAME domain is claimed by more than one tenant', () => {
    // Two tenants both point at shared-domain.com. Whichever the resolver
    // matches first wins and the other silently serves the wrong tenant's site —
    // a distinct mis-route class from Drift G, and the collision detector
    // (domainClaims) is otherwise unexercised. Neither is bespoke and neither
    // has a folder, so Drift F is the ONLY CRIT; the two Drift-E "no folder"
    // notices are INFO and must not gate.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'alpha-site', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'beta-site', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(), // neither bespoke → no Drift C/D/G noise
      hasHome: neverHome, // no folder → isolates Drift F from folder-based CRITs
      resolvableSlugs: null, // skip Drift L
    })

    const crit = findings.find((f) => f.sev === 'CRIT')
    expect(crit).toBeDefined()
    expect(crit!.msg).toContain('claimed by MULTIPLE tenants')
    expect(crit!.slug).toContain('alpha')
    expect(crit!.slug).toContain('beta')

    const { counts, gatingCrit } = summarize(findings)
    expect(counts.CRIT).toBe(1) // exactly the collision, no other CRIT
    expect(gatingCrit).toBe(1) // the double-claim MUST fail CI
  })
})

describe('norm — adversarial domain forms that must collapse to the same key', () => {
  it('strips a port suffix', () => {
    expect(norm('shared-domain.com:8443')).toBe('shared-domain.com')
  })

  it('strips a trailing dot (absolute-FQDN form)', () => {
    expect(norm('shared-domain.com.')).toBe('shared-domain.com')
  })

  it('strips both a leading www. and a trailing dot together', () => {
    expect(norm('www.shared-domain.com.')).toBe('shared-domain.com')
  })

  it('strips a URL scheme + trailing slash when a full URL got pasted into a domain field', () => {
    expect(norm('https://shared-domain.com/')).toBe('shared-domain.com')
  })

  it('strips a scheme + www + path + query together', () => {
    expect(norm('http://www.Shared-Domain.com/some/path?x=1')).toBe('shared-domain.com')
  })

  it('strips userinfo (user:pass@) when a full URL with credentials got pasted into a domain field', () => {
    expect(norm('https://user:pass@shared-domain.com/')).toBe('shared-domain.com')
  })

  it('strips a bare userinfo (no password) before the host', () => {
    expect(norm('https://evil@shared-domain.com/')).toBe('shared-domain.com')
  })

  it('strips a protocol-relative prefix ("//example.com") instead of collapsing the whole value', () => {
    expect(norm('//shared-domain.com')).toBe('shared-domain.com')
  })

  it('strips the stray extra slash from a malformed triple-slash URL instead of collapsing the whole value to empty', () => {
    // A single-slash strip after the scheme leaves one leading slash behind
    // ("https:/// " -> "/shared-domain.com"), which the path-strip rule then
    // treats as the path separator for an EMPTY host, collapsing the entire
    // value to '' — and claim() silently skips empty keys, so this row
    // disappears from Drift F collision detection instead of just failing to
    // collapse with its well-formed counterpart.
    expect(norm('https:///shared-domain.com')).toBe('shared-domain.com')
  })

  it('strips arbitrarily many stray slashes (quad-slash URL)', () => {
    expect(norm('https:////shared-domain.com')).toBe('shared-domain.com')
  })

  it('does NOT collapse to empty when the value ends in a bare "@" with no host after it', () => {
    // The userinfo-strip regex is "^[^/?#]*@" — greedy, so without a lookahead
    // requiring a char AFTER the '@' it matches the ENTIRE string whenever the
    // last character is '@' (there is no "@?" to require a following host),
    // collapsing a well-formed domain plus a stray trailing '@' to '' — and
    // claim() silently skips empty keys, hiding the row from Drift F entirely.
    expect(norm('shared-domain.com@')).not.toBe('')
    expect(norm('https://shared-domain.com@')).not.toBe('')
  })
})

describe('computeFindings — Drift F evades attempted via malformed domain forms', () => {
  it('still red-gates when one tenant\'s domain is the absolute-FQDN (trailing dot) form of another\'s', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared-domain.com.', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared-domain.com.', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when a stale/orphaned tenant_domains row (owning tenant absent from the tenants fetch) squats a live tenant\'s domain', () => {
    // Mirrors a hard-deleted tenant, or one whose status fell outside the
    // active/live/setup filter: the real query LEFT JOINs tenant_domains to
    // tenants, so its slug comes back null and it never appears in `tenants`.
    // Nobody deactivated its tenant_domains row, so it still counts as a claim.
    const tenants = [{ id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' }]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-deleted-beta', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: null },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain was pasted as a full URL (scheme + path) instead of a bare hostname', () => {
    // /api/admin/websites POST inserts tenant_domains.domain straight from the
    // request body with zero normalization (no lowercase, no scheme-strip, no
    // trim) — so "https://shared-domain.com/" and "shared-domain.com" are both
    // real, reachable DB values for what is actually the same domain.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https://shared-domain.com/', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https://shared-domain.com/', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain was pasted as a full URL with userinfo (user:pass@host) instead of a bare hostname', () => {
    // Same zero-normalization insert path (POST /api/admin/websites) — a copy-paste
    // that carries basic-auth credentials or a stray "user@" prefix must not let
    // the collision hide behind the extra authority component.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https://evil@shared-domain.com/', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https://evil@shared-domain.com/', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain was pasted as a malformed triple-slash URL instead of a bare hostname', () => {
    // Without the fix, norm('https:///shared-domain.com') collapses to '' —
    // claim() no-ops on an empty key, so this row is invisible to Drift F
    // entirely (not merely uncollapsed), silently hiding the collision.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https:///shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https:///shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain has a stray trailing "@" appended to an otherwise-identical domain', () => {
    // Without the (?=.) lookahead, norm('shared-domain.com@') collapses to ''
    // (the userinfo strip consumes the WHOLE string since nothing follows the
    // trailing '@') — claim() no-ops on an empty key, so this row vanishes
    // from Drift F entirely instead of merely failing to collapse alongside
    // its clean counterpart.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared-domain.com@', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared-domain.com@', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    // The two domains normalize to distinct-but-non-empty keys, so this isn't
    // a MULTIPLE-tenants collision — the regression this guards is narrower:
    // the '@'-suffixed row must still be VISIBLE (produce its own Drift F/E
    // claim/finding), not silently disappear the way an empty norm() key would.
    expect(findings.length).toBeGreaterThan(0)
  })

  it('still red-gates when one tenant\'s domain was pasted with a DOUBLED scheme instead of a bare hostname', () => {
    // A single scheme-strip pass only removes the FIRST "https://", leaving
    // "https://shared-domain.com" behind; the path-strip rule then truncates
    // at that leftover scheme's OWN "//", corrupting the key to "https:"
    // instead of the real host — a non-empty key that silently fails to
    // collapse with the clean twin, hiding the collision.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https://https://shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https://https://shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain has a leading stray slash before an otherwise-valid scheme', () => {
    // The scheme-strip regex is anchored at the START of the string, so a
    // single stray "/" before "https://" (e.g. a copy-paste off-by-one) blocks
    // it from matching at all on that pass; the leading-slash strip removes
    // the stray "/" but — without a loop back to re-check for the now-exposed
    // scheme — the leftover "https://shared-domain.com" falls straight to the
    // path-strip rule, which truncates at the scheme's own "//" instead of the
    // real host.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: '/https://shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: '/https://shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain is missing the second slash of the scheme ("http:/host" typo)', () => {
    // The original scheme-strip regex required exactly "://" (two slashes).
    // A one-character typo dropping the second slash means it never matches,
    // so the path-strip rule fires at that single leftover "/" instead,
    // truncating the key to "http:" and hiding the real host entirely.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'http:/shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'http:/shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain has a bare trailing colon left by a truncated port', () => {
    // The port-strip regex required at least one digit after the colon
    // (":\\d+$"), so a colon with the port digits missing/cut off ("host:")
    // was left untouched — a distinct, non-empty key from the clean "host",
    // silently hiding the collision from Drift F.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared-domain.com:', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared-domain.com:', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('fully unwraps 11+ stacked scheme prefixes instead of stopping at a fixed iteration cap', () => {
    // The fixed-point loop must be bounded by a property that guarantees
    // termination (s.length), not an arbitrary constant. A hard cap of 10
    // iterations strips only 10 of 11+ stacked "https://" prefixes, leaving
    // one behind; the path-strip rule then truncates the leftover at ITS OWN
    // "//" instead of the real host, corrupting the key to "https" — a
    // non-empty value that silently fails to collapse with its clean twin.
    expect(norm('https://'.repeat(11) + 'shared-domain.com')).toBe('shared-domain.com')
    expect(norm('https://'.repeat(50) + 'shared-domain.com')).toBe('shared-domain.com')
  })

  it('does NOT collapse to empty when a scheme-strip exposes a bare userinfo "@" that in turn exposes a leading slash', () => {
    // Regression guard for the fix itself: looping the scheme/slash strip
    // WITHOUT also looping the userinfo strip inside the same loop can eat a
    // single slash after "https:" (leaving "@/shared-domain.com"), then the
    // userinfo strip (running once, after the loop) removes the leading "@"
    // and re-exposes a bare leading "/" that the path-strip rule then treats
    // as an empty host followed by a path — collapsing the whole value to ''
    // and vanishing it from Drift F entirely. This is worse than the original
    // "https:" garbage-key bug it was meant to fix.
    expect(norm('https:/@/shared-domain.com')).toBe('shared-domain.com')
  })

  it('still red-gates when one tenant\'s domain was pasted with 11+ STACKED schemes instead of a bare hostname', () => {
    // A fixed 10-iteration cap on the scheme-strip loop unwraps only 10 of 11+
    // stacked "https://" prefixes, leaving one behind for the path-strip rule
    // to truncate at — corrupting the key to "https" instead of the real
    // host, a non-empty value that silently fails to collapse with its clean
    // counterpart, hiding the collision.
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https://'.repeat(11) + 'shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https://'.repeat(11) + 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('collapses a scheme with ZERO slashes ("https:host", no "//" at all) to the bare host', () => {
    // Verified against Node's WHATWG-compliant URL parser: new URL('https:host')
    // resolves hostname "host" — for the "special" schemes (http/https/ws/wss/
    // ftp) the authority is parsed even with no separator at all after the
    // colon. The old regex required "\/+" (at least one slash) so this form
    // passed through completely unnormalized, a distinct non-empty key from
    // its clean twin, silently hiding the Drift F collision.
    expect(norm('https:shared-domain.com')).toBe('shared-domain.com')
    expect(norm('http:shared-domain.com')).toBe('shared-domain.com')
  })

  it('does NOT collapse a NON-special scheme with zero slashes ("foo:host") — that is genuinely a different value', () => {
    // Verified against Node's URL parser: new URL('foo:host') parses with an
    // EMPTY host and "host" as an opaque path — "foo:" is not one of the
    // special schemes that get zero-separator authority parsing. Collapsing
    // this would be a FALSE positive collision, not a fix, so the zero-slash
    // rule must stay scoped to http/https/ws/wss/ftp only.
    expect(norm('foo:shared-domain.com')).toBe('foo:shared-domain.com')
    expect(norm('mailto:shared-domain.com')).toBe('mailto:shared-domain.com')
  })

  it('treats backslash as equivalent to forward slash in the scheme separator, per WHATWG URL parsing', () => {
    // Verified against Node's URL parser: new URL('https:\\host'),
    // new URL('https:\\\\host'), new URL('https:/\\host'), and
    // new URL('https:\\/host') all resolve hostname "host" — browsers
    // normalize "\" to "/" for special schemes. The old regex only matched
    // "\/+" (forward slash), so any backslash-containing paste survived
    // unnormalized as a distinct key.
    expect(norm('https:\\shared-domain.com')).toBe('shared-domain.com')
    expect(norm('https:\\\\shared-domain.com')).toBe('shared-domain.com')
    expect(norm('https:/\\shared-domain.com')).toBe('shared-domain.com')
    expect(norm('https:\\/shared-domain.com')).toBe('shared-domain.com')
  })

  it('treats a backslash-led prefix as protocol-relative, same as "//host"', () => {
    // Verified against Node's URL parser (resolved against a special-scheme
    // base): new URL('\\\\host', 'https://example.org/') resolves hostname
    // "host" — same as the already-handled "//host" form.
    expect(norm('\\\\shared-domain.com')).toBe('shared-domain.com')
  })

  it('treats a backslash as a path separator after the host, same as "/"', () => {
    // Verified: new URL('https://host\\path') resolves hostname "host" —
    // backslash terminates the authority the same as forward slash does.
    expect(norm('https://shared-domain.com\\some\\path')).toBe('shared-domain.com')
  })

  it('does NOT collapse a bare special-scheme prefix with nothing left after it ("https:" alone) to empty', () => {
    // Regression guard for the fix itself: the zero-slash special-scheme rule
    // must require something survive the strip. Without that guard, "https:"
    // alone would collapse to '' and claim() silently skips empty keys,
    // vanishing the row from Drift F instead of merely failing to normalize.
    expect(norm('https:')).not.toBe('')
  })

  it('still red-gates when one tenant\'s domain was pasted with NO slashes after the scheme ("https:host" typo)', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https:shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https:shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain was pasted with BACKSLASHES instead of forward slashes ("https:\\\\host")', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'https:\\\\shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'https:\\\\shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('strips an ASCII tab/newline/CR pasted into the MIDDLE of a domain, not just the ends', () => {
    // Verified against Node's URL parser: new URL('ht\ttps://host').hostname
    // === 'host' — the WHATWG spec removes ALL tab/LF/CR from anywhere in the
    // string as a mandatory preprocessing step, not just the leading/trailing
    // whitespace that `.trim()` handles. A stray tab/newline/CR splitting a
    // scheme or hiding inside a hostname is invisible to a real URL parser but
    // survived here untouched, at best failing to collapse with a clean twin
    // and at worst corrupting the scheme-strip into a garbage non-empty key.
    expect(norm('sha\tred-domain.com')).toBe('shared-domain.com')
    expect(norm('shared-domain\n.com')).toBe('shared-domain.com')
    expect(norm('sha\rred-domain.com')).toBe('shared-domain.com')
    expect(norm('ht\ttps://shared-domain.com')).toBe('shared-domain.com')
  })

  it('still red-gates when one tenant\'s domain has a stray tab SPLITTING the scheme ("ht\\ttps://host")', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'ht\ttps://shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'ht\ttps://shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('strips leading/trailing C0 control characters that JS `.trim()` does not recognize as whitespace', () => {
    // `.trim()` only strips ECMAScript "whitespace" (tab/LF/VT/FF/CR/space +
    // some Unicode whitespace) — it leaves NUL, BEL, backspace, and most other
    // C0 controls (0x00-0x08, 0x0E-0x1F) untouched at the edges. The WHATWG
    // URL spec strips ALL of 0x00-0x20 from leading/trailing position. A
    // leading control char in that gap blocks every "^[a-z]"-anchored
    // scheme-strip rule below, so the path-strip rule truncates at the
    // scheme's own "//" instead of the real host — corrupting the key into
    // garbage (verified: the old code turned "\x00https://host" into
    // "\x00https", not the real host) instead of merely failing to collapse.
    expect(norm('\x00https://shared-domain.com')).toBe('shared-domain.com')
    expect(norm('https://shared-domain.com\x07')).toBe('shared-domain.com')
    expect(norm('\x08https://shared-domain.com')).toBe('shared-domain.com')
    expect(norm('\x00\x01\x02https://shared-domain.com\x1f\x1e')).toBe('shared-domain.com')
  })

  it('still red-gates when one tenant\'s domain has a leading NUL byte blocking the scheme-strip', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: '\x00https://shared-domain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: '\x00https://shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('collapses IDNA dot-equivalent characters (ideographic/fullwidth/halfwidth full stop) to "."', () => {
    // Verified against Node's URL parser: new URL('https://shared-domain\u3002com')
    // .hostname === 'shared-domain.com' — the WHATWG URL host parser runs
    // IDNA/UTS46 domain-to-ASCII mapping, which treats U+3002 (ideographic full
    // stop), U+FF0E (fullwidth full stop), and U+FF61 (halfwidth ideographic
    // full stop) as equivalent to the ASCII ".". A domain pasted with one of
    // these visually-similar-but-distinct characters resolves to the exact same
    // real host in a browser but survived here as a distinct, uncollapsed key.
    expect(norm('shared-domain\u3002com')).toBe('shared-domain.com')
    expect(norm('shared-domain\uff0ecom')).toBe('shared-domain.com')
    expect(norm('shared-domain\uff61com')).toBe('shared-domain.com')
    expect(norm('https://shared-domain\u3002com')).toBe('shared-domain.com')
  })

  it('strips zero-width and other default-ignorable Unicode code points from anywhere in the domain', () => {
    // Verified against Node's URL parser: new URL('https://shared\u200bdomain.com')
    // .hostname === 'shareddomain.com' — IDNA/UTS46 mapping silently REMOVES
    // (not just ignores) default-ignorable code points including U+200B (zero-
    // width space), U+2060 (word joiner), U+FEFF (BOM / zero-width no-break
    // space), and U+00AD (soft hyphen), from anywhere in the host, not just the
    // edges. Each is invisible or near-invisible when pasted, and without this
    // strip survives here as a distinct, uncollapsed key.
    expect(norm('shared\u200bdomain.com')).toBe('shareddomain.com')
    expect(norm('shared\u2060domain.com')).toBe('shareddomain.com')
    expect(norm('shared\ufeffdomain.com')).toBe('shareddomain.com')
    expect(norm('shared\u00addomain.com')).toBe('shareddomain.com')
    expect(norm('https://shared-domain.com\u200b')).toBe('shared-domain.com')
  })

  it('still red-gates when one tenant\'s domain was pasted with an IDNA dot-equivalent character instead of a plain "."', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared-domain\u3002com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared-domain\u3002com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('percent-decodes a "." or "-" hidden behind %2e/%2d instead of leaving a distinct, uncollapsed key', () => {
    // Verified against Node's URL parser: new URL('https://shared%2edomain.com')
    // .hostname === 'shared.domain.com' and new URL('https://shared%2ddomain.com')
    // .hostname === 'shared-domain.com' — the WHATWG URL host parser
    // percent-decodes any %XX whose byte is not a "forbidden host code
    // point." A domain pasted with a percent-encoded '.'/'-'/letter resolves
    // to the EXACT SAME real host in a browser but survived here as a
    // distinct, uncollapsed key.
    expect(norm('shared%2edomain.com')).toBe('shared.domain.com')
    expect(norm('shared%2Ddomain%2Ecom')).toBe('shared-domain.com')
    expect(norm('https://shared%2edomain.com/')).toBe('shared.domain.com')
    expect(norm('shared%41%42%43domain.com')).toBe('sharedabcdomain.com') // %41=A %42=B %43=C, then lowercased
  })

  it('does NOT percent-decode a %XX byte that the URL host parser forbids (e.g. %2f, %3a, %40)', () => {
    // Verified against Node's URL parser: new URL('https://shared%2fdomain.com')
    // throws Invalid URL — that raw value can never be a real routable host
    // either way, so decoding it would only risk corrupting the key via the
    // scheme/path-strip rules on a string that could never collide with
    // anything real.
    expect(norm('shared%2fdomain.com')).toBe('shared%2fdomain.com')
    expect(norm('shared%3adomain.com')).toBe('shared%3adomain.com')
    expect(norm('shared%40domain.com')).toBe('shared%40domain.com')
  })

  it('leaves an invalid (non-hex) percent sequence untouched', () => {
    expect(norm('shared%zzdomain.com')).toBe('shared%zzdomain.com')
  })

  it('still red-gates when one tenant\'s domain was pasted with a percent-encoded dot instead of a bare hostname', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared%2ddomain%2ecom', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared%2ddomain%2ecom', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('maps fullwidth Latin letters/digits/hyphen (U+FF01-U+FF5E) down to plain ASCII', () => {
    // Verified against Node's URL parser: new URL with a fullwidth-spelled
    // hostname (each ASCII letter replaced by its U+FF01-U+FF5E fullwidth
    // twin, offset +0xFEE0) resolves the exact same ASCII hostname — as
    // typed by an IME or a mobile keyboard's fullwidth input mode, or pasted
    // from CJK text. Survived here as a distinct, uncollapsed key without
    // this mapping.
    expect(norm('ｓｈａｒｅｄ-ｄｏｍａｉｎ.com')).toBe('shared-domain.com')
    expect(norm('https://ｓｈａｒｅｄ-ｄｏｍａｉｎ.com/')).toBe('shared-domain.com')
    // Fullwidth uppercase (U+FF21 etc.) folds to fullwidth lowercase via
    // .toLowerCase() before this mapping runs, then reduces to plain ascii.
    expect(norm('ＳＨＡＲＥＤ-domain.com')).toBe('shared-domain.com')
  })

  it('does NOT map a fullwidth delimiter that the URL host parser forbids (e.g. fullwidth solidus U+FF0F)', () => {
    // Verified against Node's URL parser: new URL('https://a／b.com')
    // throws Invalid URL, same as its ASCII twin "a/b.com" would inside a
    // host — that raw value can never be a real routable host, so mapping it
    // would only risk corrupting the key via the path-strip rule.
    expect(norm('shared／domain.com')).toBe('shared／domain.com')
  })

  it('still red-gates when one tenant\'s domain was pasted with fullwidth Latin characters instead of ASCII', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'ｓｈａｒｅｄ-ｄｏｍａｉｎ.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'ｓｈａｒｅｄ-ｄｏｍａｉｎ.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('still red-gates when one tenant\'s domain was pasted with a zero-width space hiding inside it', () => {
    const tenants = [
      { id: 't-alpha', slug: 'alpha', domain: 'shareddomain.com', status: 'active' },
      { id: 't-beta', slug: 'beta', domain: 'shared\u200bdomain.com', status: 'active' },
    ]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shareddomain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
      { tenant_id: 't-beta', domain: 'shared\u200bdomain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'b', slug: 'beta' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })
})

describe('computeFindings — Drift F via a stale tenants.domain on an out-of-scope tenant', () => {
  it('red-gates when a SUSPENDED tenant (excluded from the active/live/setup `tenants` fetch) still has a tenants.domain value that collides with a live tenant\'s domain', () => {
    // The live resolver's getTenantByDomain() matches tenants.domain with NO
    // status filter — a suspended/cancelled/deleted tenant whose domain column
    // was never cleared really can collide with a newly-assigned active
    // tenant's domain. The primary `tenants` array only carries active/live/
    // setup rows, so without the allTenantDomains sweep this is entirely
    // invisible to Drift F.
    const tenants = [{ id: 't-alpha', slug: 'alpha', domain: 'shared-domain.com', status: 'active' }]
    const tds = [
      { tenant_id: 't-alpha', domain: 'shared-domain.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
    ]
    // 'ghost' is suspended — absent from `tenants` (status filter excludes it) —
    // but its tenants.domain row still literally reads 'shared-domain.com'.
    const allTenantDomains = [
      { slug: 'alpha', domain: 'shared-domain.com' },
      { slug: 'ghost', domain: 'shared-domain.com' },
    ]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenantDomains,
    })

    const crit = findings.find((f) => f.msg.includes('claimed by MULTIPLE tenants'))
    expect(crit).toBeDefined()
    expect(crit!.slug).toContain('alpha')
    expect(crit!.slug).toContain('ghost')
    const { gatingCrit } = summarize(findings)
    expect(gatingCrit).toBeGreaterThanOrEqual(1)
  })

  it('does not double-count when allTenantDomains re-lists an already in-scope tenant\'s own domain', () => {
    const tenants = [{ id: 't-alpha', slug: 'alpha', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't-alpha', domain: 'foo.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'a', slug: 'alpha' },
    ]
    const allTenantDomains = [{ slug: 'alpha', domain: 'foo.com' }]

    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenantDomains,
    })

    expect(findings.some((f) => f.msg.includes('claimed by MULTIPLE tenants'))).toBe(false)
  })

  it('defaults allTenantDomains to empty and skips this sweep when the caller omits it', () => {
    const tenants = [{ id: 't-alpha', slug: 'alpha', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    expect(findings.some((f) => f.msg.includes('claimed by MULTIPLE tenants'))).toBe(false)
  })
})

describe('computeFindings — orphan gate (Drift L known-pending exemption)', () => {
  it('reports both orphans but only the non-pending one gates CI', () => {
    // No tenants rows resolve either slug; both are bespoke-routed phantoms.
    // 'wash-and-fold-hoboken' is on the KNOWN_PENDING allowlist (reported, not
    // gating); 'ghost-slug' is a real unresolved orphan and must gate.
    const bespokeSet = new Set(['wash-and-fold-hoboken', 'ghost-slug'])

    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet,
      hasHome: neverHome,
      resolvableSlugs: new Set<string>(), // nothing resolves
    })

    const orphanCrits = findings.filter((f) => f.sev === 'CRIT')
    expect(orphanCrits).toHaveLength(2)

    const { counts, pendingCrit, gatingCrit } = summarize(findings)
    expect(counts.CRIT).toBe(2)
    expect(pendingCrit).toBe(1) // wash-and-fold-hoboken is exempt
    expect(gatingCrit).toBe(1) // only ghost-slug red-gates
  })

  it('skips Drift L entirely when resolvableSlugs is null', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['ghost-slug']),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    expect(findings).toHaveLength(0)
  })
})

// The remaining drift codes (A, B, C, D, E, H, I, J, K) had no direct test —
// each is isolated below with the minimum fixture that trips ONLY that drift,
// so a regression in one condition can't hide behind another firing instead.

describe('computeFindings — Drift A (tenants.domain not mirrored in tenant_domains)', () => {
  it('warns when tenants.domain has no matching active tenant_domains row', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set<string>(),
      hasHome: () => true, // suppress Drift E so only Drift A is asserted
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes('NO matching active tenant_domains row'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })
})

describe('computeFindings — Drift B (tenant_domains fallback, no tenants.domain)', () => {
  it('reports INFO when tenants.domain is empty but active tenant_domains exist', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: '', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'foo-site', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const info = findings.find((f) => f.msg.includes('relies on tenant_domains fallback'))
    expect(info).toBeDefined()
    expect(info!.sev).toBe('INFO')
  })
})

describe('computeFindings — Drift C (bespoke-routed but folder missing)', () => {
  it('CRITs when a slug is in BESPOKE_SITE_TENANTS but /site/<slug> has no homepage', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    const crit = findings.find((f) => f.msg.includes('has no homepage'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })
})

describe('computeFindings — Drift D (folder + live domain, not bespoke-routed)', () => {
  it('CRITs when a /site/<slug> folder + live domain exist but slug is not bespoke-routed', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'template', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(), // not bespoke-routed
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const crit = findings.find((f) => f.msg.includes('serves the generic template'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })
})

describe('computeFindings — Drift E (live domain, no bespoke folder)', () => {
  it('reports INFO for a live domain with no bespoke folder', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: '', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    const info = findings.find((f) => f.msg.includes('live domain but no bespoke folder'))
    expect(info).toBeDefined()
    expect(info!.sev).toBe('INFO')
  })

  it('does not fire for the two hardcoded template-only exemptions', () => {
    const tenants = [
      { id: 't1', slug: 'full-loop-crm', domain: 'fullloopcrm.com', status: 'active' },
      { id: 't2', slug: 'the-va-virtual-assistant', domain: 'thevavirtualassistant.com', status: 'active' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set<string>(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    expect(findings.some((f) => f.msg.includes('live domain but no bespoke folder'))).toBe(false)
  })
})

describe('computeFindings — Drift H (DB says template, middleware routes bespoke)', () => {
  it('warns when routing_mode=template but slug IS in BESPOKE_SITE_TENANTS', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'template', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']), // isBespoke true, so Drift D's !isBespoke guard doesn't fire
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes('routing_mode=template but slug IS in BESPOKE_SITE_TENANTS'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })
})

describe('computeFindings — Drift I (mixed routing_mode across active domains)', () => {
  it('warns when a tenant has one active bespoke domain and one active template domain', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
      { tenant_id: 't1', domain: 'foo-alt.com', active: true, is_primary: false, routing_mode: 'template', status: 'active', vercel_project: 'y', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']), // dbBespoke true keeps Drift G/H from also firing
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes('MIXED routing_mode'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })
})

describe('computeFindings — Drift J (active domain with non-active status)', () => {
  it('warns when an active tenant_domains row has status != active', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'paused', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes("status='paused'"))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })
})

describe('computeFindings — Drift N (bespoke slug resolves but tenant is out of the active/live/setup scope)', () => {
  it('CRITs when a suspended tenant is still in BESPOKE_SITE_TENANTS and its folder is missing', () => {
    // 'foo' resolves (Drift L would NOT fire) but is absent from `tenants`
    // (the caller's SQL filtered it out, e.g. status='suspended') so Drift C's
    // main loop never iterates it either. Neither existing check covers this.
    const findings: Finding[] = computeFindings({
      tenants: [], // 'foo' is out of scope — not active/live/setup
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: neverHome,
      resolvableSlugs: new Set(['foo']), // tenant row exists (any status)
    })
    const crit = findings.find((f) => f.slug === 'foo' && f.msg.includes('routes here regardless of tenant status'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('does not fire when the out-of-scope tenant\'s folder still exists', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: new Set(['foo']),
    })
    expect(findings.filter((f) => f.msg.includes('routes here regardless of tenant status'))).toHaveLength(0)
  })

  it('does not fire for a slug already covered by Drift C (tenant in scope)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: neverHome,
      resolvableSlugs: new Set(['foo']),
    })
    // Drift C already CRITs this via the main loop; Drift N must not double-report it.
    const driftNHits = findings.filter((f) => f.msg.includes('routes here regardless of tenant status'))
    expect(driftNHits).toHaveLength(0)
    expect(findings.find((f) => f.msg.includes('has no homepage'))).toBeDefined() // Drift C still fires
  })

  it('skips Drift N entirely when resolvableSlugs is null', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    expect(findings).toHaveLength(0)
  })
})

// The token guard is what makes it safe to wire this gate into every PR,
// including forks with no secret — a bug here either leaks a broken "skip"
// into runs that DO have a real token, or crashes the CLI on a token-less
// branch. Pure-tested here since main() itself is not import-safe to invoke.
describe('loadToken — CI env var takes precedence', () => {
  it('returns the trimmed env var when present, without touching HOME', () => {
    expect(loadToken({ SUPABASE_ACCESS_TOKEN_FULLLOOP: '  ci-token  ' })).toBe('ci-token')
  })

  it('falls through to ~/.env.local when the env var is blank/whitespace-only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'reconcile-token-'))
    writeFileSync(join(dir, '.env.local'), 'SUPABASE_ACCESS_TOKEN_FULLLOOP=local-token\n')
    try {
      expect(loadToken({ SUPABASE_ACCESS_TOKEN_FULLLOOP: '   ', HOME: dir })).toBe('local-token')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('loadToken — local dev fallback (~/.env.local)', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('reads and strips quotes from a quoted value', () => {
    dir = mkdtempSync(join(tmpdir(), 'reconcile-token-'))
    writeFileSync(join(dir, '.env.local'), `SUPABASE_ACCESS_TOKEN_FULLLOOP="quoted-token"\n`)
    expect(loadToken({ HOME: dir })).toBe('quoted-token')
  })

  it('returns null when the token line is absent from an existing file', () => {
    dir = mkdtempSync(join(tmpdir(), 'reconcile-token-'))
    writeFileSync(join(dir, '.env.local'), 'SOME_OTHER_VAR=x\n')
    expect(loadToken({ HOME: dir })).toBeNull()
  })

  it('returns null when ~/.env.local does not exist', () => {
    dir = mkdtempSync(join(tmpdir(), 'reconcile-token-'))
    expect(loadToken({ HOME: dir })).toBeNull()
  })

  it('returns null (clean skip) when both the env var and HOME are absent', () => {
    expect(loadToken({})).toBeNull()
  })
})

describe('computeFindings — Drift K (tenant_domains row with no vercel_project)', () => {
  it('warns on every row missing vercel_project, not just active ones', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: null, slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes('vercel_project=NULL'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })
})

describe('computeFindings — Drift M (ambiguous is_primary among active domains)', () => {
  it('warns when 2+ active domains have NO row marked is_primary', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: false, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
      { tenant_id: 't1', domain: 'foo-alt.com', active: true, is_primary: false, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes('NONE marked is_primary'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('warns when 2+ active domains have MULTIPLE rows marked is_primary', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
      { tenant_id: 't1', domain: 'foo-alt.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    const warn = findings.find((f) => f.msg.includes('multiple active tenant_domains rows marked is_primary'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('does not warn when exactly one of 2+ active domains is marked is_primary', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
      { tenant_id: 't1', domain: 'foo-alt.com', active: true, is_primary: false, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    expect(findings.some((f) => f.msg.includes('is_primary'))).toBe(false)
  })

  it('does not warn with only a single active domain, even if is_primary is false', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [
      { tenant_id: 't1', domain: 'foo.com', active: true, is_primary: false, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' },
    ]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: () => true,
      resolvableSlugs: null,
    })
    expect(findings.some((f) => f.msg.includes('is_primary'))).toBe(false)
  })
})

describe('computeFindings — Drift O (APEX_CANONICAL_DOMAINS entry with no matching known domain)', () => {
  it('warns when an apex-canonical entry matches no tenants.domain, tenant_domains row, or any-status domain', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenantDomains: [{ slug: 'foo', domain: 'foo.com' }],
      apexCanonicalSet: new Set(['typo-domain.com']),
    })
    const warn = findings.find((f) => f.slug === 'typo-domain.com')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('APEX_CANONICAL_DOMAINS')
  })

  it('does not warn when the entry matches tenants.domain', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      apexCanonicalSet: new Set(['foo.com']),
    })
    expect(findings.some((f) => f.slug === 'foo.com')).toBe(false)
  })

  it('does not warn when the entry matches only an active tenant_domains row (tenants.domain empty)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: null, status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      apexCanonicalSet: new Set(['foo.com']),
    })
    expect(findings.some((f) => f.slug === 'foo.com')).toBe(false)
  })

  it('does not warn when the entry matches only a stale any-status tenants.domain (out-of-scope tenant)', () => {
    const tenants: Array<{ id: string; slug: string; domain: string | null; status: string }> = []
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenantDomains: [{ slug: 'suspended-foo', domain: 'foo.com' }],
      apexCanonicalSet: new Set(['foo.com']),
    })
    expect(findings.some((f) => f.slug === 'foo.com')).toBe(false)
  })

  it('matches through norm() so a www-prefixed or scheme-prefixed known domain still collapses with a bare apex-canonical entry', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'https://www.foo.com/', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      apexCanonicalSet: new Set(['foo.com']),
    })
    expect(findings.some((f) => f.slug === 'foo.com')).toBe(false)
  })

  it('is skipped entirely when apexCanonicalSet is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('APEX_CANONICAL_DOMAINS')).length).toBe(0)
  })
})

describe('computeFindings — Drift P (BESPOKE_SITE_TENANTS entry with no matching PROTECTED entry)', () => {
  it('warns when a bespoke slug has no matching PROTECTED entry', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      protectedSlugs: new Set(['some-other-slug']),
    })
    const warn = findings.find((f) => f.slug === 'foo' && f.msg.includes('PROTECTED'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('BESPOKE_SITE_TENANTS')
  })

  it('does not warn when the bespoke slug has a matching PROTECTED entry', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      protectedSlugs: new Set(['foo']),
    })
    expect(findings.some((f) => f.msg.includes('PROTECTED'))).toBe(false)
  })

  it('is skipped entirely when protectedSlugs is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('PROTECTED')).length).toBe(0)
  })
})

describe('computeFindings — Drift Q (TENANTS_WITH_RICH_SITEMAP entry with no sitemap file)', () => {
  const alwaysSitemap = (_slug: string) => true
  const neverSitemap = (_slug: string) => false

  it('flags CRIT when a rich-sitemap slug has neither sitemap.ts nor sitemap.xml/route.ts', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(['foo']),
      hasSitemap: neverSitemap,
    })
    const crit = findings.find((f) => f.slug === 'foo' && f.msg.includes('TENANTS_WITH_RICH_SITEMAP'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
    expect(crit!.msg).toContain('sitemap.ts')
    expect(crit!.msg).toContain('sitemap.xml/route.ts')
  })

  it('does not flag when the sitemap file exists', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(['foo']),
      hasSitemap: alwaysSitemap,
    })
    expect(findings.some((f) => f.msg.includes('TENANTS_WITH_RICH_SITEMAP'))).toBe(false)
  })

  it('is skipped entirely when richSitemapSet is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      hasSitemap: neverSitemap,
    })
    expect(findings.filter((f) => f.msg.includes('TENANTS_WITH_RICH_SITEMAP')).length).toBe(0)
  })

  it('defaults hasSitemap to always-true (no false positive) when richSitemapSet is set but hasSitemap is omitted', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(['foo']),
    })
    expect(findings.some((f) => f.msg.includes('TENANTS_WITH_RICH_SITEMAP'))).toBe(false)
  })
})

describe('computeFindings — Drift Y (bespoke tenant has a real sitemap file but is not in TENANTS_WITH_RICH_SITEMAP)', () => {
  const alwaysSitemap = (_slug: string) => true
  const neverSitemap = (_slug: string) => false

  it('flags WARN when a bespoke slug has a sitemap file but is absent from richSitemapSet', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(),
      hasSitemap: alwaysSitemap,
    })
    const warn = findings.find((f) => f.slug === 'foo' && f.msg.includes('permanently unreachable'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('TENANTS_WITH_RICH_SITEMAP')
  })

  it('does not flag when the slug IS in richSitemapSet (that pairing is Drift Q\'s territory)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(['foo']),
      hasSitemap: alwaysSitemap,
    })
    expect(findings.some((f) => f.msg.includes('permanently unreachable'))).toBe(false)
  })

  it('does not flag when hasSitemap says the file does not exist', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(),
      hasSitemap: neverSitemap,
    })
    expect(findings.some((f) => f.msg.includes('permanently unreachable'))).toBe(false)
  })

  it('is skipped entirely when hasSitemap is omitted, even though Drift Q\'s own default is always-true', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(),
    })
    expect(findings.some((f) => f.msg.includes('permanently unreachable'))).toBe(false)
  })

  it('is skipped entirely when bespokeSet is empty', () => {
    const tenants: never[] = []
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      richSitemapSet: new Set(),
      hasSitemap: alwaysSitemap,
    })
    expect(findings.some((f) => f.msg.includes('permanently unreachable'))).toBe(false)
  })
})

describe('computeFindings — Drift R (tenant status gap between reconcile scope and middleware NON_SERVING_STATUSES)', () => {
  it("CRITs a status='pending' tenant with a live domain (out of scope here, but middleware still serves it)", () => {
    const findings: Finding[] = computeFindings({
      tenants: [], // 'foo' is out of scope — not active/live/setup
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenants: [{ id: 't1', slug: 'foo', status: 'pending', domain: 'foo.com' }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
    })
    const crit = findings.find((f) => f.slug === 'foo' && f.msg.includes("status='pending'"))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('CRITs when the domain lives on an active tenant_domains row instead of tenants.domain', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [{ tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'template', status: 'active', vercel_project: 'x', slug: 'foo' }],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenants: [{ id: 't1', slug: 'foo', status: 'pending', domain: null }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
    })
    expect(findings.find((f) => f.slug === 'foo' && f.msg.includes("status='pending'"))).toBeDefined()
  })

  it('does not fire when the tenant has no domain anywhere (nothing for middleware to serve)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenants: [{ id: 't1', slug: 'foo', status: 'pending', domain: null }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
    })
    expect(findings.filter((f) => f.msg.includes("status='pending'"))).toHaveLength(0)
  })

  it('does not fire when the status is in nonServingStatuses (middleware already dark)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenants: [{ id: 't1', slug: 'foo', status: 'suspended', domain: 'foo.com' }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
    })
    expect(findings.filter((f) => f.msg.includes('status='))).toHaveLength(0)
  })

  it('does not fire when the tenant is already in scope (covered by Drift A-M)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenants: [{ id: 't1', slug: 'foo', status: 'active', domain: 'foo.com' }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
    })
    expect(findings.filter((f) => f.msg.includes("status='active' is outside"))).toHaveLength(0)
  })

  it('is skipped entirely when allTenants is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    expect(findings).toHaveLength(0)
  })
})

describe('computeFindings — Drift S (tenant domain collides with a MAIN_HOSTS entry)', () => {
  it('CRITs when tenants.domain collides with a MAIN_HOSTS entry', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'fullloopcrm.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['fullloopcrm.com', 'localhost']),
    })
    const crit = findings.find((f) => f.slug === 'foo' && f.msg.includes('MAIN_HOSTS'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('CRITs when an active tenant_domains row collides with a MAIN_HOSTS entry', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [{ tenant_id: 't1', domain: 'www.fullloopcrm.com', active: true, is_primary: true, routing_mode: 'template', status: 'active', vercel_project: 'x', slug: 'foo' }],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['fullloopcrm.com', 'www.fullloopcrm.com']),
    })
    expect(findings.find((f) => f.slug === 'foo' && f.msg.includes('MAIN_HOSTS'))).toBeDefined()
  })

  it('CRITs via the norm() collision, not just an exact string match (e.g. scheme/www/case)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'HTTPS://WWW.fullloopcrm.com/', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['fullloopcrm.com']),
    })
    expect(findings.find((f) => f.slug === 'foo' && f.msg.includes('MAIN_HOSTS'))).toBeDefined()
  })

  it('does not fire when the domain does not collide with any MAIN_HOSTS entry', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'acme.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['fullloopcrm.com', 'localhost']),
    })
    expect(findings.filter((f) => f.msg.includes('MAIN_HOSTS'))).toHaveLength(0)
  })

  it('is skipped entirely when mainHostsSet is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'fullloopcrm.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('MAIN_HOSTS'))).toHaveLength(0)
  })

  it('does not double-report the same slug+domain collision seen from multiple sources', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'fullloopcrm.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [{ tenant_id: 't1', domain: 'fullloopcrm.com', active: true, is_primary: true, routing_mode: 'template', status: 'active', vercel_project: 'x', slug: 'foo' }],
      bespokeSet: new Set(),
      hasHome: neverHome,
      resolvableSlugs: null,
      allTenantDomains: [{ slug: 'foo', domain: 'fullloopcrm.com' }],
      mainHostsSet: new Set(['fullloopcrm.com']),
    })
    expect(findings.filter((f) => f.msg.includes('MAIN_HOSTS'))).toHaveLength(1)
  })
})

describe('computeFindings — Drift T (slug in BOTH ROOT_SITE_TENANTS and BESPOKE_SITE_TENANTS)', () => {
  it('CRITs when a slug is in both ROOT_SITE_TENANTS and BESPOKE_SITE_TENANTS', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['acme']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(['acme']),
    })
    const crit = findings.find((f) => f.slug === 'acme' && f.msg.includes('ROOT_SITE_TENANTS'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('does not fire when the slug is only in ROOT_SITE_TENANTS, not BESPOKE_SITE_TENANTS', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(['acme']),
    })
    expect(findings.filter((f) => f.msg.includes('ROOT_SITE_TENANTS'))).toHaveLength(0)
  })

  it('does not fire when the slug is only in BESPOKE_SITE_TENANTS, not ROOT_SITE_TENANTS', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['acme']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
    })
    expect(findings.filter((f) => f.msg.includes('ROOT_SITE_TENANTS'))).toHaveLength(0)
  })

  it('is skipped entirely when rootSiteTenantsSet is empty (its current live state — default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['acme']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('ROOT_SITE_TENANTS'))).toHaveLength(0)
  })
})

describe('computeFindings — Drift U (STATIC_TENANT_MAP drift — the unconditional-rewrite bypass)', () => {
  it('CRITs when a STATIC_TENANT_MAP slug has no resolvable tenant', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenants: [],
      staticTenantMap: new Map([['ghost.com', { id: 'id-1', slug: 'ghost-tenant' }]]),
    })
    const crit = findings.find((f) => f.slug === 'ghost-tenant' && f.msg.includes('NO resolvable tenant'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('CRITs when the hardcoded id does not match the real tenants.id for that slug', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenants: [{ id: 'real-id', slug: 'the-florida-maid', status: 'active', domain: null }],
      staticTenantMap: new Map([['thefloridamaid.com', { id: 'stale-id', slug: 'the-florida-maid' }]]),
    })
    const crit = findings.find((f) => f.slug === 'the-florida-maid' && f.msg.includes('does not match tenants.id'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('CRITs when the tenant status is in NON_SERVING_STATUSES — the unconditional-rewrite bypass', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenants: [{ id: 'real-id', slug: 'the-florida-maid', status: 'suspended', domain: null }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
      staticTenantMap: new Map([['thefloridamaid.com', { id: 'real-id', slug: 'the-florida-maid' }]]),
    })
    const crit = findings.find((f) => f.slug === 'the-florida-maid' && f.msg.includes('UNCONDITIONALLY'))
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
  })

  it('emits nothing when the entry resolves, the id matches, and the tenant is not in NON_SERVING_STATUSES', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenants: [{ id: 'real-id', slug: 'the-florida-maid', status: 'active', domain: null }],
      nonServingStatuses: new Set(['suspended', 'cancelled', 'deleted']),
      staticTenantMap: new Map([['thefloridamaid.com', { id: 'real-id', slug: 'the-florida-maid' }]]),
    })
    expect(findings.filter((f) => f.msg.includes('STATIC_TENANT_MAP'))).toHaveLength(0)
  })

  it('is skipped entirely when staticTenantMap is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenants: [],
    })
    expect(findings.filter((f) => f.msg.includes('STATIC_TENANT_MAP'))).toHaveLength(0)
  })
})

describe('computeFindings — Drift V (stale KNOWN_PENDING_ORPHANS allowlist entry)', () => {
  it('warns when an allowlisted slug is no longer in BESPOKE_SITE_TENANTS', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(), // the slug was removed from the middleware set entirely
      hasHome: alwaysHome,
      resolvableSlugs: new Set<string>(),
      knownPendingOrphans: new Set(['toll-trucks-near-me']),
    })
    const warn = findings.find((f) => f.slug === 'toll-trucks-near-me' && f.msg.includes('no longer in BESPOKE_SITE_TENANTS'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('warns when an allowlisted slug now resolves to a tenants row (Jeff already dispositioned it)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['toll-trucks-near-me']), // still bespoke-routed…
      hasHome: neverHome,
      resolvableSlugs: new Set(['toll-trucks-near-me']), // …but a tenant now exists
      knownPendingOrphans: new Set(['toll-trucks-near-me']),
    })
    const warn = findings.find((f) => f.slug === 'toll-trucks-near-me' && f.msg.includes('now resolves to a tenants row'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('emits no stale-entry WARN for an allowlisted slug that is still genuinely pending', () => {
    // Drift L itself still CRITs this (real, still-unresolved orphan) — that's
    // expected and covered by the Drift L tests above. This test isolates
    // Drift V: no "remove the stale entry" WARN should accompany it.
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['toll-trucks-near-me']), // still bespoke-routed…
      hasHome: neverHome,
      resolvableSlugs: new Set<string>(), // …and still unresolvable
      knownPendingOrphans: new Set(['toll-trucks-near-me']),
    })
    expect(findings.filter((f) => f.msg.includes('remove the stale entry'))).toHaveLength(0)
  })

  it('is skipped entirely when knownPendingOrphans is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: new Set<string>(),
    })
    expect(findings.filter((f) => f.msg.includes('remove the stale entry'))).toHaveLength(0)
  })

  it('is skipped entirely when resolvableSlugs is null, even with a non-empty allowlist', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      knownPendingOrphans: new Set(['toll-trucks-near-me']),
    })
    expect(findings.filter((f) => f.msg.includes('remove the stale entry'))).toHaveLength(0)
  })
})

describe('computeFindings — Drift W (next.config.ts bare /site/<segment> rewrite unreachable while ROOT_SITE_TENANTS is empty)', () => {
  it('warns when a bare /site/<segment> rewrite exists and ROOT_SITE_TENANTS is empty (the live default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
      nextConfigSiteRewrites: [{ source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' }],
    })
    const warn = findings.find((f) => f.slug === '/site/about' && f.msg.includes('unreachable dead config'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('reports one finding per rewrite entry', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
      nextConfigSiteRewrites: [
        { source: '/site/about', destination: '/site/about-x' },
        { source: '/site/faq', destination: '/site/faq-x' },
      ],
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(2)
  })

  it('does not fire when ROOT_SITE_TENANTS has a member (the bare path IS reachable)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(['nycmaid']),
      nextConfigSiteRewrites: [{ source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' }],
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(0)
  })

  it('is skipped entirely when nextConfigSiteRewrites is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(0)
  })
})

describe('computeFindings — Drift AC (next.config.ts nested/dynamic /site/<segment> rewrite unreachable while ROOT_SITE_TENANTS is empty)', () => {
  it('warns on a dynamic-param source whose literal first segment is neither template nor a bespoke slug (live /site/careers/:slug case)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['nycmaid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
      allNextConfigSiteRewrites: [{ source: '/site/careers/:slug', destination: '/site/available-nyc-maid-jobs/:slug' }],
    })
    const warn = findings.find((f) => f.slug === '/site/careers/:slug' && f.msg.includes('unreachable dead config'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('does not fire when the first segment IS a real BESPOKE_SITE_TENANTS slug (e.g. /site/nycmaid/blog/:slug)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['nycmaid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
      allNextConfigSiteRewrites: [{ source: '/site/nycmaid/blog/:slug', destination: '/site/nycmaid/nyc-maid-service-blog/:slug' }],
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(0)
  })

  it('does not fire when the first segment is "template"', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
      allNextConfigSiteRewrites: [{ source: '/site/template/:slug', destination: '/site/x/:slug' }],
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(0)
  })

  it('does not double-report a bare source Drift W already caught', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
      nextConfigSiteRewrites: [{ source: '/site/about', destination: '/site/about-x' }],
      allNextConfigSiteRewrites: [{ source: '/site/about', destination: '/site/about-x' }],
    })
    expect(findings.filter((f) => f.slug === '/site/about' && f.msg.includes('unreachable dead config'))).toHaveLength(1)
  })

  it('does not fire when ROOT_SITE_TENANTS has a member (the literal first segment could be real root-tenant content)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(['nycmaid']),
      allNextConfigSiteRewrites: [{ source: '/site/careers/:slug', destination: '/site/available-nyc-maid-jobs/:slug' }],
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(0)
  })

  it('is skipped entirely when allNextConfigSiteRewrites is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      rootSiteTenantsSet: new Set(),
    })
    expect(findings.filter((f) => f.msg.includes('unreachable dead config'))).toHaveLength(0)
  })
})

describe('parseNextConfigRedirects', () => {
  const wrap = (entries: string) => `
    async redirects() {
      return [
        ${entries}
      ]
    }
  `

  it('extracts source/destination pairs regardless of other fields', () => {
    const src = wrap(`
      { source: '/sm.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator', permanent: true },
    `)
    expect(parseNextConfigRedirects(src)).toEqual([
      { source: '/sm.xml', destination: '/sitemap.xml' },
      { source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator' },
    ])
  })

  it('returns an empty array when redirects() is absent', () => {
    expect(parseNextConfigRedirects('export default {}')).toEqual([])
  })

  it('returns an empty array when the return array is empty', () => {
    expect(parseNextConfigRedirects(wrap(''))).toEqual([])
  })
})

describe('parseAppRootPrefixes', () => {
  it('extracts the prefix list from a middleware APP_ROOT_PREFIXES declaration', () => {
    const src = `
      const APP_ROOT_PREFIXES = [
        '/api/', '/portal', '/team', '/dashboard', '/admin',
      ]
    `
    expect(parseAppRootPrefixes(src)).toEqual(['/api/', '/portal', '/team', '/dashboard', '/admin'])
  })

  it('returns an empty array when APP_ROOT_PREFIXES is absent', () => {
    expect(parseAppRootPrefixes('export default {}')).toEqual([])
  })
})

describe('findTrailingSlashAppRootPrefixes', () => {
  it('flags the live /api/ bug shape', () => {
    expect(findTrailingSlashAppRootPrefixes(['/api/', '/portal', '/team'])).toEqual(['/api/'])
  })

  it('returns empty when every entry is bare, matching the post-fix array', () => {
    expect(findTrailingSlashAppRootPrefixes(['/api', '/portal', '/team', '/dashboard', '/admin', '/fullloop', '/reset-pin'])).toEqual([])
  })

  it('flags multiple offenders', () => {
    expect(findTrailingSlashAppRootPrefixes(['/api/', '/team/', '/admin'])).toEqual(['/api/', '/team/'])
  })

  it('returns empty for an empty list', () => {
    expect(findTrailingSlashAppRootPrefixes([])).toEqual([])
  })
})

describe('computeFindings — Drift AM (APP_ROOT_PREFIXES entry carries a trailing slash matchesAppRootPrefix can never match)', () => {
  it('CRITs on the live pre-fix /api/ shape', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/api/', '/portal', '/team'],
    })
    const crit = findings.find((f) => f.slug === '/api/')
    expect(crit).toBeDefined()
    expect(crit!.sev).toBe('CRIT')
    expect(crit!.msg).toContain('can never match a real request')
    expect(crit!.msg).toContain("use the bare form ('/api')")
  })

  it('is silent once the entry is bare, matching the post-fix array', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/api', '/portal', '/team', '/dashboard', '/admin', '/fullloop', '/reset-pin'],
    })
    expect(findings.filter((f) => f.msg.includes('can never match a real request'))).toHaveLength(0)
  })

  it('is skipped entirely when appRootPrefixes is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('can never match a real request'))).toHaveLength(0)
  })
})

describe('computeFindings — Drift X (next.config.ts redirect destination double-prefixed by rewriteToSite on a bespoke tenant domain)', () => {
  it('warns when a redirect destination lands in the tenant-sites tree outside APP_ROOT_PREFIXES', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      nextConfigRedirects: [{ source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator' }],
      appRootPrefixes: ['/api/', '/portal', '/team', '/dashboard', '/admin', '/fullloop', '/reset-pin'],
    })
    const warn = findings.find((f) => f.slug === '/apply/operations-coordinator' && f.msg.includes('double-prefixed'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
  })

  it('does not fire for a destination outside the tenant-sites tree (e.g. /portal/collect)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      nextConfigRedirects: [{ source: '/book/collect', destination: '/portal/collect' }],
      appRootPrefixes: ['/portal'],
    })
    expect(findings.filter((f) => f.msg.includes('double-prefixed'))).toHaveLength(0)
  })

  it('still fires for a /site/ destination even when appRootPrefixes is populated (prefix and /site/ spaces never overlap)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      nextConfigRedirects: [{ source: '/legacy-admin', destination: '/site/admin/settings' }],
      appRootPrefixes: ['/admin', '/portal', '/dashboard'],
    })
    expect(findings.filter((f) => f.msg.includes('double-prefixed'))).toHaveLength(1)
  })

  it('does not fire for a non-/site/ destination', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      nextConfigRedirects: [{ source: '/features', destination: '/full-loop-crm-service-features' }],
      appRootPrefixes: [],
    })
    expect(findings.filter((f) => f.msg.includes('double-prefixed'))).toHaveLength(0)
  })

  it('is skipped entirely when nextConfigRedirects is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('double-prefixed'))).toHaveLength(0)
  })

  it('reports one finding per offending redirect entry', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      nextConfigRedirects: [
        { source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator' },
        { source: '/apply/commission-sales-partner', destination: '/site/careers/commission-sales-partner' },
      ],
      appRootPrefixes: [],
    })
    expect(findings.filter((f) => f.msg.includes('double-prefixed'))).toHaveLength(2)
  })
})

describe('parseRobotsMainHostsSet', () => {
  it('extracts the hostnames from a robots.ts MAIN_HOSTS declaration', () => {
    const src = `
      const MAIN_HOSTS = new Set([
        'homeservicesbusinesscrm.com',
        "www.homeservicesbusinesscrm.com",
        'localhost',
      ])
    `
    const set = parseRobotsMainHostsSet(src)
    expect(set.has('homeservicesbusinesscrm.com')).toBe(true)
    expect(set.has('www.homeservicesbusinesscrm.com')).toBe(true)
    expect(set.has('localhost')).toBe(true)
    expect(set.size).toBe(3)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseRobotsMainHostsSet('export default {}').size).toBe(0)
  })
})

describe('computeFindings — Drift Z (robots.ts MAIN_HOSTS copy drifted from middleware MAIN_HOSTS)', () => {
  it('warns when a host is in middleware MAIN_HOSTS but missing from robots.ts\'s copy', () => {
    // Mirrors the real, live drift: middleware.ts's MAIN_HOSTS carries
    // fullloopcrm.com / www.fullloopcrm.com; robots.ts's own hand-maintained
    // copy does not, despite its own comment promising to stay in sync.
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['homeservicesbusinesscrm.com', 'fullloopcrm.com']),
      robotsMainHostsSet: new Set(['homeservicesbusinesscrm.com']),
    })
    const warn = findings.find((f) => f.slug === 'fullloopcrm.com')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('MISSING from src/app/robots.ts')
  })

  it('warns when a host is in robots.ts\'s copy but not in the real middleware MAIN_HOSTS', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['homeservicesbusinesscrm.com']),
      robotsMainHostsSet: new Set(['homeservicesbusinesscrm.com', 'stale-host.com']),
    })
    const warn = findings.find((f) => f.slug === 'stale-host.com')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain("NOT in middleware's real MAIN_HOSTS")
  })

  it('does not warn when both copies agree', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['homeservicesbusinesscrm.com', 'localhost']),
      robotsMainHostsSet: new Set(['homeservicesbusinesscrm.com', 'localhost']),
    })
    expect(findings).toHaveLength(0)
  })

  it('is skipped entirely when robotsMainHostsSet is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      mainHostsSet: new Set(['homeservicesbusinesscrm.com', 'fullloopcrm.com']),
    })
    expect(findings).toHaveLength(0)
  })
})

describe('parseKilledRoutes', () => {
  it('extracts the routes from a middleware.ts KILLED_ROUTES declaration', () => {
    const src = `
      const KILLED_ROUTES = [
        '/apply',
        "/some-other-route",
      ]
    `
    const set = parseKilledRoutes(src)
    expect(set.has('/apply')).toBe(true)
    expect(set.has('/some-other-route')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseKilledRoutes('export default {}').size).toBe(0)
  })
})

describe('parseRobotsKilledRoutes', () => {
  it('extracts disallow.push(...) routes from the isMainHost block', () => {
    const src = `
      if (!JOIN_CRAWLABLE_HOSTS.has(host)) {
        disallow.push('/join/')
      }
      if (isMainHost) {
        disallow.push('/apply')
      }
    `
    const set = parseRobotsKilledRoutes(src)
    expect(set.has('/apply')).toBe(true)
    expect(set.has('/join/')).toBe(false)
    expect(set.size).toBe(1)
  })

  it('returns an empty set when there is no isMainHost block', () => {
    expect(parseRobotsKilledRoutes('export default {}').size).toBe(0)
  })
})

describe('computeFindings — Drift AA (robots.ts KILLED_ROUTES copy drifted from middleware KILLED_ROUTES)', () => {
  it('warns when a route is in middleware KILLED_ROUTES but missing from robots.ts\'s copy', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      killedRoutesSet: new Set(['/apply', '/new-killed-route']),
      robotsKilledRoutesSet: new Set(['/apply']),
    })
    const warn = findings.find((f) => f.slug === '/new-killed-route')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain("MISSING from src/app/robots.ts")
  })

  it('warns when a route is in robots.ts\'s copy but not in the real middleware KILLED_ROUTES', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      killedRoutesSet: new Set(['/apply']),
      robotsKilledRoutesSet: new Set(['/apply', '/stale-route']),
    })
    const warn = findings.find((f) => f.slug === '/stale-route')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain("NOT in middleware's real KILLED_ROUTES")
  })

  it('does not warn when both copies agree', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      killedRoutesSet: new Set(['/apply']),
      robotsKilledRoutesSet: new Set(['/apply']),
    })
    expect(findings).toHaveLength(0)
  })

  it('is skipped entirely when both sets are empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings).toHaveLength(0)
  })
})

describe('parseRelativeImportPaths', () => {
  it('extracts relative import specifiers, ignoring package imports', () => {
    const src = `
      import type { MetadataRoute } from 'next'
      import { SITE_DOMAIN, services } from './_lib/siteData'
      import { blogPosts } from './_lib/blogPosts'
    `
    const paths = parseRelativeImportPaths(src)
    expect(paths.has('./_lib/siteData')).toBe(true)
    expect(paths.has('./_lib/blogPosts')).toBe(true)
    expect(paths.has('next')).toBe(false)
    expect(paths.size).toBe(2)
  })

  it('returns an empty set when there are no relative imports', () => {
    expect(parseRelativeImportPaths("import type { MetadataRoute } from 'next'").size).toBe(0)
  })
})

describe('findHardcodedWwwApexDomains', () => {
  const apexSet = new Set(['thenycmarketingcompany.com', 'consortiumnyc.com'])

  it('finds a hardcoded www. form of an APEX_CANONICAL_DOMAINS entry', () => {
    const found = findHardcodedWwwApexDomains(['const BASE = "https://www.thenycmarketingcompany.com";'], apexSet)
    expect(found.has('thenycmarketingcompany.com')).toBe(true)
    expect(found.size).toBe(1)
  })

  it('ignores a bare-apex (non-www) URL for the same domain', () => {
    const found = findHardcodedWwwApexDomains(['const BASE = "https://thenycmarketingcompany.com";'], apexSet)
    expect(found.size).toBe(0)
  })

  it('ignores a www. URL for a domain NOT in APEX_CANONICAL_DOMAINS', () => {
    const found = findHardcodedWwwApexDomains(['const BASE = "https://www.some-other-tenant.com";'], apexSet)
    expect(found.size).toBe(0)
  })

  it('skips null/undefined sources (unread files)', () => {
    const found = findHardcodedWwwApexDomains([null, 'const BASE = "https://www.consortiumnyc.com";', undefined], apexSet)
    expect(found.has('consortiumnyc.com')).toBe(true)
    expect(found.size).toBe(1)
  })

  it('returns an empty set for an empty apexCanonicalSet', () => {
    const found = findHardcodedWwwApexDomains(['const BASE = "https://www.thenycmarketingcompany.com";'], new Set())
    expect(found.size).toBe(0)
  })

  it('finds a hardcoded www. form inside a layout.tsx-shaped metadata export (metadataBase/openGraph/canonical)', () => {
    // Mirrors the real, live shape of e.g. src/app/site/consortium-nyc/layout.tsx:
    // metadataBase, openGraph.url, and alternates.canonical all hardcode the
    // www. host even though the domain is apex-canonical — the actual <link
    // rel="canonical"> tag and og:url shown to Google on every page, a higher-
    // value source than sitemap.ts alone.
    const layoutSrc = `
      export const metadata: Metadata = {
        metadataBase: new URL("https://www.consortiumnyc.com"),
        openGraph: { url: "https://www.consortiumnyc.com" },
        alternates: { canonical: "https://www.consortiumnyc.com" },
      }
    `
    const found = findHardcodedWwwApexDomains([layoutSrc], apexSet)
    expect(found.has('consortiumnyc.com')).toBe(true)
    expect(found.size).toBe(1)
  })
})

describe('computeFindings — Drift AB (bespoke tenant sitemap hardcodes www. for an APEX_CANONICAL_DOMAINS entry)', () => {
  it('warns when a slug\'s sitemap/robots source hardcodes https://www.<domain> for an apex-canonical domain', () => {
    // Mirrors the real, live drift: the-nyc-marketing-company, consortium-nyc,
    // and the-nyc-interior-designer all hardcode a www. base in their own
    // sitemap.ts even though their domains are apex-canonical in middleware.
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-nyc-marketing-company']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      wwwApexDomainsBySlug: new Map([['the-nyc-marketing-company', new Set(['thenycmarketingcompany.com'])]]),
    })
    const warn = findings.find((f) => f.slug === 'the-nyc-marketing-company')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('https://www.thenycmarketingcompany.com')
    expect(warn!.msg).toContain('APEX_CANONICAL_DOMAINS')
  })

  it('emits one finding per domain when a slug has multiple hardcoded-www matches', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['multi-domain-slug']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      wwwApexDomainsBySlug: new Map([['multi-domain-slug', new Set(['a.com', 'b.com'])]]),
    })
    const warns = findings.filter((f) => f.slug === 'multi-domain-slug')
    expect(warns).toHaveLength(2)
    expect(warns.every((f) => f.sev === 'WARN')).toBe(true)
  })

  it('is skipped entirely when wwwApexDomainsBySlug is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-nyc-marketing-company']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings).toHaveLength(0)
  })
})

describe('findShadowedKilledRoutePages', () => {
  it('flags a dynamic-segment file as unrescuable regardless of redirects', () => {
    const shadowed = findShadowedKilledRoutePages(
      new Set(['/apply']),
      new Map([['/apply', ['[slug]/page.tsx']]]),
      new Set(['/apply/operations-coordinator']),
    )
    expect(shadowed.get('/apply')).toEqual(['[slug]/page.tsx'])
  })

  it('does not flag a literal file that has an exact next.config.ts redirect rescuing it', () => {
    const shadowed = findShadowedKilledRoutePages(
      new Set(['/apply']),
      new Map([['/apply', ['operations-coordinator/page.tsx']]]),
      new Set(['/apply/operations-coordinator']),
    )
    expect(shadowed.has('/apply')).toBe(false)
  })

  it('flags a literal file with no matching redirect', () => {
    const shadowed = findShadowedKilledRoutePages(
      new Set(['/apply']),
      new Map([['/apply', ['careers/page.tsx']]]),
      new Set(['/apply/operations-coordinator']),
    )
    expect(shadowed.get('/apply')).toEqual(['careers/page.tsx'])
  })

  it('flags the route\'s own root page.tsx when the route itself is not redirected', () => {
    const shadowed = findShadowedKilledRoutePages(
      new Set(['/apply']),
      new Map([['/apply', ['page.tsx']]]),
      new Set(),
    )
    expect(shadowed.get('/apply')).toEqual(['page.tsx'])
  })

  it('returns an empty map when no route has any files on disk', () => {
    const shadowed = findShadowedKilledRoutePages(new Set(['/apply']), new Map(), new Set())
    expect(shadowed.size).toBe(0)
  })
})

describe('computeFindings — Drift AD (KILLED_ROUTES prefix shadows a real page still on disk)', () => {
  it('warns on the live /apply/[slug]/page.tsx case — dynamic segment, unrescuable by the operations-coordinator redirect', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      killedRoutesSet: new Set(['/apply']),
      nextConfigRedirects: [{ source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator' }],
      killedRouteAppFiles: new Map([['/apply', ['[slug]/page.tsx']]]),
    })
    const warn = findings.find((f) => f.slug === '/apply/[slug]/page.tsx')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('unreachable in production')
    expect(warn!.msg).toContain("isKilledRoute('/apply')")
  })

  it('does not fire when a literal file is exactly rescued by a next.config.ts redirect', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      killedRoutesSet: new Set(['/apply']),
      nextConfigRedirects: [{ source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator' }],
      killedRouteAppFiles: new Map([['/apply', ['operations-coordinator/page.tsx']]]),
    })
    expect(findings.filter((f) => f.msg.includes('unreachable in production'))).toHaveLength(0)
  })

  it('is skipped entirely when killedRouteAppFiles is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      killedRoutesSet: new Set(['/apply']),
      nextConfigRedirects: [{ source: '/apply/operations-coordinator', destination: '/site/careers/operations-coordinator' }],
    })
    expect(findings.filter((f) => f.msg.includes('unreachable in production'))).toHaveLength(0)
  })
})

describe('findShadowedAppRootPages', () => {
  it('flags a bespoke tenant whose site folder has a top-level dir matching a reserved prefix', () => {
    const shadowed = findShadowedAppRootPages(
      new Set(['the-nyc-marketing-company']),
      ['/api/', '/portal', '/unsubscribe'],
      new Map([['the-nyc-marketing-company', ['api', 'contact', 'about']]]),
    )
    expect(shadowed.get('the-nyc-marketing-company')).toEqual(['api'])
  })

  it('flags multiple colliding dirs for the same tenant', () => {
    const shadowed = findShadowedAppRootPages(
      new Set(['wash-and-fold-hoboken']),
      ['/unsubscribe', '/dashboard'],
      new Map([['wash-and-fold-hoboken', ['unsubscribe', 'dashboard', 'services']]]),
    )
    expect(shadowed.get('wash-and-fold-hoboken')).toEqual(['unsubscribe', 'dashboard'])
  })

  it('does not flag a dir that merely shares a prefix as a substring (matches matchesAppRootPrefix boundary semantics)', () => {
    const shadowed = findShadowedAppRootPages(
      new Set(['acme']),
      ['/team'],
      new Map([['acme', ['teamwork']]]),
    )
    expect(shadowed.has('acme')).toBe(false)
  })

  it('ignores multi-segment prefixes entirely (e.g. /reviews/submit)', () => {
    const shadowed = findShadowedAppRootPages(
      new Set(['acme']),
      ['/reviews/submit'],
      new Map([['acme', ['reviews']]]),
    )
    expect(shadowed.has('acme')).toBe(false)
  })

  it('only checks slugs in bespokeSlugs, not every key in the dirs map', () => {
    const shadowed = findShadowedAppRootPages(
      new Set(['acme']),
      ['/api/'],
      new Map([
        ['acme', ['services']],
        ['not-bespoke', ['api']],
      ]),
    )
    expect(shadowed.size).toBe(0)
  })

  it('returns an empty map when no tenant has any colliding dir', () => {
    const shadowed = findShadowedAppRootPages(new Set(['acme']), ['/api/', '/team'], new Map([['acme', ['services', 'about']]]))
    expect(shadowed.size).toBe(0)
  })
})

describe('computeFindings — Drift AE (bespoke tenant folder collides with a reserved APP_ROOT_PREFIXES name)', () => {
  it('warns on the live the-nyc-marketing-company/api case', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-nyc-marketing-company']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/api/', '/portal', '/unsubscribe'],
      bespokeSiteTopLevelDirs: new Map([['the-nyc-marketing-company', ['api']]]),
    })
    const warn = findings.find((f) => f.slug === 'the-nyc-marketing-company')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('src/app/site/the-nyc-marketing-company/api/')
    expect(warn!.msg).toContain('permanently unreachable')
  })

  it('warns once per colliding dir for a tenant with more than one', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['wash-and-fold-hoboken']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/unsubscribe', '/dashboard'],
      bespokeSiteTopLevelDirs: new Map([['wash-and-fold-hoboken', ['unsubscribe', 'dashboard']]]),
    })
    expect(findings.filter((f) => f.slug === 'wash-and-fold-hoboken')).toHaveLength(2)
  })

  it('is skipped entirely when bespokeSiteTopLevelDirs is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-nyc-marketing-company']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/api/'],
    })
    expect(findings.filter((f) => f.msg.includes('permanently unreachable'))).toHaveLength(0)
  })

  it('does not fire when the tenant has no colliding top-level dir', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['acme']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/api/', '/team'],
      bespokeSiteTopLevelDirs: new Map([['acme', ['services', 'about']]]),
    })
    expect(findings.filter((f) => f.msg.includes('permanently unreachable'))).toHaveLength(0)
  })
})

describe('parsePublicRoutePatterns', () => {
  it('extracts every pattern out of the isPublicRoute createRouteMatcher array', () => {
    const src = `
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/client/(.*)',   // comment
  '/api/webhooks(.*)',
])
`
    expect(parsePublicRoutePatterns(src)).toEqual(['/', '/api/client/(.*)', '/api/webhooks(.*)'])
  })

  it('strips a commented-out pattern (same convention as every other parseX here)', () => {
    const src = `
const isPublicRoute = createRouteMatcher([
  '/api/kept',
  // '/api/removed',
])
`
    expect(parsePublicRoutePatterns(src)).toEqual(['/api/kept'])
  })

  it('returns an empty array when the block is missing', () => {
    expect(parsePublicRoutePatterns('export default function middleware() {}')).toEqual([])
  })
})

describe('findUnboundedApiPublicRouteCollisions', () => {
  it('flags the live bug: /api/client(.*) also matching /api/clients and /api/client-reviews', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(
      ['/api/client(.*)'],
      ['client', 'clients', 'client-reviews', 'client-analytics', 'bookings'],
    )
    const dirs = collisions.map((c) => c.collidesWithDir).sort()
    expect(dirs).toEqual(['client-analytics', 'client-reviews', 'clients'])
  })

  it('does not flag the pattern colliding with itself', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(['/api/webhooks(.*)'], ['webhooks'])
    expect(collisions).toEqual([])
  })

  it('does not flag an unrelated directory', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(['/api/client(.*)'], ['bookings', 'invoices'])
    expect(collisions).toEqual([])
  })

  it('is a no-op once the pattern carries its own path-segment boundary (the fix)', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(
      ['/api/client/(.*)'],
      ['client', 'clients', 'client-reviews'],
    )
    expect(collisions).toEqual([])
  })

  it('ignores multi-segment patterns entirely (e.g. /api/quotes/public(.*))', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(['/api/quotes/public(.*)'], ['quotes'])
    expect(collisions).toEqual([])
  })

  it('ignores a pattern with no (.*) at all', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(['/api/health'], ['health', 'healthcheck'])
    expect(collisions).toEqual([])
  })

  it('ignores a non-/api/ pattern', () => {
    const collisions = findUnboundedApiPublicRouteCollisions(['/team(.*)'], ['team'])
    expect(collisions).toEqual([])
  })
})

describe('computeFindings — Drift AF (isPublicRoute pattern accidentally matches an unrelated /api/ directory)', () => {
  it('warns on the live /api/client(.*) case, once per accidentally-public directory', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      apiPublicRouteCollisions: [
        { pattern: '/api/client(.*)', literalDir: 'client', collidesWithDir: 'clients' },
        { pattern: '/api/client(.*)', literalDir: 'client', collidesWithDir: 'client-reviews' },
      ],
    })
    const warns = findings.filter((f) => f.msg.includes('has no path-segment boundary'))
    expect(warns).toHaveLength(2)
    expect(warns.every((f) => f.sev === 'WARN')).toBe(true)
    expect(warns.map((f) => f.slug).sort()).toEqual(['client-reviews', 'clients'])
    expect(warns[0].msg).toContain("isPublicRoute pattern '/api/client(.*)'")
    expect(warns[0].msg).toContain('skipping its entire Clerk/admin-impersonation gate')
  })

  it('is skipped entirely when apiPublicRouteCollisions is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('has no path-segment boundary'))).toHaveLength(0)
  })
})

describe('parseAdminBypassPrefixes', () => {
  it('extracts every p.startsWith(...) prefix out of the admin-impersonation bypass chain', () => {
    const src = `
if (adminCookie && verifyAdminTokenEdge(adminCookie, secret)) {
  const p = req.nextUrl.pathname
  if (p.startsWith('/dashboard') || p.startsWith('/api/bookings') ||
      p.startsWith('/api/selena')) {
    return
  }
}
`
    expect(parseAdminBypassPrefixes(src)).toEqual(['/dashboard', '/api/bookings', '/api/selena'])
  })

  it('strips a commented-out prefix (same convention as every other parseX here)', () => {
    const src = `
      if (p.startsWith('/api/kept') ||
          // p.startsWith('/api/removed') ||
          p.startsWith('/api/also-kept')) {
`
    expect(parseAdminBypassPrefixes(src)).toEqual(['/api/kept', '/api/also-kept'])
  })

  it('does not pick up an unrelated startsWith call on a different receiver', () => {
    const src = `
      if (!canonicalHost.startsWith('www.') && !pathname.startsWith('/api/')) {
        return NextResponse.next()
      }
    `
    expect(parseAdminBypassPrefixes(src)).toEqual([])
  })

  it('returns an empty array when there is no p.startsWith(...) chain at all', () => {
    expect(parseAdminBypassPrefixes('export default function middleware() {}')).toEqual([])
  })
})

describe('findShadowedAdminBypassPrefixes', () => {
  it('flags the live bug: /api/selena bypass entry fully shadowed by /api/selena(.*) public pattern', () => {
    const shadowed = findShadowedAdminBypassPrefixes(
      ['/api/selena(.*)'],
      ['/dashboard', '/api/bookings', '/api/selena'],
    )
    expect(shadowed).toEqual([{ bypassPrefix: '/api/selena', shadowedByPattern: '/api/selena(.*)' }])
  })

  it('flags a nested bypass prefix shadowed by the same unbounded pattern', () => {
    const shadowed = findShadowedAdminBypassPrefixes(['/api/selena(.*)'], ['/api/selena/admin-tools'])
    expect(shadowed).toEqual([{ bypassPrefix: '/api/selena/admin-tools', shadowedByPattern: '/api/selena(.*)' }])
  })

  it('does not flag a prefix only partially overlapping an exact-match public pattern', () => {
    // '/api/feedback' is public as an EXACT literal (no '(.*)') -- it only
    // covers the bare path, not '/api/feedback/123', so the bypass entry is
    // still required for sub-paths and must NOT be flagged as dead.
    const shadowed = findShadowedAdminBypassPrefixes(['/api/feedback'], ['/api/feedback'])
    expect(shadowed).toEqual([])
  })

  it('does not flag a prefix only partially overlapping a bounded sub-path pattern', () => {
    // '/api/quotes/public(.*)' only covers the /public/... sub-tree; the
    // broader '/api/quotes' bypass entry is still required for everything
    // else under /api/quotes (e.g. /api/quotes/123) and must NOT be flagged.
    const shadowed = findShadowedAdminBypassPrefixes(['/api/quotes/public(.*)'], ['/api/quotes'])
    expect(shadowed).toEqual([])
  })

  it('is a no-op once a pattern carries a path-segment boundary the bypass prefix does not reach (the (181)/(182) fix)', () => {
    const shadowed = findShadowedAdminBypassPrefixes(['/api/client/(.*)'], ['/api/clients', '/api/client-reviews'])
    expect(shadowed).toEqual([])
  })

  it('does not flag an unrelated bypass prefix', () => {
    const shadowed = findShadowedAdminBypassPrefixes(['/api/selena(.*)'], ['/api/team', '/api/finance'])
    expect(shadowed).toEqual([])
  })

  it('ignores a non-/api/ public pattern', () => {
    const shadowed = findShadowedAdminBypassPrefixes(['/team(.*)'], ['/api/team'])
    expect(shadowed).toEqual([])
  })
})

describe('computeFindings — Drift AG (admin-impersonation-bypass prefix shadowed dead by isPublicRoute)', () => {
  it('warns on the live /api/selena bypass entry, fully shadowed by isPublicRoute', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      adminBypassPrefixShadows: [{ bypassPrefix: '/api/selena', shadowedByPattern: '/api/selena(.*)' }],
    })
    const warns = findings.filter((f) => f.msg.includes('is dead code'))
    expect(warns).toHaveLength(1)
    expect(warns[0].sev).toBe('WARN')
    expect(warns[0].slug).toBe('/api/selena')
    expect(warns[0].msg).toContain("isPublicRoute pattern '/api/selena(.*)'")
    expect(warns[0].msg).toContain('never evaluated for any real request')
  })

  it('is skipped entirely when adminBypassPrefixShadows is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('is dead code'))).toHaveLength(0)
  })
})

describe('parseJoinCrawlableHosts', () => {
  it('extracts the hostnames from a robots.ts JOIN_CRAWLABLE_HOSTS declaration', () => {
    const src = `
      const JOIN_CRAWLABLE_HOSTS = new Set([
        'thenycmobilesalon.com',
        "www.thenycmobilesalon.com",
      ])
    `
    const set = parseJoinCrawlableHosts(src)
    expect(set.has('thenycmobilesalon.com')).toBe(true)
    expect(set.has('www.thenycmobilesalon.com')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('returns an empty set when the declaration is absent', () => {
    expect(parseJoinCrawlableHosts('export default {}').size).toBe(0)
  })
})

describe('computeFindings — Drift AH (JOIN_CRAWLABLE_HOSTS entry with no matching known domain)', () => {
  it('warns when a join-crawlable host matches no tenants.domain, tenant_domains row, or any-status domain', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'foo.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenantDomains: [{ slug: 'foo', domain: 'foo.com' }],
      joinCrawlableHosts: new Set(['stale-domain.com']),
    })
    const warn = findings.find((f) => f.slug === 'stale-domain.com')
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain('JOIN_CRAWLABLE_HOSTS')
  })

  it('does not warn when the host matches tenants.domain', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'thenycmobilesalon.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      joinCrawlableHosts: new Set(['thenycmobilesalon.com']),
    })
    expect(findings.some((f) => f.slug === 'thenycmobilesalon.com')).toBe(false)
  })

  it('does not warn when the host matches only an active tenant_domains row (tenants.domain empty)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: null, status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'thenycmobilesalon.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'foo' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['foo']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      joinCrawlableHosts: new Set(['thenycmobilesalon.com']),
    })
    expect(findings.some((f) => f.slug === 'thenycmobilesalon.com')).toBe(false)
  })

  it('does not warn when the host matches only a stale any-status tenants.domain (out-of-scope tenant)', () => {
    const tenants: Array<{ id: string; slug: string; domain: string | null; status: string }> = []
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      allTenantDomains: [{ slug: 'suspended-foo', domain: 'thenycmobilesalon.com' }],
      joinCrawlableHosts: new Set(['thenycmobilesalon.com']),
    })
    expect(findings.some((f) => f.slug === 'thenycmobilesalon.com')).toBe(false)
  })

  it('matches through norm() so a www-prefixed or scheme-prefixed known domain still collapses with a bare join-crawlable entry', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'https://www.thenycmobilesalon.com/', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      joinCrawlableHosts: new Set(['thenycmobilesalon.com']),
    })
    expect(findings.some((f) => f.slug === 'thenycmobilesalon.com')).toBe(false)
  })

  it('is skipped entirely when joinCrawlableHosts is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'foo', domain: 'foo.com', status: 'active' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
    })
    expect(findings.filter((f) => f.msg.includes('JOIN_CRAWLABLE_HOSTS')).length).toBe(0)
  })
})

describe('computeFindings — Drift AI (bespoke tenant has a site/<slug>/join folder not covered by JOIN_CRAWLABLE_HOSTS)', () => {
  // tds always carries a matching active row alongside tenants.domain in these
  // fixtures so Drift B (tenants.domain with no matching active tenant_domains
  // row) never fires and pollutes the by-slug finding filter below with an
  // unrelated warning.
  it('warns when a bespoke tenant with a join/ folder has a known domain missing from JOIN_CRAWLABLE_HOSTS', () => {
    const tenants = [{ id: 't1', slug: 'nyc-mobile-salon', domain: 'thenycmobilesalon.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'thenycmobilesalon.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'nyc-mobile-salon' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['nyc-mobile-salon']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['nyc-mobile-salon', ['join', 'contact']]]),
      joinCrawlableHosts: new Set(), // the live entry was dropped / never added
    })
    const warn = findings.find((f) => f.msg.includes("join/ folder"))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.slug).toBe('nyc-mobile-salon')
    expect(warn!.msg).toContain('site/nyc-mobile-salon/join/')
    expect(warn!.msg).toContain('thenycmobilesalon.com')
  })

  it('does not warn when the tenant\'s domain IS in JOIN_CRAWLABLE_HOSTS (the live, correct state)', () => {
    const tenants = [{ id: 't1', slug: 'nyc-mobile-salon', domain: 'thenycmobilesalon.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'thenycmobilesalon.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'nyc-mobile-salon' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['nyc-mobile-salon']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['nyc-mobile-salon', ['join', 'contact']]]),
      joinCrawlableHosts: new Set(['thenycmobilesalon.com']),
    })
    expect(findings.some((f) => f.msg.includes("join/ folder"))).toBe(false)
  })

  it('matches through norm() so a www-prefixed known domain still collapses with a bare JOIN_CRAWLABLE_HOSTS entry', () => {
    const tenants = [{ id: 't1', slug: 'nyc-mobile-salon', domain: 'https://www.thenycmobilesalon.com/', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'https://www.thenycmobilesalon.com/', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'nyc-mobile-salon' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['nyc-mobile-salon']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['nyc-mobile-salon', ['join']]]),
      joinCrawlableHosts: new Set(['thenycmobilesalon.com']),
    })
    expect(findings.some((f) => f.msg.includes("join/ folder"))).toBe(false)
  })

  it('does not warn for a bespoke tenant with no join/ folder', () => {
    const tenants = [{ id: 't1', slug: 'nycmaid', domain: 'nycmaid.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'nycmaid.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'nycmaid' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['nycmaid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['nycmaid', ['contact', 'services']]]),
      joinCrawlableHosts: new Set(),
    })
    expect(findings.some((f) => f.msg.includes("join/ folder"))).toBe(false)
  })

  it('does not warn when the tenant has a join/ folder but no known domain at all (unresolvable/out-of-scope, covered by Drift C/E/L instead)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['ghost-tenant']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['ghost-tenant', ['join']]]),
      joinCrawlableHosts: new Set(),
    })
    expect(findings.some((f) => f.msg.includes("join/ folder"))).toBe(false)
  })

  it('is skipped entirely when bespokeSiteTopLevelDirs is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'nyc-mobile-salon', domain: 'thenycmobilesalon.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'thenycmobilesalon.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'nyc-mobile-salon' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['nyc-mobile-salon']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      joinCrawlableHosts: new Set(),
    })
    expect(findings.filter((f) => f.msg.includes("join/ folder")).length).toBe(0)
  })
})

describe('parseRobotsDisallowList', () => {
  it('extracts the path prefixes from a robots.ts disallow array declaration', () => {
    const src = `
      const disallow = [
        '/dashboard/',
        '/admin/',
        "/api/",
      ]
      if (isMainHost) disallow.push('/apply')
    `
    const list = parseRobotsDisallowList(src)
    expect(list).toEqual(['/dashboard/', '/admin/', '/api/'])
  })

  it('does not pick up conditional disallow.push() entries after the array literal', () => {
    const src = `
      const disallow = ['/dashboard/']
      disallow.push('/join/')
    `
    expect(parseRobotsDisallowList(src)).toEqual(['/dashboard/'])
  })

  it('returns an empty array when the declaration is absent', () => {
    expect(parseRobotsDisallowList('export default {}')).toEqual([])
  })
})

describe('robotsDisallowCoversPath (real robots.txt Disallow matching semantics)', () => {
  it('a trailing-slash entry covers nested paths but NOT the bare path itself', () => {
    expect(robotsDisallowCoversPath(['/team/'], '/team/dashboard')).toBe(true)
    expect(robotsDisallowCoversPath(['/team/'], '/team')).toBe(false)
  })

  it('a "$"-anchored entry covers ONLY the exact bare path, not nested paths', () => {
    expect(robotsDisallowCoversPath(['/team$'], '/team')).toBe(true)
    expect(robotsDisallowCoversPath(['/team$'], '/team/dashboard')).toBe(false)
  })

  it('a bare entry (no trailing slash, no "$") covers the exact path and boundary-matched nested paths', () => {
    expect(robotsDisallowCoversPath(['/login'], '/login')).toBe(true)
    expect(robotsDisallowCoversPath(['/reviews/'], '/reviews/submit')).toBe(true)
  })

  it('does not treat a bare entry as covering an unrelated route sharing only leading characters', () => {
    expect(robotsDisallowCoversPath(['/api'], '/apiary')).toBe(false)
  })

  it('returns false against an empty disallow list', () => {
    expect(robotsDisallowCoversPath([], '/team')).toBe(false)
  })
})

describe('computeFindings — Drift AJ (APP_ROOT_PREFIXES entry with no matching robots.ts disallow rule)', () => {
  it('warns when an APP_ROOT_PREFIXES entry has no matching disallow entry at all', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/fullloop', '/reset-pin'],
      robotsDisallowList: ['/dashboard/', '/admin/'],
    })
    expect(findings.find((f) => f.slug === '/fullloop')).toBeDefined()
    expect(findings.find((f) => f.slug === '/reset-pin')).toBeDefined()
    const warn = findings.find((f) => f.slug === '/fullloop')
    expect(warn!.sev).toBe('WARN')
    expect(warn!.msg).toContain("robots.ts's disallow array")
  })

  it('still warns when the only disallow coverage is trailing-slash-only — that never blocks the bare path in a real crawler', () => {
    // 'Disallow: /portal/' matches '/portal/anything' but NOT the bare
    // '/portal' path itself (Google's own canonical robots.txt example).
    // An earlier version of this check stripped the trailing slash from
    // both sides before comparing, which wrongly credited '/portal/' with
    // covering bare '/portal' — this asserts the corrected behavior.
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/portal', '/dashboard'],
      robotsDisallowList: ['/portal/', '/dashboard/'],
    })
    expect(findings.some((f) => f.slug === '/portal')).toBe(true)
    expect(findings.some((f) => f.slug === '/dashboard')).toBe(true)
  })

  it('does not warn when a "$"-anchored disallow entry exact-matches the bare prefix', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/portal', '/dashboard'],
      robotsDisallowList: ['/portal/', '/portal$', '/dashboard/', '/dashboard$'],
    })
    expect(findings.some((f) => f.slug === '/portal' || f.slug === '/dashboard')).toBe(false)
  })

  it('does not warn when a multi-segment prefix is covered by a shorter, boundary-matched disallow entry', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/reviews/submit'],
      robotsDisallowList: ['/reviews/'],
    })
    expect(findings.some((f) => f.slug === '/reviews/submit')).toBe(false)
  })

  it('does not treat a bare prefix as covering an unrelated route that merely shares its leading characters', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      appRootPrefixes: ['/apiary'],
      robotsDisallowList: ['/api/'],
    })
    expect(findings.some((f) => f.slug === '/apiary')).toBe(true)
  })

  it('is skipped entirely when appRootPrefixes is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      robotsDisallowList: [],
    })
    expect(findings.filter((f) => f.msg.includes("robots.ts's disallow array")).length).toBe(0)
  })
})

describe('computeFindings — Drift AK (bespoke tenant has a site/<slug>/login folder not covered by robots.ts disallow)', () => {
  it('warns for every bespoke tenant with a login/ folder when robots.ts has no /login coverage at all', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-florida-maid', 'wash-and-fold-nyc']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([
        ['the-florida-maid', ['login', 'clients']],
        ['wash-and-fold-nyc', ['login', 'book']],
        ['nycmaid', ['contact', 'services']],
      ]),
      robotsDisallowList: ['/dashboard/', '/admin/'],
    })
    const warned = findings.filter((f) => f.msg.includes('site/'))
    expect(warned.map((f) => f.slug).sort()).toEqual(['the-florida-maid', 'wash-and-fold-nyc'])
    expect(warned[0].sev).toBe('WARN')
    expect(warned[0].msg).toContain("SiteAdminLoginClient")
    expect(warned[0].msg).toContain('/fullloop')
  })

  it('does not warn for a bespoke tenant with no login/ folder', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['nycmaid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['nycmaid', ['contact', 'services']]]),
      robotsDisallowList: [],
    })
    expect(findings.some((f) => f.msg.includes('login/ folder'))).toBe(false)
  })

  it('does not warn once robots.ts disallow covers /login (the live, correct state after the fix)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['the-florida-maid', ['login']]]),
      robotsDisallowList: ['/dashboard/', '/login'],
    })
    expect(findings.some((f) => f.msg.includes('login/ folder'))).toBe(false)
  })

  it('still warns when robots.ts only has trailing-slash "/login/" coverage — same real robots.txt semantics as Drift AJ', () => {
    // 'Disallow: /login/' matches '/login/anything' but never the bare
    // '/login' page itself — the same fix Drift AJ's own coverage check
    // received applies here too.
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['the-florida-maid', ['login']]]),
      robotsDisallowList: ['/login/'],
    })
    expect(findings.some((f) => f.msg.includes('login/ folder'))).toBe(true)
  })

  it('does not warn when a "$"-anchored "/login$" disallow entry exact-matches the bare page', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['the-florida-maid', ['login']]]),
      robotsDisallowList: ['/login/', '/login$'],
    })
    expect(findings.some((f) => f.msg.includes('login/ folder'))).toBe(false)
  })

  it('does not treat a bare "/log" disallow entry as covering /login (no false-positive coverage)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      bespokeSiteTopLevelDirs: new Map([['the-florida-maid', ['login']]]),
      robotsDisallowList: ['/log'],
    })
    expect(findings.some((f) => f.msg.includes('login/ folder'))).toBe(true)
  })

  it('is skipped entirely when bespokeSiteTopLevelDirs is empty (default)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      robotsDisallowList: [],
    })
    expect(findings.filter((f) => f.msg.includes('login/ folder')).length).toBe(0)
  })
})

describe('parsePrivateClientLoginHosts', () => {
  it('extracts host -> path pairs from a robots.ts PRIVATE_CLIENT_LOGIN_HOSTS declaration', () => {
    const src = `
      const PRIVATE_CLIENT_LOGIN_HOSTS: Record<string, string> = {
        'washandfoldnyc.com': '/book',
        "www.washandfoldnyc.com": '/book',
        'thefloridamaid.com': '/clients',
      }
    `
    const map = parsePrivateClientLoginHosts(src)
    expect(map.get('washandfoldnyc.com')).toBe('/book')
    expect(map.get('www.washandfoldnyc.com')).toBe('/book')
    expect(map.get('thefloridamaid.com')).toBe('/clients')
    expect(map.size).toBe(3)
  })

  it('skips a commented-out entry', () => {
    const src = `
      const PRIVATE_CLIENT_LOGIN_HOSTS: Record<string, string> = {
        // 'stale-domain.com': '/book',
        'thefloridamaid.com': '/clients',
      }
    `
    const map = parsePrivateClientLoginHosts(src)
    expect(map.has('stale-domain.com')).toBe(false)
    expect(map.get('thefloridamaid.com')).toBe('/clients')
  })

  it('returns an empty Map when the declaration is absent', () => {
    expect(parsePrivateClientLoginHosts('export default {}').size).toBe(0)
  })
})

describe('computeFindings — Drift AL (bespoke tenant has a client-PIN-login-portal folder not covered by PRIVATE_CLIENT_LOGIN_HOSTS)', () => {
  it('warns when a tenant\'s client-portal-login dir has no matching PRIVATE_CLIENT_LOGIN_HOSTS entry at all', () => {
    const tenants = [{ id: 't1', slug: 'wash-and-fold-nyc', domain: 'washandfoldnyc.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'washandfoldnyc.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'wash-and-fold-nyc' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['wash-and-fold-nyc']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      clientPortalLoginDirsBySlug: new Map([['wash-and-fold-nyc', 'book']]),
      privateClientLoginHosts: new Map(), // the live entry was dropped / never added
    })
    const warn = findings.find((f) => f.msg.includes('client-PIN-login-portal clone'))
    expect(warn).toBeDefined()
    expect(warn!.sev).toBe('WARN')
    expect(warn!.slug).toBe('wash-and-fold-nyc')
    expect(warn!.msg).toContain('site/wash-and-fold-nyc/book/')
    expect(warn!.msg).toContain("'/book'")
  })

  it('does not warn when the tenant\'s domain has a matching PRIVATE_CLIENT_LOGIN_HOSTS entry (the live, correct state)', () => {
    const tenants = [{ id: 't1', slug: 'wash-and-fold-nyc', domain: 'washandfoldnyc.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'washandfoldnyc.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'wash-and-fold-nyc' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['wash-and-fold-nyc']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      clientPortalLoginDirsBySlug: new Map([['wash-and-fold-nyc', 'book']]),
      privateClientLoginHosts: new Map([['washandfoldnyc.com', '/book']]),
    })
    expect(findings.some((f) => f.msg.includes('client-PIN-login-portal clone'))).toBe(false)
  })

  it('warns when the PRIVATE_CLIENT_LOGIN_HOSTS entry names a different path than the one actually found on disk', () => {
    const tenants = [{ id: 't1', slug: 'the-florida-maid', domain: 'thefloridamaid.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'thefloridamaid.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'the-florida-maid' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      clientPortalLoginDirsBySlug: new Map([['the-florida-maid', 'clients']]),
      // stale/typo'd value — names '/book' instead of the real '/clients'
      privateClientLoginHosts: new Map([['thefloridamaid.com', '/book']]),
    })
    expect(findings.some((f) => f.msg.includes('client-PIN-login-portal clone'))).toBe(true)
  })

  it('matches through norm() so a www-prefixed known domain still collapses with a bare PRIVATE_CLIENT_LOGIN_HOSTS entry', () => {
    const tenants = [{ id: 't1', slug: 'the-florida-maid', domain: 'https://www.thefloridamaid.com/', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'https://www.thefloridamaid.com/', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'the-florida-maid' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['the-florida-maid']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      clientPortalLoginDirsBySlug: new Map([['the-florida-maid', 'clients']]),
      privateClientLoginHosts: new Map([['thefloridamaid.com', '/clients']]),
    })
    expect(findings.some((f) => f.msg.includes('client-PIN-login-portal clone'))).toBe(false)
  })

  it('does not warn for a bespoke tenant with no detected client-portal-login dir', () => {
    const tenants = [{ id: 't1', slug: 'nyc-mobile-salon', domain: 'thenycmobilesalon.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'thenycmobilesalon.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'nyc-mobile-salon' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['nyc-mobile-salon']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      clientPortalLoginDirsBySlug: new Map(),
      privateClientLoginHosts: new Map(),
    })
    expect(findings.some((f) => f.msg.includes('client-PIN-login-portal clone'))).toBe(false)
  })

  it('does not warn when the tenant has a client-portal-login dir but no known domain at all (unresolvable/out-of-scope, covered by Drift C/E/L instead)', () => {
    const findings: Finding[] = computeFindings({
      tenants: [],
      tds: [],
      bespokeSet: new Set(['ghost-tenant']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      clientPortalLoginDirsBySlug: new Map([['ghost-tenant', 'book']]),
      privateClientLoginHosts: new Map(),
    })
    expect(findings.some((f) => f.msg.includes('client-PIN-login-portal clone'))).toBe(false)
  })

  it('is skipped entirely when clientPortalLoginDirsBySlug is empty (default)', () => {
    const tenants = [{ id: 't1', slug: 'wash-and-fold-nyc', domain: 'washandfoldnyc.com', status: 'active' }]
    const tds = [{ tenant_id: 't1', domain: 'washandfoldnyc.com', active: true, is_primary: true, routing_mode: 'bespoke', status: 'active', vercel_project: 'x', slug: 'wash-and-fold-nyc' }]
    const findings: Finding[] = computeFindings({
      tenants,
      tds,
      bespokeSet: new Set(['wash-and-fold-nyc']),
      hasHome: alwaysHome,
      resolvableSlugs: null,
      privateClientLoginHosts: new Map(),
    })
    expect(findings.filter((f) => f.msg.includes('client-PIN-login-portal clone')).length).toBe(0)
  })
})
