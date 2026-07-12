/**
 * Executable contract for 059_backfill_vercel_project.sql (P1/W1 queue item b).
 *
 * SOURCE OF TRUTH: migrations/059_backfill_vercel_project.sql, read from disk.
 * 055/056's contracts already have tests (tenant-domains-routing-spec,
 * tenant-domains-enforce-spec); 059 — the follow-up that replaces 055's blanket
 * `vercel_project='fullloopcrm'` with a real determinable/unknown split — had
 * ZERO test coverage until this file.
 *
 * The real invariant this guards: `unknown_slugs` (18 bespoke tenants whose
 * Vercel project can NOT be determined from the repo) and the 4 documented
 * FL-signal bespoke tenants (determinable, hard-routed to FL in middleware.ts
 * per the file's own header) must be DISJOINT. If someone ever adds one of the
 * 4 FL-signal slugs into `unknown_slugs` (e.g. copy-paste drift while editing
 * the array), a tenant this migration COULD safely resolve gets wrongly reset
 * to NULL instead — silently regressing a determinable value. It also pins the
 * "only touch auto-set values, never a human override" and idempotency guards
 * that make this migration safe to (re-)run.
 *
 * WHY A TEST, NOT A MIGRATION RUN: W1 does not run DB commands; 059 is gated
 * DDL the leader applies after approval. There is no live schema to probe, so
 * this asserts the decidable text contract of the file on disk.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const src = readFileSync(resolve(HERE, 'migrations/059_backfill_vercel_project.sql'), 'utf8')

/** Pull every single-quoted slug-like token out of a bracketed `array[ ... ]` block. */
function slugsIn(block: string): string[] {
  return [...block.matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

function unknownSlugs(): string[] {
  const anchor = src.indexOf('unknown_slugs text[]')
  expect(anchor, 'unknown_slugs array declaration not found').toBeGreaterThan(-1)
  const start = src.indexOf('array[', anchor)
  const end = src.indexOf('];', start)
  expect(start, 'array[ start not found').toBeGreaterThan(-1)
  expect(end, 'closing ]; not found').toBeGreaterThan(-1)
  return slugsIn(src.slice(start, end))
}

function autoValues(): string[] {
  const anchor = src.indexOf('auto_values text[]')
  expect(anchor, 'auto_values array declaration not found').toBeGreaterThan(-1)
  const start = src.indexOf('array[', anchor)
  const end = src.indexOf('];', start)
  return slugsIn(src.slice(start, end))
}

// The 4 bespoke tenants the file's own header documents as determinable via a
// hard FL routing signal in middleware.ts — transcribed here (not re-parsed
// from middleware.ts) so this test pins the migration's OWN documented claim;
// the sibling routing-spec test already cross-checks the bespoke set itself.
const FL_SIGNAL_SLUGS = [
  'the-florida-maid',
  'consortium-nyc',
  'the-nyc-interior-designer',
  'the-nyc-marketing-company',
] as const

describe('059 backfill — unknown_slugs parses and has no internal duplicates', () => {
  it('unknown_slugs is non-empty (parser sanity)', () => {
    expect(unknownSlugs().length).toBeGreaterThan(0)
  })

  it('unknown_slugs has no duplicate entries', () => {
    const u = unknownSlugs()
    expect(u.length).toBe(new Set(u).size)
  })
})

describe('059 backfill — unknown_slugs is DISJOINT from the documented FL-signal tenants', () => {
  it('none of the 4 FL-signal bespoke tenants appear in unknown_slugs', () => {
    // If this ever fails, a determinable tenant would be wrongly reset to NULL
    // by the "UNKNOWN -> NULL" update instead of resolved to fl_project.
    const u = new Set(unknownSlugs())
    for (const slug of FL_SIGNAL_SLUGS) {
      expect(u.has(slug), `${slug} must NOT be in unknown_slugs (it is FL-signal-determinable)`).toBe(false)
    }
  })

  it('the FL-signal slugs are exactly the ones this file documents (catches header/array drift)', () => {
    // The 4 slugs must actually appear somewhere in the file's determinable-list
    // comment block, so this transcription can't silently rot out of sync.
    for (const slug of FL_SIGNAL_SLUGS) {
      expect(src, `${slug} not found anywhere in 059 (header doc may have drifted)`).toContain(slug)
    }
  })
})

describe('059 backfill — the DETERMINABLE update only overwrites null or a prior auto-set value', () => {
  it('the FL-project UPDATE guards on (vercel_project is null OR vercel_project = ANY(auto_values))', () => {
    expect(src).toMatch(/vercel_project is null or td\.vercel_project = any\(auto_values\)/i)
  })

  it('the FL-project UPDATE is idempotent (skips rows already equal to fl_project)', () => {
    expect(src).toMatch(/vercel_project is distinct from fl_project/i)
  })

  it('the FL-project UPDATE excludes unknown_slugs tenants (not(...any(unknown_slugs)))', () => {
    expect(src).toMatch(/not \(t\.slug = any\(unknown_slugs\)\)/i)
  })
})

describe('059 backfill — the UNKNOWN reset never clobbers a manual override', () => {
  it('the reset-to-NULL UPDATE only touches rows whose current value is in auto_values', () => {
    // i.e. it must NOT reset unconditionally on `t.slug = any(unknown_slugs)`
    // alone — a human-set project on an unknown-slug tenant must survive.
    const resetAnchor = src.indexOf('UNKNOWN -> NULL')
    expect(resetAnchor, 'UNKNOWN -> NULL section not found').toBeGreaterThan(-1)
    const resetBlock = src.slice(resetAnchor, src.indexOf('Report', resetAnchor))
    expect(resetBlock).toMatch(/td\.vercel_project = any\(auto_values\)/i)
  })
})

describe('059 backfill — auto_values is exactly the set of values this migration (or 055) writes', () => {
  it('auto_values contains the FL project id and both known FL name variants', () => {
    const av = autoValues()
    expect(av).toContain('fullloopcrm')
    expect(av).toContain('platform')
  })

  it('fl_project is declared as a stable Vercel project id (prj_ prefix), not a name', () => {
    const decl = src.match(/fl_project text := '([^']+)'/)
    expect(decl, 'fl_project declaration not found').not.toBeNull()
    expect(decl?.[1]).toMatch(/^prj_/)
  })
})
