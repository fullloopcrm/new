/**
 * Executable contract for the tenant_domains ROUTING columns (P1/W1 queue item c).
 *
 * SOURCE OF TRUTH: P1-SCHEMA-SPEC.md (routing_mode / vercel_project / status) +
 * the 055_tenant_domains_routing.{sql,backfill.sql} pair W1 authored. This test
 * pins the one contract in that set that can silently ROT: the backfill decides
 * `routing_mode = 'bespoke'` from a slug list that is copied VERBATIM from the
 * `BESPOKE_SITE_TENANTS` set in src/middleware.ts (the backfill header says
 * "keep them in sync until the middleware set is retired"). If someone adds a
 * bespoke tenant to middleware and forgets the backfill (or vice-versa), the
 * DB's routing diverges from the live runtime routing — a hand-copied list with
 * no guard. This reads BOTH files at test time and asserts they are identical.
 *
 * It also transcribes the two CHECK domains and the active→status backfill map
 * from the spec, so a future migration that widens/renames them fails here.
 *
 * WHY A TEST, NOT A MIGRATION RUN: W1 does not run DB commands; 055/056 are
 * gated DDL the leader applies after approval. There is no live schema to probe,
 * so this asserts the design's decidable behavior + the source-to-backfill
 * invariant from the actual files on disk.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const middlewareSrc = readFileSync(resolve(HERE, '../middleware.ts'), 'utf8')
const backfillSrc = readFileSync(resolve(HERE, 'migrations/055_tenant_domains_routing.backfill.sql'), 'utf8')
const migrationSrc = readFileSync(resolve(HERE, 'migrations/055_tenant_domains_routing.sql'), 'utf8')

/** Pull every single-quoted `slug-like` token out of a bracketed block. */
function slugsIn(block: string): string[] {
  return [...block.matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

/** The `BESPOKE_SITE_TENANTS = new Set<string>([ ... ])` block in middleware.ts. */
function middlewareBespokeSlugs(): string[] {
  const start = middlewareSrc.indexOf('BESPOKE_SITE_TENANTS = new Set<string>([')
  expect(start, 'BESPOKE_SITE_TENANTS set not found in middleware.ts').toBeGreaterThan(-1)
  const end = middlewareSrc.indexOf('])', start)
  return slugsIn(middlewareSrc.slice(start, end))
}

/** The `t.slug in ( ... )` list inside the routing_mode='bespoke' UPDATE. */
function backfillBespokeSlugs(): string[] {
  const anchor = backfillSrc.indexOf("set routing_mode = 'bespoke'")
  expect(anchor, "routing_mode = 'bespoke' UPDATE not found in backfill").toBeGreaterThan(-1)
  const listStart = backfillSrc.indexOf('t.slug in (', anchor)
  expect(listStart, "t.slug in ( ... ) list not found").toBeGreaterThan(-1)
  const listEnd = backfillSrc.indexOf(')', listStart)
  return slugsIn(backfillSrc.slice(listStart, listEnd))
}

describe('tenant_domains routing backfill ⇄ middleware BESPOKE_SITE_TENANTS (no-drift guard)', () => {
  it('the backfill bespoke slug list equals the middleware set, exactly', () => {
    const mw = middlewareBespokeSlugs()
    const bf = backfillBespokeSlugs()
    // Sets equal in BOTH directions — surfaces adds AND removes on either side.
    expect(new Set(bf), 'backfill has slugs middleware lacks').toEqual(new Set(mw))
    expect([...bf].sort()).toEqual([...mw].sort())
  })

  it('neither list is empty (parser sanity — a bad slice must not pass vacuously)', () => {
    expect(middlewareBespokeSlugs().length).toBeGreaterThan(0)
    expect(backfillBespokeSlugs().length).toBeGreaterThan(0)
  })

  it('the backfill list has no duplicate slugs', () => {
    const bf = backfillBespokeSlugs()
    expect(bf.length).toBe(new Set(bf).size)
  })
})

// ---------------------------------------------------------------------------
// P1-SCHEMA-SPEC.md — the CHECK domains, transcribed. A migration that widens
// or renames either domain (in 055) diverges from the shared contract → fails.
// ---------------------------------------------------------------------------
const ROUTING_MODES = ['bespoke', 'template'] as const
const STATUSES = ['active', 'pending', 'archived'] as const

describe('tenant_domains CHECK domains match P1-SCHEMA-SPEC', () => {
  it('routing_mode CHECK domain is exactly {bespoke, template}', () => {
    expect([...ROUTING_MODES].sort()).toEqual(['bespoke', 'template'])
    // and the 055 migration encodes that same domain
    expect(migrationSrc).toMatch(/check\s*\(routing_mode in \('bespoke',\s*'template'\)\)/)
  })

  it('status CHECK domain is exactly {active, pending, archived}', () => {
    expect([...STATUSES].sort()).toEqual(['active', 'archived', 'pending'])
    expect(migrationSrc).toMatch(/check\s*\(status in \('active',\s*'pending',\s*'archived'\)\)/)
  })

  it('routing_mode / status / vercel_project are added NULLABLE (no inline default) so the backfill owns their values', () => {
    // Nullable-first is the spec's migration rule. Assert none of the three
    // source-derived columns is added with a DEFAULT in 055 (updated_at/created_at
    // legitimately have now() defaults and are excluded).
    for (const col of ['routing_mode', 'vercel_project', 'status']) {
      const re = new RegExp(`add column if not exists ${col} text[^;]*`, 'i')
      const decl = migrationSrc.match(re)?.[0] ?? ''
      expect(decl, `${col} declaration not found in 055`).not.toBe('')
      expect(decl.toLowerCase(), `${col} must be added nullable, no inline default`).not.toContain('default')
      expect(decl.toLowerCase(), `${col} must be added nullable, not NOT NULL`).not.toContain('not null')
    }
  })
})

// ---------------------------------------------------------------------------
// The active→status backfill mapping, as a decision function mirroring the SQL:
//   set status = case when active then 'active' else 'archived' end
// 'pending' is intentionally NOT reachable from backfill (no source signal).
// ---------------------------------------------------------------------------
function backfilledStatus(active: boolean): (typeof STATUSES)[number] {
  return active ? 'active' : 'archived'
}

describe('tenant_domains active→status backfill mapping', () => {
  it('active row backfills to status active', () => {
    expect(backfilledStatus(true)).toBe('active')
  })
  it('inactive row backfills to status archived', () => {
    expect(backfilledStatus(false)).toBe('archived')
  })
  it('backfill never yields pending (reserved for future onboarding writes)', () => {
    expect([backfilledStatus(true), backfilledStatus(false)]).not.toContain('pending')
  })
  it('the backfill SQL encodes exactly that case expression', () => {
    expect(backfillSrc).toMatch(/set status = case when active then 'active' else 'archived' end/)
  })
})
