import { describe, it, expect } from 'vitest'
import {
  parseBespokeSet,
  computeFindings,
  summarize,
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
