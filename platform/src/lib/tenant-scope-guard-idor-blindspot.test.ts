import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeSource } from './idor-route-guard'

// CI invariant — documents a real BLIND SPOT in the LIVE, ALREADY-BLOCKING
// tenant-isolation gate (scripts/audit-tenant-scope.mjs, wired into
// .github/workflows/ci.yml's "Tenant-isolation guard" step — formerly ALSO
// run by a separate, now-removed .github/workflows/tenant-scope.yml; see
// tenant-scope-workflow-consolidation.test.ts).
//
// FINDING (verified this session, not a hypothesis): audit-tenant-scope.mjs
// treats ANY `.eq('id'|'*_id'|'*token*', …)` match on a chain as `idLookup` and
// SKIPS it — see its own comment: "Row/entity-specific keys are globally
// unique … so a lookup by id … is inherently row-scoped, not a leak." That
// reasoning is backwards for the classic IDOR shape: a row being globally
// UNIQUE by id says nothing about who is AUTHORIZED to fetch it by that id. A
// caller from ANY tenant can supply ANY row's id. `.eq('id', id)` with no
// sibling `.eq('tenant_id', …)` is exactly the cross-tenant leak this gate
// exists to catch — and its own idLookup exemption waves it through.
//
// Proof, live on this tree today: `node scripts/audit-tenant-scope.mjs`
// (the exact command CI runs) reports "0 known/baselined" — i.e. the
// blocking gate currently sees ZERO offenders of this class across the
// entire codebase — while idor-route-guard.ts's independent analyzer (same
// bug class, no idLookup exemption) baselines 178 candidate chains / 123
// file::table signatures (idor-route-guard.baseline.json). That gap is this
// exemption, not a difference in what code exists.
//
// This test does NOT change scripts/audit-tenant-scope.mjs or ci.yml — those
// are live, already-blocking gates; changing the idLookup semantics would
// newly red-gate an unknown share of the 178 candidates fleet-wide and is a
// call for the leader/Jeff, not a unilateral edit from this prototype lane.
// This test only PROVES the gap exists and pins it so a future edit to either
// script is a deliberate, reviewed change
// — not a silent drift. See deploy-prep/idor-lint-guard-spec.md §7.
//
// SOURCE-LOCKED: this test reads the ACTUAL regex source out of
// audit-tenant-scope.mjs (not a hand-copied guess) so it fails loudly — not
// silently goes stale — the moment the script's classification logic changes.

const AUDIT_SCRIPT = join(process.cwd(), 'scripts', 'audit-tenant-scope.mjs')

// The exact two classification lines from audit-tenant-scope.mjs, asserted
// verbatim below before this test trusts them.
const SCOPED_LINE = `const scoped = /tenant_id/.test(chain)`
const ID_LOOKUP_LINE = `const idLookup = /\\.(eq|in)\\('(id|[a-z_]*_id|[a-z_]*token[a-z_]*)'\\s*,/.test(chain)`

// Reconstructed from the asserted-verbatim lines above (kept in sync by the
// source-lock assertion, not by hand).
const SCOPED_RE = /tenant_id/
const ID_LOOKUP_RE = /\.(eq|in)\('(id|[a-z_]*_id|[a-z_]*token[a-z_]*)'\s*,/

describe('CI invariant — audit-tenant-scope.mjs idLookup blind spot (IDOR class)', () => {
  it('the live blocking gate script exists where this guard expects it', () => {
    expect(() => readFileSync(AUDIT_SCRIPT, 'utf8')).not.toThrow()
  })

  it('source-lock: the classification lines this test relies on are unchanged', () => {
    const src = readFileSync(AUDIT_SCRIPT, 'utf8')
    expect(
      src.includes(SCOPED_LINE),
      'audit-tenant-scope.mjs no longer contains the expected `scoped` line — ' +
        're-verify this blind-spot finding against the new logic before trusting it.',
    ).toBe(true)
    expect(
      src.includes(ID_LOOKUP_LINE),
      'audit-tenant-scope.mjs no longer contains the expected `idLookup` line — ' +
        're-verify this blind-spot finding against the new logic before trusting it.',
    ).toBe(true)
  })

  it('a textbook by-id IDOR chain (no tenant_id) is NOT flagged by the live gate logic', () => {
    // A tenant-owned table, filtered only by id — the shape this whole test
    // suite exists to catch (idor-route-guard.ts flags this exact shape).
    const chain = `.from('bookings').select('*').eq('id', bookingId).single()`

    const scoped = SCOPED_RE.test(chain)
    const idLookup = ID_LOOKUP_RE.test(chain)
    expect(scoped).toBe(false) // no tenant_id anywhere in the chain
    expect(idLookup).toBe(true) // `.eq('id', …)` — exempted by the live gate

    // Reproduce audit-tenant-scope.mjs's exact flagging predicate:
    //   if (!scoped && !idLookup) { flag }
    const wouldBeFlaggedByLiveGate = !scoped && !idLookup
    expect(
      wouldBeFlaggedByLiveGate,
      'audit-tenant-scope.mjs WOULD now flag this textbook IDOR shape — the ' +
        'blind spot described in this test may have been fixed. If so, this is ' +
        'good news: update the finding write-up in ' +
        'deploy-prep/idor-lint-guard-spec.md §7 to reflect the fix.',
    ).toBe(false)
  })

  it('the SAME chain IS flagged by idor-route-guard.ts — the two guards are not redundant', () => {
    const source = `
      const { data } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
    `
    const findings = analyzeSource({ file: 'fixture.ts', source })
    expect(
      findings.map((f) => f.table),
      'idor-route-guard.ts should flag the exact chain the live blocking gate ' +
        "exempts — that is this prototype's entire reason to exist.",
    ).toEqual(['bookings'])
  })
})
