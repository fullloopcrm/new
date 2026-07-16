import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseBespokeSet,
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
