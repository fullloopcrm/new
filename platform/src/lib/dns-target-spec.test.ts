/**
 * Executable contract for the tenant_domains dns_target column design
 * (P1/W1 queue item c).
 *
 * SOURCE OF TRUTH: deploy-prep/tenant-domains-dns-target-spec.md (W1's 063
 * design). That design proposes two nullable columns on tenant_domains —
 * `dns_target_type` (text + CHECK in {apex_a, cname, alias}) and `dns_target`
 * (free text) — plus the exact rules the A3 DNS monitor uses to compare the live
 * answer against the expected target.
 *
 * WHY THIS IS A TEST, NOT A MIGRATION RUN:
 *   - The `063_tenant_domains_dns_target.sql` migration is NOT authored yet — it
 *     is a gated follow-up (spec §7: "Approve authoring 063…"). W1 does not run
 *     DB commands, and must not author the gated DDL uninvited.
 *   - The A3 monitor is a spec, not a provisioned service.
 * So there is no live schema or monitor to exercise. This file instead TRANSCRIBES
 * the design's two decidable behaviors into runnable assertions, so:
 *   (1) the allowed CHECK domain and the SQL-accurate nullability semantics are
 *       pinned (a future migration that widens/renames the domain fails here), and
 *   (2) the monitor's compare rules (§5) are pinned as a decision table the
 *       eventual implementation must satisfy — its acceptance contract.
 *
 * The transcribed functions below are the spec-as-code; the `describe` blocks
 * assert they behave as the design says. If the design changes, this file changes
 * with it — deliberately, in one place.
 */
import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// §3 — the CHECK domain for dns_target_type, transcribed.
// Migration text (spec §3):
//   check (dns_target_type in ('apex_a', 'cname', 'alias'))
// ---------------------------------------------------------------------------
const DNS_TARGET_TYPES = ['apex_a', 'cname', 'alias'] as const
type DnsTargetType = (typeof DNS_TARGET_TYPES)[number]

/**
 * Would Postgres's CHECK constraint accept this value for dns_target_type?
 * IMPORTANT SQL semantics: a CHECK constraint accepts NULL unless the column is
 * separately NOT NULL. The spec makes the column nullable (NULL = "not yet
 * backfilled"), so NULL is ACCEPTED here. Only a present, non-listed literal is
 * rejected. String comparison in the CHECK is case-sensitive.
 */
function checkAcceptsTargetType(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true // CHECK permits NULL (column is nullable)
  return (DNS_TARGET_TYPES as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// §5 — the A3 monitor's compare rules, transcribed.
// Only status='active' domains are asserted (§5 intro); a NULL target yields an
// info signal, never a page (§5.5). apex_a: the answer SET must contain the
// expected value (§5.2). cname: the observed CNAME must end in the expected
// vercel-dns.com target, host-normalized (§5.3). alias: an ALIAS/ANAME flattens
// to A/AAAA at resolve time, so it is compared apex-style — the answer SET must
// contain the expected value (§5.4). Every CHECK-valid type now has a rule.
// ---------------------------------------------------------------------------
type MonitorVerdict = 'ok' | 'mismatch' | 'unverified-target'

interface DnsObservation {
  /** resolved A/AAAA answer set (for apex_a) */
  ips?: string[]
  /** resolved CNAME target (for cname) */
  cname?: string
}

/** §5 intro — only active domains are asserted; pending/archived are skipped. */
function shouldAssertDomain(status: string): boolean {
  return status === 'active'
}

/** Host-normalize for suffix comparison: strip a trailing dot, lowercase, trim. */
const normHost = (s: string): string => s.trim().replace(/\.$/, '').toLowerCase()

/**
 * Evaluate one active domain's live DNS answer against its expected target,
 * per the design §5. `alias` is compared apex-style: an ALIAS/ANAME record
 * flattens to A/AAAA at resolve time (§5.4), so it uses the same "answer set
 * CONTAINS the expected value" rule as apex_a (§5.2). Every CHECK-valid
 * dns_target_type now has a defined compare rule — no type falls silently
 * through to 'unverified-target' merely because the spec forgot it.
 */
function evaluateDnsTarget(
  type: DnsTargetType | null,
  expected: string | null,
  observed: DnsObservation,
): MonitorVerdict {
  // §5.5 — not backfilled yet: info signal, never a page.
  if (type === null || expected === null) return 'unverified-target'

  if (type === 'apex_a' || type === 'alias') {
    // §5.2 (apex_a) + §5.4 (alias) — an ALIAS/ANAME flattens to A/AAAA at resolve
    // time, so both assert the resolved answer SET CONTAINS the expected apex IP.
    return (observed.ips ?? []).includes(expected) ? 'ok' : 'mismatch'
  }

  if (type === 'cname') {
    // §5.3 — assert the observed CNAME ends in the expected vercel-dns.com target.
    const seen = observed.cname
    if (!seen) return 'mismatch'
    return normHost(seen).endsWith(normHost(expected)) ? 'ok' : 'mismatch'
  }

  // Exhaustive: every non-null CHECK-valid type is handled above. A NULL type
  // already returned 'unverified-target'. This is unreachable for valid inputs.
  return 'unverified-target'
}

// ===========================================================================
describe('dns_target_type CHECK domain (design §3)', () => {
  it('accepts exactly the three designed values', () => {
    for (const v of DNS_TARGET_TYPES) expect(checkAcceptsTargetType(v)).toBe(true)
  })

  it('rejects any other present value', () => {
    for (const bad of ['a', 'A', 'APEX_A', 'cname ', 'aaaa', 'txt', '', 'apex']) {
      expect(checkAcceptsTargetType(bad)).toBe(false)
    }
  })

  it('is case-sensitive (Postgres CHECK compares string literals exactly)', () => {
    expect(checkAcceptsTargetType('apex_a')).toBe(true)
    expect(checkAcceptsTargetType('Apex_A')).toBe(false)
  })

  it('accepts NULL — the column is nullable and a CHECK permits NULL (design: NULL = not-yet-backfilled)', () => {
    expect(checkAcceptsTargetType(null)).toBe(true)
    expect(checkAcceptsTargetType(undefined)).toBe(true)
  })

  it('the designed domain has not silently grown/shrunk', () => {
    // Guards against a future migration widening the enum-in-a-CHECK without
    // updating this contract + the monitor's compare rules.
    expect([...DNS_TARGET_TYPES]).toEqual(['apex_a', 'cname', 'alias'])
  })
})

describe('monitor scope — only active domains are asserted (design §5 intro)', () => {
  it('asserts active, skips pending/archived/anything else', () => {
    expect(shouldAssertDomain('active')).toBe(true)
    for (const s of ['pending', 'archived', 'suspended', '']) expect(shouldAssertDomain(s)).toBe(false)
  })
})

describe('apex_a compare — answer set must CONTAIN the expected IP (design §5.2)', () => {
  it('ok when the expected apex IP is among the resolved answers', () => {
    expect(evaluateDnsTarget('apex_a', '76.76.21.21', { ips: ['76.76.21.21'] })).toBe('ok')
    // multi-answer set still ok as long as the expected value is present
    expect(evaluateDnsTarget('apex_a', '76.76.21.21', { ips: ['1.2.3.4', '76.76.21.21'] })).toBe('ok')
  })

  it('mismatch when the answer set points somewhere else (the stale/foreign-zone failure mode)', () => {
    expect(evaluateDnsTarget('apex_a', '76.76.21.21', { ips: ['203.0.113.9'] })).toBe('mismatch')
    expect(evaluateDnsTarget('apex_a', '76.76.21.21', { ips: [] })).toBe('mismatch')
  })
})

describe('cname compare — observed CNAME must end in the expected target, host-normalized (design §5.3)', () => {
  it('ok on exact and subdomain-suffix matches, tolerant of trailing dot and case', () => {
    expect(evaluateDnsTarget('cname', 'cname.vercel-dns.com', { cname: 'cname.vercel-dns.com' })).toBe('ok')
    expect(evaluateDnsTarget('cname', 'cname.vercel-dns.com', { cname: 'cname.vercel-dns.com.' })).toBe('ok')
    expect(evaluateDnsTarget('cname', 'vercel-dns.com', { cname: 'abc123.cname.vercel-dns.com' })).toBe('ok')
    expect(evaluateDnsTarget('cname', 'cname.vercel-dns.com', { cname: 'CNAME.Vercel-DNS.com' })).toBe('ok')
  })

  it('mismatch when the CNAME points at a foreign target', () => {
    expect(evaluateDnsTarget('cname', 'cname.vercel-dns.com', { cname: 'ghs.googlehosted.com' })).toBe('mismatch')
    // suffix must be a real label boundary end — a lookalike that only shares a substring fails
    expect(evaluateDnsTarget('cname', 'cname.vercel-dns.com', { cname: 'cname.vercel-dns.com.evil.example' })).toBe('mismatch')
  })

  it('mismatch when no CNAME resolved at all', () => {
    expect(evaluateDnsTarget('cname', 'cname.vercel-dns.com', {})).toBe('mismatch')
  })
})

describe('NULL target — unverified, never a page (design §5.5)', () => {
  it('a not-yet-backfilled row (NULL type or NULL target) yields an info signal, not a mismatch', () => {
    expect(evaluateDnsTarget(null, null, {})).toBe('unverified-target')
    expect(evaluateDnsTarget(null, '76.76.21.21', { ips: ['76.76.21.21'] })).toBe('unverified-target')
    expect(evaluateDnsTarget('apex_a', null, { ips: ['76.76.21.21'] })).toBe('unverified-target')
  })

  it('the unverified case is distinct from mismatch — coverage gaps stay visible, not silently passing', () => {
    // A NULL target must NOT read as "ok" (silent pass) nor as "mismatch" (false page).
    const verdict = evaluateDnsTarget('cname', null, { cname: 'anything' })
    expect(verdict).toBe('unverified-target')
    expect(verdict).not.toBe('ok')
    expect(verdict).not.toBe('mismatch')
  })
})

// ===========================================================================
// GAP CLOSED (P1/W1 16:43 queue item a). `alias` is a CHECK-valid dns_target_type
// (§3) that PREVIOUSLY had NO §5 compare rule: a fully-backfilled-but-WRONG alias
// row fell through to 'unverified-target' and never paged, indistinguishable from a
// not-yet-backfilled NULL row (this was the gap the prior commit c386b2a5
// characterized). The design now defines the alias rule (§5.4): an ALIAS/ANAME
// flattens to A/AAAA at resolve time, so it is compared apex-style — the answer set
// must CONTAIN the expected value. These assertions pin the CLOSED contract: a
// wrong alias is now a hard 'mismatch' (it pages), DISTINGUISHABLE from NULL/unverified.
// ===========================================================================
describe('alias dns_target_type — compared apex-style (§5.4); a wrong-but-backfilled alias is a mismatch, distinct from NULL (gap CLOSED)', () => {
  it('the CHECK accepts alias, so a real row can carry type=alias with a set target', () => {
    // §3 domain includes alias — a backfill (apex ALIAS/ANAME where the registrar
    // supports it) can legitimately write this value. The column will hold it.
    expect(checkAcceptsTargetType('alias')).toBe(true)
  })

  it('ok when the resolved answer set CONTAINS the expected apex IP (ALIAS flattens to A)', () => {
    expect(evaluateDnsTarget('alias', '76.76.21.21', { ips: ['76.76.21.21'] })).toBe('ok')
    // multi-answer set still ok as long as the expected value is present
    expect(evaluateDnsTarget('alias', '76.76.21.21', { ips: ['1.2.3.4', '76.76.21.21'] })).toBe('ok')
  })

  it('CLOSES THE GAP: a fully-backfilled but WRONG alias now pages (mismatch), not a silent info signal', () => {
    // type=alias, expected apex IP set, and the LIVE answer points somewhere else
    // (9.9.9.9 != 76.76.21.21). Under the old contract this fell through to
    // 'unverified-target' and never alerted. The §5.4 alias rule now treats it
    // exactly like a broken apex_a — a hard 'mismatch' that pages. (Reverses the
    // c386b2a5 characterization deliberately: the gap is now fixed at the contract.)
    const misconfigured = evaluateDnsTarget('alias', '76.76.21.21', { ips: ['9.9.9.9'] })
    expect(misconfigured).toBe('mismatch')
    expect(misconfigured).not.toBe('unverified-target') // no longer hidden in the benign signal
  })

  it('a broken alias is now DISTINGUISHABLE from an un-backfilled row (the whole point of closing the gap)', () => {
    // NULL target = genuinely not backfilled -> unverified (info, never a page).
    // Present-but-wrong target = misconfigured -> mismatch (pages). Triage can now
    // tell the two apart; they no longer collapse to one signal.
    const notBackfilled = evaluateDnsTarget('alias', null, {})
    const backfilledButWrong = evaluateDnsTarget('alias', '76.76.21.21', { ips: ['9.9.9.9'] })
    expect(notBackfilled).toBe('unverified-target')
    expect(backfilledButWrong).toBe('mismatch')
    expect(backfilledButWrong).not.toBe(notBackfilled) // distinguishable — gap closed
  })

  it('an alias whose target resolves to NOTHING is a mismatch, not unverified (a set target that answers empty is broken, not un-backfilled)', () => {
    // expected is present (backfilled) but the live answer set is empty -> broken.
    expect(evaluateDnsTarget('alias', '76.76.21.21', { ips: [] })).toBe('mismatch')
  })
})
