/**
 * Executable contract for the tenant_domains NOT-NULL ENFORCE step (P1/W1 queue b).
 *
 * SOURCE OF TRUTH: 056_tenant_domains_routing_enforce.sql (the file W1 authored),
 * read from disk at test time. The sibling routing-spec test pins 055 (add
 * nullable + CHECK domains + backfill map); 056 — the phase-3 NOT NULL / default
 * step — had NO test. This closes that.
 *
 * The invariant this pins is a SPEC-vs-IMPLEMENTATION DIVERGENCE that will rot if
 * left unguarded: P1-SCHEMA-SPEC.md line 7 literally says
 *     vercel_project text NOT NULL
 * but LEADER ORDER 12:16 overrode that — vercel_project stays NULLABLE because its
 * real per-tenant values are backfilled LATER via the Vercel API, so forcing NOT
 * NULL now would make the gated DDL fail on every still-null row. The enforce
 * migration therefore:
 *   - gates only on routing_mode + status being populated (RAISE if not),
 *   - sets NOT NULL on routing_mode + status ONLY, never vercel_project,
 *   - forward-defaults routing_mode='template' / status='active', no default for
 *     vercel_project.
 *
 * The failure this guards: someone "aligns 056 back to the spec" by adding
 * `alter column vercel_project set not null`. That reintroduces the exact bug the
 * leader order removed — the enforce step would abort on any tenant_domains row
 * whose vercel_project hasn't been filled by the Vercel-API follow-up. This test
 * fails the moment that line appears.
 *
 * WHY A TEST, NOT A MIGRATION RUN: W1 does not run DB commands; 055/056 are gated
 * DDL the leader applies after approval. There is no live schema to probe, so this
 * asserts the decidable text contract of the file on disk.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const enforceSrc = readFileSync(resolve(HERE, 'migrations/056_tenant_domains_routing_enforce.sql'), 'utf8')
const addSrc = readFileSync(resolve(HERE, 'migrations/055_tenant_domains_routing.sql'), 'utf8')

// The three columns 055 adds. Only these two get NOT NULL in 056; vercel_project
// is deliberately excluded (LEADER ORDER 12:16). Encoded as data so the assertion
// is a decidable set-membership check, not a lone grep.
const ENFORCED_NOT_NULL = ['routing_mode', 'status'] as const
const STAYS_NULLABLE = 'vercel_project'

// P1-SCHEMA-SPEC.md line 7, transcribed. The spec says NOT NULL; the enforce
// migration intentionally does NOT honor it (see file header). Transcribed rather
// than read from the sibling repo so the test is self-contained in this worktree.
const SPEC_LINE_VERCEL_PROJECT = 'vercel_project text NOT NULL'

describe('056 enforce — NOT NULL is applied to routing_mode + status ONLY', () => {
  it('sets NOT NULL on each enforced column', () => {
    for (const col of ENFORCED_NOT_NULL) {
      expect(enforceSrc, `056 must enforce NOT NULL on ${col}`).toMatch(
        new RegExp(`alter column ${col}\\s+set not null`, 'i'),
      )
    }
  })

  it('does NOT set NOT NULL on vercel_project (LEADER ORDER 12:16 — stays nullable)', () => {
    // THE divergence guard. If a future edit "aligns to spec", this line appears
    // and the test fails.
    expect(enforceSrc).not.toMatch(new RegExp(`alter column ${STAYS_NULLABLE}\\s+set not null`, 'i'))
  })

  it('vercel_project is not among the enforced set', () => {
    expect([...ENFORCED_NOT_NULL]).not.toContain(STAYS_NULLABLE)
  })
})

describe('056 enforce — the pre-flight gate blocks on routing_mode/status, not vercel_project', () => {
  it('RAISES on unpopulated routing_mode or status before applying NOT NULL', () => {
    // The guarded DO block counts missing rows and raises rather than half-applying.
    expect(enforceSrc).toMatch(/raise exception/i)
    expect(enforceSrc).toMatch(/routing_mode is null[\s\S]*?or status is null/i)
  })

  it('does NOT gate on vercel_project being null (it is allowed to stay null)', () => {
    expect(enforceSrc).not.toMatch(/vercel_project is null/i)
  })
})

describe('056 enforce — forward-insert defaults', () => {
  it("routing_mode forward-defaults to 'template'", () => {
    expect(enforceSrc).toMatch(/alter column routing_mode\s+set default 'template'/i)
  })

  it("status forward-defaults to 'active'", () => {
    expect(enforceSrc).toMatch(/alter column status\s+set default 'active'/i)
  })

  it('vercel_project gets NO forward default', () => {
    expect(enforceSrc).not.toMatch(/alter column vercel_project\s+set default/i)
  })
})

describe('spec ⇄ implementation divergence is intentional and documented', () => {
  it('the spec line asks for vercel_project NOT NULL', () => {
    // Sanity on the transcription: this IS what the shared spec says.
    expect(SPEC_LINE_VERCEL_PROJECT).toMatch(/vercel_project\s+text\s+NOT NULL/i)
  })

  it('055 adds vercel_project NULLABLE and 056 keeps it that way — the deliberate override', () => {
    // 055 adds it with no NOT NULL...
    const decl = addSrc.match(/add column if not exists vercel_project text[^;]*/i)?.[0] ?? ''
    expect(decl, 'vercel_project add-column not found in 055').not.toBe('')
    expect(decl.toLowerCase()).not.toContain('not null')
    // ...and 056 never enforces it. Together they realize LEADER ORDER 12:16
    // over the literal spec text. Both halves must hold for the divergence to be
    // the *intended* one and not an accident.
    expect(enforceSrc.toLowerCase()).toContain('leader order 12:16')
    expect(enforceSrc).not.toMatch(/alter column vercel_project\s+set not null/i)
  })
})
